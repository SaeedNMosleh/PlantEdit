/**
 * PlantUML integration types and interfaces
 */

import { NodeType, EdgeType } from './graph';
import { Position, Size } from './geometry';

// PlantUML parsing types
export interface PlantUMLParseResult {
  readonly nodes: PlantUMLNode[];
  readonly edges: PlantUMLEdge[];
  readonly metadata: PlantUMLDiagramMetadata;
}

export interface PlantUMLNode {
  readonly id: string;
  readonly plantumlId: string;
  readonly type: NodeType;
  readonly label: string;
  readonly position: Position;
  readonly size: Size;
  readonly groupElement: SVGGElement;
  readonly rectElement?: SVGRectElement;
  readonly textElements: SVGTextElement[];
}

export interface PlantUMLEdge {
  readonly id: string;
  readonly plantumlId?: string;
  readonly sourceEntity: string;
  readonly targetEntity: string;
  readonly type: EdgeType;
  readonly pathElement: SVGPathElement;
  readonly groupElement?: SVGGElement;
  readonly polygonElement?: SVGPolygonElement;
}

export interface PlantUMLDiagramMetadata {
  readonly diagramType: PlantUMLDiagramType;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly viewBox: string;
}

export type PlantUMLDiagramType =
  | 'SEQUENCE'
  | 'CLASS'
  | 'USECASE'
  | 'ACTIVITY'
  | 'COMPONENT'
  | 'STATE'
  | 'OBJECT'
  | 'DEPLOYMENT'
  | 'TIMING'
  | 'NETWORK'
  | 'DESCRIPTION';

// SVG parsing context
export interface SVGParsingContext {
  readonly svgElement: SVGSVGElement;
  readonly nodeGroups: SVGGElement[];
  readonly pathElements: SVGPathElement[];
  readonly textElements: SVGTextElement[];
  readonly rectElements: SVGRectElement[];
}

// PlantUML API types
export interface PlantUMLServiceConfig {
  readonly serverUrl: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

export interface PlantUMLGenerationRequest {
  readonly source: string;
  readonly format: 'svg' | 'png' | 'pdf';
  readonly options?: PlantUMLOptions;
}

export interface PlantUMLOptions {
  readonly theme?: string;
  readonly scale?: number;
  readonly dpi?: number;
}

// Type mappings from PlantUML to our graph model
export const PLANTUML_NODE_TYPE_MAP: Record<string, NodeType> = {
  'entity': 'entity',
  'class': 'class',
  'actor': 'actor',
  'component': 'component',
  'note': 'note',
  'rectangle': 'rectangle',
} as const;

export const PLANTUML_EDGE_TYPE_MAP: Record<string, EdgeType> = {
  'inheritance': 'inheritance',
  'association': 'association',
  'dependency': 'dependency',
  'composition': 'composition',
  'aggregation': 'aggregation',
  'realization': 'realization',
} as const;

// Utility functions
export const extractPlantUMLEntityId = (element: SVGGElement): string | null => {
  const dataEntity = element.getAttribute('data-entity');
  if (dataEntity) return `entity_${dataEntity}`;

  const id = element.getAttribute('id');
  if (id) return id;

  return null;
};

export const extractPlantUMLEdgeConnection = (element: SVGGElement): {
  source: string | null;
  target: string | null;
} => {
  const entity1 = element.getAttribute('data-entity-1');
  const entity2 = element.getAttribute('data-entity-2');

  return {
    source: entity1 ? `entity_${entity1}` : null,
    target: entity2 ? `entity_${entity2}` : null,
  };
};

export const determinePlantUMLDiagramType = (svg: SVGSVGElement): PlantUMLDiagramType => {
  const dataType = svg.getAttribute('data-diagram-type');
  if (dataType && Object.values(['SEQUENCE', 'CLASS', 'USECASE', 'ACTIVITY', 'COMPONENT', 'STATE', 'OBJECT', 'DEPLOYMENT', 'TIMING', 'NETWORK', 'DESCRIPTION'] as const).includes(dataType as PlantUMLDiagramType)) {
    return dataType as PlantUMLDiagramType;
  }
  return 'DESCRIPTION';
};

// Type guards
export const isPlantUMLNode = (item: unknown): item is PlantUMLNode => {
  return typeof item === 'object' && item !== null &&
         typeof (item as PlantUMLNode).plantumlId === 'string' &&
         typeof (item as PlantUMLNode).label === 'string';
};

export const isPlantUMLEdge = (item: unknown): item is PlantUMLEdge => {
  return typeof item === 'object' && item !== null &&
         typeof (item as PlantUMLEdge).sourceEntity === 'string' &&
         typeof (item as PlantUMLEdge).targetEntity === 'string';
};