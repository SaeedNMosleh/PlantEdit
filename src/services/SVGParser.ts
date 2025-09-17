/**
 * TypeScript SVG Parser - converts PlantUML SVG to our graph model
 * This addresses the coordinate system issues by treating PlantUML SVG as input data only
 */

import {
  PlantUMLParseResult,
  PlantUMLNode,
  PlantUMLEdge,
  PlantUMLDiagramMetadata,
  SVGParsingContext,
  extractPlantUMLEntityId,
  extractPlantUMLEdgeConnection,
  determinePlantUMLDiagramType,
  PLANTUML_NODE_TYPE_MAP,
} from '@/types/plantuml';
import {
  Node,
  Edge,
  createNode,
  createEdge,
  NodeType,
  EdgeType,
  NodeData,
} from '@/types/graph';
import { createPosition, createSize, Position, Size } from '@/types/geometry';
import { Result, createSuccess, createError, SVGParsingError } from '@/types/result';

export class TypedSVGParser {
  /**
   * Parse PlantUML SVG into our graph model
   */
  async parseToGraphModel(svgText: string): Promise<Result<{ nodes: Node[]; edges: Edge[] }, SVGParsingError>> {
    try {
      // Parse SVG text to DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (!svgElement) {
        return createError(new SVGParsingError(
          'INVALID_SVG',
          'No SVG element found in provided text'
        ));
      }

      // Create parsing context
      const context = this.createParsingContext(svgElement);

      // Parse PlantUML structure
      const plantUMLResult = this.parsePlantUMLStructure(context);

      // Convert to our graph model
      const nodes = await this.convertToNodes(plantUMLResult.nodes);
      const edges = await this.convertToEdges(plantUMLResult.edges, nodes);

      return createSuccess({ nodes, edges });
    } catch (error) {
      return createError(new SVGParsingError(
        'PARSING_ERROR',
        `Failed to parse SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      ));
    }
  }

  /**
   * Create parsing context from SVG element
   */
  private createParsingContext(svgElement: SVGSVGElement): SVGParsingContext {
    // Find groups with data-entity attributes or containing rects
    const elementsWithDataEntity = Array.from(svgElement.querySelectorAll('g[data-entity]'))
      .filter((g): g is SVGGElement => g instanceof SVGGElement);
    const rectsInGroups = Array.from(svgElement.querySelectorAll('g rect'));

    const nodeGroups = [
      ...elementsWithDataEntity,
      ...rectsInGroups
        .map(rect => rect.closest('g'))
        .filter((g): g is SVGGElement => g !== null)
    ].filter((g, index, arr) => arr.indexOf(g) === index); // Remove duplicates

    return {
      svgElement,
      nodeGroups,
      pathElements: Array.from(svgElement.querySelectorAll('path')),
      textElements: Array.from(svgElement.querySelectorAll('text')),
      rectElements: Array.from(svgElement.querySelectorAll('rect')),
    };
  }

  /**
   * Parse PlantUML structure from SVG
   */
  private parsePlantUMLStructure(context: SVGParsingContext): PlantUMLParseResult {
    const metadata = this.extractMetadata(context.svgElement);
    const nodes = this.extractNodes(context);
    const edges = this.extractEdges(context, nodes);

    return { nodes, edges, metadata };
  }

  /**
   * Extract metadata from SVG
   */
  private extractMetadata(svgElement: SVGSVGElement): PlantUMLDiagramMetadata {
    const viewBox = svgElement.getAttribute('viewBox') || '0 0 1000 800';
    const parts = viewBox.split(' ').map(Number);
    const width = parts[2] || 1000;
    const height = parts[3] || 800;

    return {
      diagramType: determinePlantUMLDiagramType(svgElement),
      width,
      height,
      viewBox,
    };
  }

  /**
   * Extract nodes from SVG groups
   */
  private extractNodes(context: SVGParsingContext): PlantUMLNode[] {
    const nodes: PlantUMLNode[] = [];
    const processedGroups = new Set<SVGGElement>();

    // Process groups with data-entity attributes first
    context.nodeGroups.forEach(group => {
      if (processedGroups.has(group)) return;

      const plantumlId = extractPlantUMLEntityId(group);
      if (!plantumlId) return;

      const rect = group.querySelector('rect');
      if (!rect) return;

      const textElements = Array.from(group.querySelectorAll('text'));
      const position = this.extractPosition(rect);
      const size = this.extractSize(rect);
      const label = this.extractLabel(textElements);
      const nodeType = this.determineNodeType(group, textElements);

      nodes.push({
        id: plantumlId,
        plantumlId,
        type: nodeType,
        label,
        position,
        size,
        groupElement: group,
        rectElement: rect,
        textElements,
      });

      processedGroups.add(group);
    });

    return nodes;
  }

  /**
   * Extract edges from paths
   */
  private extractEdges(context: SVGParsingContext, nodes: PlantUMLNode[]): PlantUMLEdge[] {
    const edges: PlantUMLEdge[] = [];

    context.pathElements.forEach((pathElement, index) => {
      const parentGroup = pathElement.closest('g');

      if (parentGroup) {
        const connection = extractPlantUMLEdgeConnection(parentGroup);

        if (connection.source && connection.target) {
          const sourceNode = nodes.find(n => n.plantumlId === `entity_${connection.source}`);
          const targetNode = nodes.find(n => n.plantumlId === `entity_${connection.target}`);

          if (sourceNode && targetNode) {
            const edgeType = this.determineEdgeType(pathElement, parentGroup);
            const polygon = parentGroup.querySelector('polygon');

            const plantumlId = parentGroup.getAttribute('data-uid');

            edges.push({
              id: `edge_${index}`,
              plantumlId: plantumlId || `edge_${sourceNode.plantumlId}_${targetNode.plantumlId}`,
              sourceEntity: connection.source,
              targetEntity: connection.target,
              type: edgeType,
              pathElement,
              groupElement: parentGroup,
              ...(polygon && { polygonElement: polygon }),
            });
          }
        }
      }
    });

    return edges;
  }

  /**
   * Convert PlantUML nodes to our Node model
   */
  private async convertToNodes(plantUMLNodes: PlantUMLNode[]): Promise<Node[]> {
    return plantUMLNodes.map(plantUMLNode => {
      const nodeData = this.createNodeData(plantUMLNode);

      return createNode({
        id: plantUMLNode.id,
        type: plantUMLNode.type,
        position: plantUMLNode.position,
        size: plantUMLNode.size,
        data: nodeData,
        metadata: {
          plantumlId: plantUMLNode.plantumlId,
          plantumlGroup: plantUMLNode.groupElement.getAttribute('class') || '',
        },
      });
    });
  }

  /**
   * Convert PlantUML edges to our Edge model
   */
  private async convertToEdges(plantUMLEdges: PlantUMLEdge[], nodes: Node[]): Promise<Edge[]> {
    return plantUMLEdges.map(plantUMLEdge => {
      const sourceNode = nodes.find(n => n.metadata.plantumlId === `entity_${plantUMLEdge.sourceEntity}`);
      const targetNode = nodes.find(n => n.metadata.plantumlId === `entity_${plantUMLEdge.targetEntity}`);

      if (!sourceNode || !targetNode) {
        throw new Error(`Cannot find nodes for edge: ${plantUMLEdge.sourceEntity} -> ${plantUMLEdge.targetEntity}`);
      }

      return createEdge({
        id: plantUMLEdge.id,
        type: plantUMLEdge.type,
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        metadata: {
          ...(plantUMLEdge.plantumlId && { plantumlId: plantUMLEdge.plantumlId }),
        },
      });
    });
  }

  /**
   * Create node data based on PlantUML node
   */
  private createNodeData(plantUMLNode: PlantUMLNode): NodeData {
    const description = this.extractDescription(plantUMLNode.textElements);

    switch (plantUMLNode.type) {
      case 'entity':
        return {
          type: 'entity',
          label: plantUMLNode.label,
          ...(description && { description }),
        };
      case 'class':
        return {
          type: 'class',
          label: plantUMLNode.label,
          ...(description && { description }),
        };
      case 'actor':
        return {
          type: 'actor',
          label: plantUMLNode.label,
          ...(description && { description }),
        };
      case 'rectangle':
      default:
        return {
          type: 'rectangle',
          label: plantUMLNode.label,
          ...(description && { description }),
        };
    }
  }

  /**
   * Extract position from rect element
   */
  private extractPosition(rect: SVGRectElement): Position {
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    return createPosition(x, y);
  }

  /**
   * Extract size from rect element
   */
  private extractSize(rect: SVGRectElement): Size {
    const width = parseFloat(rect.getAttribute('width') || '100');
    const height = parseFloat(rect.getAttribute('height') || '50');
    return createSize(width, height);
  }

  /**
   * Extract label from text elements
   */
  private extractLabel(textElements: SVGTextElement[]): string {
    if (textElements.length === 0) return 'Untitled';

    // Use the first text element as the main label
    return textElements[0]?.textContent?.trim() || 'Untitled';
  }

  /**
   * Extract description from additional text elements
   */
  private extractDescription(textElements: SVGTextElement[]): string | undefined {
    if (textElements.length <= 1) return undefined;

    // Combine additional text elements as description
    return textElements
      .slice(1)
      .map(el => el.textContent?.trim())
      .filter(text => text)
      .join(' ') || undefined;
  }

  /**
   * Determine node type from SVG structure
   */
  private determineNodeType(group: SVGGElement, _textElements: SVGTextElement[]): NodeType {
    // Check data attributes first
    const dataEntity = group.getAttribute('data-entity');
    if (dataEntity && PLANTUML_NODE_TYPE_MAP[dataEntity]) {
      return PLANTUML_NODE_TYPE_MAP[dataEntity];
    }

    // Check class names
    const className = group.getAttribute('class');
    if (className?.includes('entity')) return 'entity';
    if (className?.includes('actor')) return 'actor';
    if (className?.includes('component')) return 'component';

    // Default to entity for most PlantUML diagrams
    return 'entity';
  }

  /**
   * Determine edge type from path and group
   */
  private determineEdgeType(pathElement: SVGPathElement, _group: SVGGElement): EdgeType {
    // Check for stroke dash patterns
    const strokeDasharray = pathElement.getAttribute('stroke-dasharray');
    if (strokeDasharray) return 'dependency';

    // Check for arrow markers
    const markerEnd = pathElement.getAttribute('marker-end');
    if (markerEnd?.includes('triangle')) return 'inheritance';
    if (markerEnd?.includes('diamond')) return 'composition';

    // Default to association
    return 'association';
  }
}

// Default parser instance
export const svgParser = new TypedSVGParser();