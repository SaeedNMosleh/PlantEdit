/**
 * Core types for the extensible diagram system
 */

import { Node, Edge } from 'reactflow';

// Shape types supported across different diagram types
export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'ellipse'
  | 'actor'
  | 'polygon'
  | 'custom';

// Parsed node information from SVG
export interface ParsedNode {
  id: string;
  shapeType: ShapeType;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  svgElement: SVGElement;
  metadata: Record<string, any>;
}

// Parsed edge information from SVG
export interface ParsedEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  points?: { x: number; y: number }[];
  svgElement: SVGElement;
  metadata: Record<string, any>;
}

// Diagram type handler interface - implement this for each diagram type
export interface DiagramTypeHandler {
  name: string;
  displayName: string;

  // Detect if this handler can process the given SVG
  canHandle(svg: SVGElement): boolean;

  // Parse nodes from SVG
  parseNodes(svg: SVGElement): ParsedNode[];

  // Parse edges from SVG
  parseEdges(svg: SVGElement): ParsedEdge[];

  // Get React Flow node types for this diagram
  getNodeTypes(): Record<string, any>;

  // Get React Flow edge types for this diagram
  getEdgeTypes?(): Record<string, any>;

  // Optional: Constraints for this diagram type
  constraints?: DiagramConstraints;
}

// Layout constraints for specific diagram types
export interface DiagramConstraints {
  // Can nodes move freely, or are there restrictions?
  nodeMovement?: 'free' | 'horizontal-only' | 'vertical-only' | 'constrained';

  // Should edges auto-route when nodes move?
  autoRouteEdges?: boolean;

  // Edge routing strategy
  edgeRouting?: 'straight' | 'smoothstep' | 'step' | 'bezier';

  // Should nodes snap to grid?
  snapToGrid?: boolean;
  snapGridSize?: number;

  // Custom validation function
  validateNodePosition?: (nodeId: string, position: { x: number; y: number }) => boolean;
}

// Conversion result from SVG to React Flow
export interface ConversionResult {
  nodes: Node[];
  edges: Edge[];
  diagramType: string;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    viewBox?: string;
  };
}
