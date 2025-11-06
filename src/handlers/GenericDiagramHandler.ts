/**
 * Generic diagram handler - fallback for any PlantUML diagram
 * Supports basic rectangles, circles, ellipses
 */

import { DiagramTypeHandler, ParsedNode, ParsedEdge, ShapeType } from '../core/types';
import RectangleNode from '../components/nodes/RectangleNode';
import CircleNode from '../components/nodes/CircleNode';
import EllipseNode from '../components/nodes/EllipseNode';

export class GenericDiagramHandler implements DiagramTypeHandler {
  name = 'generic';
  displayName = 'Generic Diagram';

  canHandle(_svg: SVGElement): boolean {
    // Generic handler accepts any diagram as fallback
    return true;
  }

  parseNodes(svg: SVGElement): ParsedNode[] {
    const nodes: ParsedNode[] = [];
    const entityGroups = svg.querySelectorAll('g.entity');

    entityGroups.forEach((g, index) => {
      const svgGroup = g as SVGGElement;
      const shapeInfo = this.detectShapeType(svgGroup);

      if (!shapeInfo) return;

      const textElements = Array.from(svgGroup.querySelectorAll('text'));
      const label = textElements.map(t => t.textContent || '').join('\n').trim();
      const bounds = this.getElementBounds(shapeInfo.element);

      const id =
        svgGroup.getAttribute('data-entity') ||
        svgGroup.getAttribute('id') ||
        `node-${index}`;

      nodes.push({
        id,
        shapeType: shapeInfo.type,
        label,
        position: { x: bounds.x, y: bounds.y },
        size: { width: bounds.width, height: bounds.height },
        svgElement: svgGroup,
        metadata: {
          originalSVG: svgGroup.outerHTML,
        },
      });
    });

    return nodes;
  }

  parseEdges(svg: SVGElement): ParsedEdge[] {
    const edges: ParsedEdge[] = [];
    const linkGroups = svg.querySelectorAll('g.link');

    linkGroups.forEach((g, index) => {
      const svgGroup = g as SVGGElement;
      const path = svgGroup.querySelector('path');

      if (!path) return;

      const sourceId = svgGroup.getAttribute('data-entity-1') || '';
      const targetId = svgGroup.getAttribute('data-entity-2') || '';

      if (!sourceId || !targetId) return;

      const textElement = svgGroup.querySelector('text');
      const label = textElement?.textContent?.trim();

      const id = `edge-${sourceId}-${targetId}-${index}`;

      edges.push({
        id,
        source: sourceId,
        target: targetId,
        ...(label ? { label } : {}),
        svgElement: svgGroup,
        metadata: {},
      });
    });

    return edges;
  }

  getNodeTypes() {
    return {
      rectangle: RectangleNode,
      circle: CircleNode,
      ellipse: EllipseNode,
    };
  }

  constraints = {
    nodeMovement: 'free' as const,
    autoRouteEdges: true,
    edgeRouting: 'smoothstep' as const,
    snapToGrid: false,
  };

  private detectShapeType(group: SVGGElement): { type: ShapeType; element: SVGElement } | null {
    const rect = group.querySelector('rect');
    if (rect) {
      return { type: 'rectangle', element: rect as SVGElement };
    }

    const circle = group.querySelector('circle');
    if (circle) {
      return { type: 'circle', element: circle as SVGElement };
    }

    const ellipse = group.querySelector('ellipse');
    if (ellipse) {
      return { type: 'ellipse', element: ellipse as SVGElement };
    }

    return null;
  }

  private getElementBounds(element: SVGElement): { x: number; y: number; width: number; height: number } {
    if (element.tagName === 'rect') {
      const rect = element as SVGRectElement;
      return {
        x: parseFloat(rect.getAttribute('x') || '0'),
        y: parseFloat(rect.getAttribute('y') || '0'),
        width: parseFloat(rect.getAttribute('width') || '100'),
        height: parseFloat(rect.getAttribute('height') || '50'),
      };
    }

    if (element.tagName === 'circle') {
      const circle = element as SVGCircleElement;
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '25');
      return {
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2,
      };
    }

    if (element.tagName === 'ellipse') {
      const ellipse = element as SVGEllipseElement;
      const cx = parseFloat(ellipse.getAttribute('cx') || '0');
      const cy = parseFloat(ellipse.getAttribute('cy') || '0');
      const rx = parseFloat(ellipse.getAttribute('rx') || '40');
      const ry = parseFloat(ellipse.getAttribute('ry') || '25');
      return {
        x: cx - rx,
        y: cy - ry,
        width: rx * 2,
        height: ry * 2,
      };
    }

    return { x: 0, y: 0, width: 100, height: 50 };
  }
}
