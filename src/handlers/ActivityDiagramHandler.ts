/**
 * Activity diagram handler
 * Supports: rectangles (actions), diamonds (decisions), circles (start/end)
 */

import { DiagramTypeHandler, ParsedNode, ParsedEdge, ShapeType } from '../core/types';
import RectangleNode from '../components/nodes/RectangleNode';
import CircleNode from '../components/nodes/CircleNode';
import DiamondNode from '../components/nodes/DiamondNode';

export class ActivityDiagramHandler implements DiagramTypeHandler {
  name = 'activity';
  displayName = 'Activity Diagram';

  canHandle(svg: SVGElement): boolean {
    // Detect activity diagrams by looking for typical patterns
    // Activity diagrams often have:
    // - start/end circles (filled)
    // - decision diamonds (polygons with 4 points)
    // - action rectangles

    const hasCircles = svg.querySelector('g.entity circle') !== null;
    const hasPolygons = svg.querySelector('g.entity polygon') !== null;
    const hasRectangles = svg.querySelector('g.entity rect') !== null;

    // If we have both circles and polygons, likely an activity diagram
    return (hasCircles && hasPolygons) || (hasCircles && hasRectangles);
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
          isStartEnd: shapeInfo.type === 'circle' && !label, // Start/end nodes are often unlabeled
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
      diamond: DiamondNode,
    };
  }

  constraints = {
    nodeMovement: 'free' as const,
    autoRouteEdges: true,
    edgeRouting: 'smoothstep' as const,
    snapToGrid: true,
    snapGridSize: 20,
  };

  private detectShapeType(group: SVGGElement): { type: ShapeType; element: SVGElement } | null {
    // Check for rectangle (action)
    const rect = group.querySelector('rect');
    if (rect) {
      return { type: 'rectangle', element: rect as SVGElement };
    }

    // Check for circle (start/end)
    const circle = group.querySelector('circle');
    if (circle) {
      return { type: 'circle', element: circle as SVGElement };
    }

    // Check for polygon (decision diamond)
    const polygon = group.querySelector('polygon');
    if (polygon) {
      const points = polygon.getAttribute('points') || '';
      const pointCount = points.split(' ').filter(p => p.trim()).length;

      // 4 points = diamond
      if (pointCount === 4 || pointCount === 5) { // Sometimes has 5 points (repeated first point)
        return { type: 'diamond', element: polygon as SVGElement };
      }

      return { type: 'polygon', element: polygon as SVGElement };
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

    if (element.tagName === 'polygon') {
      const polygon = element as SVGPolygonElement;
      const points = polygon.getAttribute('points') || '';
      const coords = points.split(' ')
        .filter(p => p.trim())
        .map(p => {
          const parts = p.split(',').map(parseFloat);
          return { x: parts[0] || 0, y: parts[1] || 0 };
        })
        .filter(c => !isNaN(c.x) && !isNaN(c.y));

      if (coords.length === 0) {
        return { x: 0, y: 0, width: 80, height: 80 };
      }

      const xs = coords.map(c => c.x).filter((x): x is number => !isNaN(x));
      const ys = coords.map(c => c.y).filter((y): y is number => !isNaN(y));

      if (xs.length === 0 || ys.length === 0) {
        return { x: 0, y: 0, width: 80, height: 80 };
      }

      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    return { x: 0, y: 0, width: 100, height: 50 };
  }
}
