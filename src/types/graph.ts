/**
 * Core graph model types - simplified for easier TypeScript handling
 */

import { Position, Size } from './geometry';

// Node Types
export type NodeType =
  | 'entity'
  | 'class'
  | 'actor'
  | 'component'
  | 'note'
  | 'rectangle';

export interface BaseNodeData {
  readonly label: string;
  readonly description?: string;
}

export interface EntityNodeData extends BaseNodeData {
  readonly type: 'entity';
}

export interface RectangleNodeData extends BaseNodeData {
  readonly type: 'rectangle';
}

export interface ClassNodeData extends BaseNodeData {
  readonly type: 'class';
}

export interface ActorNodeData extends BaseNodeData {
  readonly type: 'actor';
}

export type NodeData = EntityNodeData | RectangleNodeData | ClassNodeData | ActorNodeData;

export interface Node {
  readonly id: string;
  readonly type: NodeType;
  readonly position: Position;
  readonly size: Size;
  readonly data: NodeData;
  readonly style: NodeStyle;
  readonly metadata: NodeMetadata;
}

export interface NodeStyle {
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeDasharray?: string;
  readonly cornerRadius?: number;
}

export interface NodeMetadata {
  readonly plantumlId?: string;
  readonly plantumlGroup?: string;
  readonly isLocked: boolean;
  readonly zIndex: number;
}

// Edge Types
export type EdgeType =
  | 'association'
  | 'inheritance'
  | 'dependency'
  | 'composition'
  | 'aggregation'
  | 'realization';

export interface Edge {
  readonly id: string;
  readonly type: EdgeType;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly style: EdgeStyle;
  readonly metadata: EdgeMetadata;
  readonly label?: string;
}

export interface EdgeStyle {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeDasharray?: string;
  readonly markerEnd: ArrowType;
  readonly markerStart?: ArrowType;
}

export type ArrowType =
  | 'none'
  | 'arrow'
  | 'triangle'
  | 'diamond'
  | 'circle';

export interface EdgeMetadata {
  readonly plantumlId?: string;
  readonly zIndex: number;
}

// Graph State
export interface DiagramState {
  readonly nodes: Map<string, Node>;
  readonly edges: Map<string, Edge>;
  readonly viewport: ViewportState;
  readonly metadata: DiagramMetadata;
}

export interface DiagramMetadata {
  readonly title?: string;
  readonly plantumlSource?: string;
  readonly originalSvg?: string;
  readonly lastModified: Date;
  readonly version: string;
}

export interface ViewportState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly bounds: { x: number; y: number; width: number; height: number };
}

// Factory functions
export const createNode = (config: {
  id: string;
  type: NodeType;
  position: Position;
  size: Size;
  data: NodeData;
  style?: Partial<NodeStyle>;
  metadata?: Partial<NodeMetadata>;
}): Node => ({
  id: config.id,
  type: config.type,
  position: config.position,
  size: config.size,
  data: config.data,
  style: {
    fill: '#F1F1F1',
    stroke: '#181818',
    strokeWidth: 0.5,
    ...config.style,
  },
  metadata: {
    isLocked: false,
    zIndex: 0,
    ...config.metadata,
  },
});

export const createEdge = (config: {
  id: string;
  type: EdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  style?: Partial<EdgeStyle>;
  metadata?: Partial<EdgeMetadata>;
  label?: string;
}): Edge => ({
  id: config.id,
  type: config.type,
  sourceNodeId: config.sourceNodeId,
  targetNodeId: config.targetNodeId,
  style: {
    stroke: '#181818',
    strokeWidth: 1,
    markerEnd: 'arrow',
    ...config.style,
  },
  metadata: {
    zIndex: 0,
    ...config.metadata,
  },
  ...(config.label && { label: config.label }),
});

// Type guards
export const isNode = (item: unknown): item is Node => {
  return typeof item === 'object' && item !== null &&
         typeof (item as Node).id === 'string' &&
         typeof (item as Node).type === 'string';
};

export const isEdge = (item: unknown): item is Edge => {
  return typeof item === 'object' && item !== null &&
         typeof (item as Edge).id === 'string' &&
         typeof (item as Edge).sourceNodeId === 'string' &&
         typeof (item as Edge).targetNodeId === 'string';
};