/**
 * Zustand store for diagram state management with TypeScript and Immer
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { DiagramState, Node, Edge, ViewportState } from '@/types/graph';
import { Position, BoundingBox } from '@/types/geometry';

// Enable Immer support for Map and Set
enableMapSet();

// Store interface with all actions
interface DiagramStore {
  // State
  diagram: DiagramState;

  // Node actions
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, position: Position) => void;

  // Edge actions
  addEdge: (edge: Edge) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  removeEdge: (edgeId: string) => void;
  recalculateEdges: () => void;

  // Bulk operations
  loadDiagram: (nodes: Node[], edges: Edge[], metadata?: Partial<DiagramState['metadata']>) => void;
  clearDiagram: () => void;

  // Viewport actions
  updateViewport: (viewport: Partial<ViewportState>) => void;
  zoomToFit: () => void;
  resetZoom: () => void;

  // Computed values
  getBoundingBox: () => BoundingBox | null;
  getConnectedEdges: (nodeId: string) => Edge[];
}

// Initial state
const initialState: DiagramState = {
  nodes: new Map(),
  edges: new Map(),
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
    bounds: { x: 0, y: 0, width: 1000, height: 800 },
  },
  metadata: {
    title: 'Untitled Diagram',
    lastModified: new Date(),
    version: '2.0.0',
  },
};

// Create the store with middlewares
export const useDiagramStore = create<DiagramStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      diagram: initialState,

      // Node actions
      addNode: (node: Node) =>
        set((state) => {
          state.diagram.nodes.set(node.id, node);
          state.diagram.metadata.lastModified = new Date();
        }),

      updateNode: (nodeId: string, updates: Partial<Node>) =>
        set((state) => {
          const existingNode = state.diagram.nodes.get(nodeId);
          if (existingNode) {
            state.diagram.nodes.set(nodeId, { ...existingNode, ...updates });
            state.diagram.metadata.lastModified = new Date();
          }
        }),

      removeNode: (nodeId: string) =>
        set((state) => {
          // Remove the node
          state.diagram.nodes.delete(nodeId);

          // Remove connected edges
          const edgesToRemove = Array.from(state.diagram.edges.values()).filter(
            edge => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId
          );

          edgesToRemove.forEach(edge => {
            state.diagram.edges.delete(edge.id);
          });

          state.diagram.metadata.lastModified = new Date();
        }),

      moveNode: (nodeId: string, position: Position) =>
        set((state) => {
          const node = state.diagram.nodes.get(nodeId);
          if (node) {
            state.diagram.nodes.set(nodeId, {
              ...node,
              position,
            });
            state.diagram.metadata.lastModified = new Date();
          }
        }),

      // Edge actions
      addEdge: (edge: Edge) =>
        set((state) => {
          state.diagram.edges.set(edge.id, edge);
          state.diagram.metadata.lastModified = new Date();
        }),

      updateEdge: (edgeId: string, updates: Partial<Edge>) =>
        set((state) => {
          const existingEdge = state.diagram.edges.get(edgeId);
          if (existingEdge) {
            state.diagram.edges.set(edgeId, { ...existingEdge, ...updates });
            state.diagram.metadata.lastModified = new Date();
          }
        }),

      removeEdge: (edgeId: string) =>
        set((state) => {
          state.diagram.edges.delete(edgeId);
          state.diagram.metadata.lastModified = new Date();
        }),

      recalculateEdges: () =>
        set((state) => {
          // For now, edges are automatically calculated by the components
          // This is a placeholder for future edge recalculation logic
          state.diagram.metadata.lastModified = new Date();
        }),

      // Bulk operations
      loadDiagram: (nodes: Node[], edges: Edge[], metadata = {}) =>
        set((state) => {
          state.diagram.nodes.clear();
          state.diagram.edges.clear();

          nodes.forEach(node => state.diagram.nodes.set(node.id, node));
          edges.forEach(edge => state.diagram.edges.set(edge.id, edge));

          state.diagram.metadata = {
            ...state.diagram.metadata,
            ...metadata,
            lastModified: new Date(),
          };
        }),

      clearDiagram: () =>
        set((state) => {
          state.diagram = {
            ...initialState,
            metadata: {
              ...initialState.metadata,
              lastModified: new Date(),
            },
          };
        }),

      // Viewport actions
      updateViewport: (viewport: Partial<ViewportState>) =>
        set((state) => {
          state.diagram.viewport = { ...state.diagram.viewport, ...viewport };
        }),

      zoomToFit: () =>
        set((state) => {
          const boundingBox = get().getBoundingBox();
          if (boundingBox) {
            const padding = 50;
            const viewportBounds = state.diagram.viewport.bounds;

            const scaleX = (viewportBounds.width - 2 * padding) / boundingBox.width;
            const scaleY = (viewportBounds.height - 2 * padding) / boundingBox.height;
            const scale = Math.min(scaleX, scaleY, 1);

            const centerX = (viewportBounds.width / 2) - (boundingBox.x + boundingBox.width / 2) * scale;
            const centerY = (viewportBounds.height / 2) - (boundingBox.y + boundingBox.height / 2) * scale;

            state.diagram.viewport.zoom = scale;
            state.diagram.viewport.panX = centerX;
            state.diagram.viewport.panY = centerY;
          }
        }),

      resetZoom: () =>
        set((state) => {
          state.diagram.viewport.zoom = 1;
          state.diagram.viewport.panX = 0;
          state.diagram.viewport.panY = 0;
        }),

      // Computed values

      getBoundingBox: (): BoundingBox | null => {
        const { diagram } = get();
        const nodes = Array.from(diagram.nodes.values());

        if (nodes.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
          const { position, size } = node;
          minX = Math.min(minX, position.x);
          minY = Math.min(minY, position.y);
          maxX = Math.max(maxX, position.x + size.width);
          maxY = Math.max(maxY, position.y + size.height);
        });

        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      },

      getConnectedEdges: (nodeId: string): Edge[] => {
        const { diagram } = get();
        return Array.from(diagram.edges.values()).filter(
          edge => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId
        );
      },
    }))
  )
);

// Selectors for specific parts of the state
export const useNodes = () => useDiagramStore(state => Array.from(state.diagram.nodes.values()));
export const useEdges = () => useDiagramStore(state => Array.from(state.diagram.edges.values()));
export const useViewport = () => useDiagramStore(state => state.diagram.viewport);
export const useOriginalSvg = () => useDiagramStore(state => state.diagram.metadata.originalSvg);

// Subscribe to changes for debugging
if (process.env.NODE_ENV === 'development') {
  useDiagramStore.subscribe(
    state => state.diagram,
    (diagram) => {
      console.log('Diagram state changed:', {
        nodeCount: diagram.nodes.size,
        edgeCount: diagram.edges.size,
        lastModified: diagram.metadata.lastModified,
      });
    }
  );
}