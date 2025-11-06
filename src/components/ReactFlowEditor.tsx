/**
 * React Flow based PlantUML editor
 * Demonstrates the extensible architecture with pluggable diagram type handlers
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { SVGToReactFlowConverter } from '../core/SVGToReactFlowConverter';
import { diagramRegistry } from '../core/DiagramTypeRegistry';
import { GenericDiagramHandler } from '../handlers/GenericDiagramHandler';
import { ActivityDiagramHandler } from '../handlers/ActivityDiagramHandler';
import { DiagramTypeHandler } from '../core/types';

interface ReactFlowEditorProps {
  svgContent: string;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

export default function ReactFlowEditor({ svgContent, onNodesChange, onEdgesChange }: ReactFlowEditorProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState([]);
  const [detectedHandler, setDetectedHandler] = useState<DiagramTypeHandler | null>(null);

  // Initialize the registry with handlers
  useEffect(() => {
    const registry = diagramRegistry;

    // Register handlers
    registry.register(new ActivityDiagramHandler());
    registry.register(new GenericDiagramHandler());

    // Set generic as default fallback
    registry.setDefault(new GenericDiagramHandler());
  }, []);

  // Convert SVG to React Flow format when SVG content changes
  useEffect(() => {
    if (!svgContent) return;

    try {
      const converter = new SVGToReactFlowConverter();
      const result = converter.convert(svgContent);

      // Parse SVG to detect handler
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = doc.documentElement as unknown as SVGElement;

      // Detect appropriate handler
      const handler = diagramRegistry.detectHandler(svgElement);
      setDetectedHandler(handler);

      console.log('🎯 Detected diagram handler:', handler?.displayName || 'None');
      console.log('📊 Parsed nodes:', result.nodes.length);
      console.log('🔗 Parsed edges:', result.edges.length);

      setNodes(result.nodes);
      setEdges(result.edges);
    } catch (error) {
      console.error('Error converting SVG to React Flow:', error);
    }
  }, [svgContent, setNodes, setEdges]);

  // Get node types from the detected handler
  const nodeTypes = useMemo(() => {
    if (!detectedHandler) {
      return {};
    }
    return detectedHandler.getNodeTypes();
  }, [detectedHandler]);

  // Get edge types from the detected handler (if any)
  const edgeTypes = useMemo(() => {
    if (!detectedHandler || !detectedHandler.getEdgeTypes) {
      return {};
    }
    return detectedHandler.getEdgeTypes();
  }, [detectedHandler]);

  // Handle node changes and notify parent
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
      if (onNodesChange) {
        // Get updated nodes after changes
        setNodes((currentNodes) => {
          onNodesChange(currentNodes);
          return currentNodes;
        });
      }
    },
    [onNodesChangeInternal, onNodesChange, setNodes]
  );

  // Handle edge changes and notify parent
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        setEdges((currentEdges) => {
          onEdgesChange(currentEdges);
          return currentEdges;
        });
      }
    },
    [onEdgesChangeInternal, onEdgesChange, setEdges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [setEdges]
  );

  // Apply constraints from handler (if any)
  const snapToGrid = detectedHandler?.constraints?.snapToGrid ?? false;
  const snapGrid: [number, number] = [
    detectedHandler?.constraints?.snapGridSize ?? 15,
    detectedHandler?.constraints?.snapGridSize ?? 15,
  ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: detectedHandler?.constraints?.edgeRouting || 'smoothstep',
          animated: false,
        }}
      >
        {/* Background grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#ccc"
        />

        {/* Controls for zoom/pan */}
        <Controls />

        {/* MiniMap for navigation */}
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            if (node.type === 'circle') return '#f87171';
            if (node.type === 'diamond') return '#fbbf24';
            return '#60a5fa';
          }}
          zoomable
          pannable
        />

        {/* Info Panel */}
        <Panel position="top-right">
          <div
            style={{
              background: 'white',
              padding: '10px 15px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontSize: '12px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              React Flow Editor (PoC)
            </div>
            <div style={{ color: '#666' }}>
              Diagram Type: <strong>{detectedHandler?.displayName || 'Unknown'}</strong>
            </div>
            <div style={{ color: '#666' }}>
              Nodes: {nodes.length} | Edges: {edges.length}
            </div>
            {snapToGrid && (
              <div style={{ color: '#666', marginTop: '5px' }}>
                ✓ Snap to Grid ({snapGrid[0]}px)
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
