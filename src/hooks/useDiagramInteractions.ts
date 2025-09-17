/**
 * Custom hooks for diagram interactions with proper TypeScript generics
 */

import { useCallback } from 'react';
import { useDiagramStore } from '@/stores/diagramStore';
import { Edge } from '@/types/graph';
import { Position } from '@/types/geometry';
import { plantUMLService } from '@/services/PlantUMLService';
import { svgParser } from '@/services/SVGParser';
import { svgExporter } from '@/services/SVGExporter';
import { Result } from '@/types/result';

// Hook for node operations
export const useNodeOperations = () => {
  const { addNode, updateNode, removeNode, moveNode } = useDiagramStore();

  const createNode = useCallback((config: Parameters<typeof addNode>[0]) => {
    addNode(config);
  }, [addNode]);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = useDiagramStore.getState().diagram.nodes.get(nodeId);
    if (node) {
      const newNode = {
        ...node,
        id: `${node.id}_copy_${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
      };
      addNode(newNode);
      return newNode.id;
    }
    return null;
  }, [addNode]);

  const moveNodes = useCallback((nodeIds: string[], delta: Position) => {
    nodeIds.forEach(nodeId => {
      const node = useDiagramStore.getState().diagram.nodes.get(nodeId);
      if (node) {
        moveNode(nodeId, {
          x: node.position.x + delta.x,
          y: node.position.y + delta.y,
        });
      }
    });
  }, [moveNode]);

  return {
    createNode,
    updateNode,
    removeNode,
    moveNode,
    duplicateNode,
    moveNodes,
  };
};

// Hook for edge operations
export const useEdgeOperations = () => {
  const { addEdge, updateEdge, removeEdge } = useDiagramStore();

  const createEdge = useCallback((config: Parameters<typeof addEdge>[0]) => {
    addEdge(config);
  }, [addEdge]);

  const connectNodes = useCallback((sourceNodeId: string, targetNodeId: string, edgeType: Edge['type'] = 'association') => {
    const edgeId = `edge_${sourceNodeId}_${targetNodeId}_${Date.now()}`;
    const edge: Edge = {
      id: edgeId,
      type: edgeType,
      sourceNodeId,
      targetNodeId,
      style: {
        stroke: '#181818',
        strokeWidth: 1,
        markerEnd: 'arrow',
      },
      metadata: {
        zIndex: 0,
      },
    };
    addEdge(edge);
    return edgeId;
  }, [addEdge]);

  return {
    createEdge,
    updateEdge,
    removeEdge,
    connectNodes,
  };
};


// Hook for PlantUML integration
export const usePlantUMLIntegration = () => {
  const { loadDiagram, clearDiagram } = useDiagramStore();

  const generateFromPlantUML = useCallback(async (source: string): Promise<Result<void, Error>> => {
    try {
      // Generate SVG from PlantUML
      const svgResult = await plantUMLService.generateSVG(source);
      if (!svgResult.success) {
        return { success: false, error: new Error(svgResult.error.message) };
      }

      // Parse SVG to graph model
      const parseResult = await svgParser.parseToGraphModel(svgResult.data);
      if (!parseResult.success) {
        return { success: false, error: new Error(parseResult.error.message) };
      }

      // Load into store with original SVG
      loadDiagram(parseResult.data.nodes, parseResult.data.edges, {
        plantumlSource: source,
        title: 'PlantUML Diagram',
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }, [loadDiagram]);

  const exportToPNG = useCallback(async (source: string): Promise<Result<Blob, Error>> => {
    try {
      const result = await plantUMLService.generatePNG(source);
      if (!result.success) {
        return { success: false, error: new Error(result.error.message) };
      }
      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }, []);

  const exportCurrentDiagramToSVG = useCallback((): Result<void, Error> => {
    try {
      const state = useDiagramStore.getState();
      const nodes = Array.from(state.diagram.nodes.values());
      const edges = Array.from(state.diagram.edges.values());

      if (nodes.length === 0) {
        return { success: false, error: new Error('No diagram to export') };
      }

      svgExporter.downloadSVG(nodes, edges);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }, []);

  const exportCurrentDiagramToPNG = useCallback(async (): Promise<Result<void, Error>> => {
    try {
      const state = useDiagramStore.getState();
      const nodes = Array.from(state.diagram.nodes.values());
      const edges = Array.from(state.diagram.edges.values());

      if (nodes.length === 0) {
        return { success: false, error: new Error('No diagram to export') };
      }

      // First export to SVG string
      const svgString = svgExporter.exportToSVG(nodes, edges);

      // Convert SVG to PNG using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'diagram.png';
              a.click();
              URL.revokeObjectURL(url);
              resolve({ success: true, data: undefined });
            } else {
              resolve({ success: false, error: new Error('Failed to generate PNG') });
            }
          }, 'image/png');
        };

        img.onerror = () => {
          resolve({ success: false, error: new Error('Failed to load SVG for PNG conversion') });
        };

        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        img.src = svgUrl;
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }, []);

  return {
    generateFromPlantUML,
    exportToPNG,
    exportCurrentDiagramToSVG,
    exportCurrentDiagramToPNG,
    clearDiagram,
  };
};

// Hook for viewport operations
export const useViewportOperations = () => {
  const { updateViewport, zoomToFit, resetZoom } = useDiagramStore();

  const panTo = useCallback((x: number, y: number) => {
    updateViewport({ panX: x, panY: y });
  }, [updateViewport]);

  const zoomTo = useCallback((zoom: number) => {
    updateViewport({ zoom });
  }, [updateViewport]);

  const zoomIn = useCallback(() => {
    const currentZoom = useDiagramStore.getState().diagram.viewport.zoom;
    zoomTo(Math.min(currentZoom * 1.2, 10));
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    const currentZoom = useDiagramStore.getState().diagram.viewport.zoom;
    zoomTo(Math.max(currentZoom / 1.2, 0.1));
  }, [zoomTo]);

  return {
    updateViewport,
    panTo,
    zoomTo,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetZoom,
  };
};

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const { zoomIn, zoomOut, resetZoom } = useViewportOperations();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case '=':
      case '+':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          zoomIn();
        }
        break;

      case '-':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          zoomOut();
        }
        break;

      case '0':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          resetZoom();
        }
        break;
    }
  }, [zoomIn, zoomOut, resetZoom]);

  return { handleKeyDown };
};

// Hook for undo/redo functionality
export const useUndoRedo = () => {
  // This would integrate with a more sophisticated history system
  // For now, we'll return placeholder functions
  const undo = useCallback(() => {
    console.log('Undo functionality not yet implemented');
  }, []);

  const redo = useCallback(() => {
    console.log('Redo functionality not yet implemented');
  }, []);

  const canUndo = false;
  const canRedo = false;

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
};