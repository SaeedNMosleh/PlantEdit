/**
 * Converts PlantUML SVG output to React Flow format
 */

import { Node, Edge } from 'reactflow';
import { ParsedNode, ParsedEdge, ShapeType, ConversionResult } from './types';

export class SVGToReactFlowConverter {
  /**
   * Convert SVG string to React Flow format
   */
  convert(svgString: string): ConversionResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement as unknown as SVGElement;

    // Extract metadata
    const viewBox = svgElement.getAttribute('viewBox');
    const width = parseFloat(svgElement.getAttribute('width') || '800');
    const height = parseFloat(svgElement.getAttribute('height') || '600');

    // Parse nodes and edges
    const parsedNodes = this.parseNodes(svgElement);
    const parsedEdges = this.parseEdges(svgElement);

    // Convert to React Flow format
    const nodes = this.convertNodesToReactFlow(parsedNodes);
    const edges = this.convertEdgesToReactFlow(parsedEdges);

    return {
      nodes,
      edges,
      diagramType: 'generic', // Can be enhanced with diagram type detection
      metadata: {
        originalWidth: width,
        originalHeight: height,
        ...(viewBox ? { viewBox } : {}),
      },
    };
  }

  /**
   * Parse nodes from SVG - detects various shape types
   * Updated to handle PlantUML activity diagrams and other diagram types
   */
  private parseNodes(svg: SVGElement): ParsedNode[] {
    const nodes: ParsedNode[] = [];

    // Try multiple strategies to find nodes
    // Strategy 1: Look for g.entity (works for component diagrams, use cases, etc.)
    const entityGroups = svg.querySelectorAll('g.entity');

    if (entityGroups.length > 0) {
      console.log('✅ Found g.entity elements:', entityGroups.length);
      entityGroups.forEach((g, index) => {
        const node = this.parseNodeFromGroup(g as SVGGElement, index);
        if (node) nodes.push(node);
      });
    } else {
      console.log('⚠️ No g.entity elements found, trying broader search...');

      // Strategy 2: Find all <g> elements that contain shapes
      // This works for activity diagrams and other types
      const allGroups = svg.querySelectorAll('g');

      allGroups.forEach((g, index) => {
        const svgGroup = g as SVGGElement;

        // Check if this group has a shape element directly
        const hasRect = svgGroup.querySelector(':scope > rect');
        const hasEllipse = svgGroup.querySelector(':scope > ellipse');
        const hasCircle = svgGroup.querySelector(':scope > circle');
        const hasPolygon = svgGroup.querySelector(':scope > polygon');

        if (hasRect || hasEllipse || hasCircle || hasPolygon) {
          // Skip if this is a link/edge group or background element
          const id = svgGroup.getAttribute('id') || '';
          if (id.includes('link') || id.includes('edge') || svgGroup.classList.contains('link')) {
            return;
          }

          const node = this.parseNodeFromGroup(svgGroup, index);
          if (node) nodes.push(node);
        }
      });

      console.log('✅ Found nodes via broader search:', nodes.length);
    }

    return nodes;
  }

  /**
   * Parse a single node from a group element
   */
  private parseNodeFromGroup(svgGroup: SVGGElement, index: number): ParsedNode | null {
    // Try to detect shape type
    const shapeInfo = this.detectShapeType(svgGroup);
    if (!shapeInfo) return null;

    // Extract text content
    const textElements = Array.from(svgGroup.querySelectorAll('text'));
    const label = textElements.map(t => t.textContent || '').join('\n').trim();

    // Extract position and size
    const bounds = this.getElementBounds(shapeInfo.element);

    // Extract ID from data attributes or generate one
    const id =
      svgGroup.getAttribute('data-entity') ||
      svgGroup.getAttribute('id') ||
      `node-${index}`;

    return {
      id,
      shapeType: shapeInfo.type,
      label,
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: bounds.height },
      svgElement: svgGroup,
      metadata: {
        originalSVG: svgGroup.outerHTML,
        textElements: textElements.length,
      },
    };
  }

  /**
   * Detect the shape type of an SVG group
   */
  private detectShapeType(group: SVGGElement): { type: ShapeType; element: SVGElement } | null {
    // Check for rectangle
    const rect = group.querySelector('rect');
    if (rect) {
      // Check if it's actually a diamond (rotated rectangle)
      const transform = rect.getAttribute('transform');
      if (transform?.includes('rotate')) {
        return { type: 'diamond', element: rect as SVGElement };
      }
      return { type: 'rectangle', element: rect as SVGElement };
    }

    // Check for circle
    const circle = group.querySelector('circle');
    if (circle) {
      return { type: 'circle', element: circle as SVGElement };
    }

    // Check for ellipse
    const ellipse = group.querySelector('ellipse');
    if (ellipse) {
      return { type: 'ellipse', element: ellipse as SVGElement };
    }

    // Check for polygon (could be diamond, hexagon, etc.)
    const polygon = group.querySelector('polygon');
    if (polygon) {
      const points = polygon.getAttribute('points') || '';
      // Simple heuristic: if 4 points, likely a diamond
      const pointCount = points.split(' ').filter(p => p.trim()).length;
      if (pointCount === 4) {
        return { type: 'diamond', element: polygon as SVGElement };
      }
      return { type: 'polygon', element: polygon as SVGElement };
    }

    // Check for path (complex shapes)
    const path = group.querySelector('path');
    if (path) {
      return { type: 'custom', element: path as SVGElement };
    }

    return null;
  }

  /**
   * Get bounding box of an SVG element
   */
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
        return { x: 0, y: 0, width: 100, height: 50 };
      }

      const xs = coords.map(c => c.x).filter((x): x is number => !isNaN(x));
      const ys = coords.map(c => c.y).filter((y): y is number => !isNaN(y));

      if (xs.length === 0 || ys.length === 0) {
        return { x: 0, y: 0, width: 100, height: 50 };
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

    // Fallback for complex shapes
    try {
      const bbox = (element as SVGGraphicsElement).getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    } catch {
      return { x: 0, y: 0, width: 100, height: 50 };
    }
  }

  /**
   * Parse edges/links from SVG
   * Updated to handle different PlantUML edge structures
   */
  private parseEdges(svg: SVGElement): ParsedEdge[] {
    const edges: ParsedEdge[] = [];

    // Strategy 1: Look for g.link elements (traditional approach)
    const linkGroups = svg.querySelectorAll('g.link');

    if (linkGroups.length > 0) {
      console.log('✅ Found g.link elements:', linkGroups.length);

      linkGroups.forEach((g, index) => {
        const svgGroup = g as SVGGElement;

        const path = svgGroup.querySelector('path');
        if (!path) return;

        const sourceId = svgGroup.getAttribute('data-entity-1') || '';
        const targetId = svgGroup.getAttribute('data-entity-2') || '';

        if (!sourceId || !targetId) return;

        // Extract label if present
        const textElement = svgGroup.querySelector('text');
        const label = textElement?.textContent?.trim();

        // Parse path points (simplified)
        const pathData = path.getAttribute('d') || '';
        const points = this.parsePathToPoints(pathData);

        const id = `edge-${sourceId}-${targetId}-${index}`;

        edges.push({
          id,
          source: sourceId,
          target: targetId,
          ...(label ? { label } : {}),
          ...(points.length > 0 ? { points } : {}),
          svgElement: svgGroup,
          metadata: {
            originalPath: pathData,
          },
        });
      });
    } else {
      console.log('⚠️ No g.link elements found, trying to find paths...');

      // Strategy 2: Find all path elements that look like connections
      // This is more generic but less reliable for determining source/target
      const allPaths = svg.querySelectorAll('path');
      const nodeIds: string[] = [];

      // Collect all node IDs first
      svg.querySelectorAll('g').forEach(g => {
        const id = g.getAttribute('id');
        if (id && !id.includes('link') && !id.includes('edge')) {
          nodeIds.push(id);
        }
      });

      allPaths.forEach((path, index) => {
        const pathElement = path as SVGPathElement;
        const parent = pathElement.parentElement;

        // Skip if this is part of a shape
        if (parent?.querySelector('rect, ellipse, circle, polygon')) {
          return;
        }

        // Create a generic edge
        const id = `edge-${index}`;

        edges.push({
          id,
          source: nodeIds[0] || 'unknown',
          target: nodeIds[Math.min(1, nodeIds.length - 1)] || 'unknown',
          svgElement: (parent || pathElement.parentNode) as SVGGElement,
          metadata: {
            originalPath: pathElement.getAttribute('d') || '',
          },
        });
      });

      console.log('✅ Found edges via path search:', edges.length);
    }

    return edges;
  }

  /**
   * Parse SVG path data to points (simplified)
   */
  private parsePathToPoints(pathData: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];

    // Very simplified path parsing - just extract M and L commands
    const commands = pathData.match(/[ML]\s*[\d.-]+\s*[\d.-]+/g) || [];

    commands.forEach(cmd => {
      const coords = cmd.match(/[\d.-]+/g);
      if (coords && coords.length >= 2) {
        const x = parseFloat(coords[0] || '0');
        const y = parseFloat(coords[1] || '0');
        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y });
        }
      }
    });

    return points;
  }

  /**
   * Convert parsed nodes to React Flow nodes
   */
  private convertNodesToReactFlow(parsedNodes: ParsedNode[]): Node[] {
    return parsedNodes.map(node => ({
      id: node.id,
      type: node.shapeType, // Maps to custom node types
      position: node.position,
      data: {
        label: node.label,
        width: node.size.width,
        height: node.size.height,
        shapeType: node.shapeType,
        metadata: node.metadata,
      },
      // React Flow will calculate dimensions from the rendered content
    }));
  }

  /**
   * Convert parsed edges to React Flow edges
   */
  private convertEdgesToReactFlow(parsedEdges: ParsedEdge[]): Edge[] {
    return parsedEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
      type: 'smoothstep', // Can be customized per diagram type
      animated: false,
      data: {
        points: edge.points,
        metadata: edge.metadata,
      },
    }));
  }
}
