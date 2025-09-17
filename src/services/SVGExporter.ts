/**
 * SVG Exporter - generates SVG from current diagram state
 */

import { Node, Edge } from '@/types/graph';
import { getOptimalConnectionPoints, generateOrthogonalPath, generateDirectPath } from '@/utils/geometry';

export class SVGExporter {
  /**
   * Export current diagram state to SVG string
   */
  exportToSVG(nodes: Node[], edges: Edge[]): string {
    if (nodes.length === 0) {
      return '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><text x="10" y="50">No diagram to export</text></svg>';
    }

    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(nodes);
    const padding = 20;
    const width = boundingBox.width + 2 * padding;
    const height = boundingBox.height + 2 * padding;

    // Adjust coordinates relative to the bounding box
    const offsetX = -boundingBox.x + padding;
    const offsetY = -boundingBox.y + padding;

    // Start building SVG
    const svgParts: string[] = [];

    // SVG header
    svgParts.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);

    // Add styles
    svgParts.push('<defs>');
    svgParts.push(this.generateMarkerDefinitions());
    svgParts.push('</defs>');

    // Add background (optional)
    svgParts.push(`<rect width="100%" height="100%" fill="white"/>`);

    // Render edges first (behind nodes)
    edges.forEach(edge => {
      const svgEdge = this.renderEdge(edge, nodes, offsetX, offsetY);
      if (svgEdge) {
        svgParts.push(svgEdge);
      }
    });

    // Render nodes
    nodes.forEach(node => {
      svgParts.push(this.renderNode(node, offsetX, offsetY));
    });

    // Close SVG
    svgParts.push('</svg>');

    return svgParts.join('\n');
  }

  /**
   * Calculate bounding box of all nodes
   */
  private calculateBoundingBox(nodes: Node[]): { x: number; y: number; width: number; height: number } {
    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

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
  }

  /**
   * Generate arrow marker definitions for SVG
   */
  private generateMarkerDefinitions(): string {
    return `
      <marker id="arrow-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#181818"/>
      </marker>
      <marker id="arrow-triangle" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="none" stroke="#181818" stroke-width="1"/>
      </marker>
      <marker id="arrow-diamond" markerWidth="10" markerHeight="6" refX="9" refY="3" orient="auto">
        <polygon points="0 3, 4 0, 8 3, 4 6" fill="none" stroke="#181818" stroke-width="1"/>
      </marker>
      <marker id="arrow-diamond-filled" markerWidth="10" markerHeight="6" refX="9" refY="3" orient="auto">
        <polygon points="0 3, 4 0, 8 3, 4 6" fill="#181818"/>
      </marker>
      <marker id="arrow-open" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polyline points="0,0 10,3.5 0,7" fill="none" stroke="#181818" stroke-width="1"/>
      </marker>
      <marker id="arrow-triangle-open" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="none" stroke="#181818" stroke-width="1" stroke-dasharray="2,2"/>
      </marker>
    `;
  }

  /**
   * Render a node to SVG string
   */
  private renderNode(node: Node, offsetX: number, offsetY: number): string {
    const x = node.position.x + offsetX;
    const y = node.position.y + offsetY;
    const { width, height } = node.size;

    const parts: string[] = [];

    // Node group
    parts.push(`<g transform="translate(${x}, ${y})">`);

    // Main rectangle
    parts.push(`<rect width="${width}" height="${height}"
                rx="${node.style.cornerRadius || 2.5}"
                ry="${node.style.cornerRadius || 2.5}"
                fill="${node.style.fill}"
                stroke="${node.style.stroke}"
                stroke-width="${node.style.strokeWidth}"
                ${node.style.strokeDasharray ? `stroke-dasharray="${node.style.strokeDasharray}"` : ''}
                />`);

    // Node content based on type
    parts.push(this.renderNodeContent(node));

    parts.push('</g>');

    return parts.join('\n');
  }

  /**
   * Render node content based on node type
   */
  private renderNodeContent(node: Node): string {
    const parts: string[] = [];

    switch (node.data.type) {
      case 'entity':
        parts.push(`<text x="${node.size.width / 2}" y="20" text-anchor="middle"
                    font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#000">
                    ${this.escapeXml(node.data.label)}
                   </text>`);
        if (node.data.description) {
          parts.push(`<text x="${node.size.width / 2}" y="35" text-anchor="middle"
                      font-family="Arial, sans-serif" font-size="10" fill="#666">
                      ${this.escapeXml(node.data.description)}
                     </text>`);
        }
        break;

      case 'class':
        parts.push(`<text x="${node.size.width / 2}" y="20" text-anchor="middle"
                    font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#000">
                    ${this.escapeXml(node.data.label)}
                   </text>`);
        parts.push(`<line x1="5" y1="30" x2="${node.size.width - 5}" y2="30"
                    stroke="#000" stroke-width="0.5"/>`);
        break;

      case 'actor':
        parts.push(`<circle cx="${node.size.width / 2}" cy="15" r="8"
                    fill="none" stroke="#000" stroke-width="1"/>`);
        parts.push(`<line x1="${node.size.width / 2}" y1="23"
                    x2="${node.size.width / 2}" y2="45"
                    stroke="#000" stroke-width="1"/>`);
        parts.push(`<text x="${node.size.width / 2}" y="${node.size.height - 5}" text-anchor="middle"
                    font-family="Arial, sans-serif" font-size="10" fill="#000">
                    ${this.escapeXml(node.data.label)}
                   </text>`);
        break;

      default:
        parts.push(`<text x="${node.size.width / 2}" y="${node.size.height / 2}" text-anchor="middle"
                    font-family="Arial, sans-serif" font-size="12" fill="#000">
                    ${this.escapeXml(node.data.label)}
                   </text>`);
        break;
    }

    return parts.join('\n');
  }

  /**
   * Render an edge to SVG string
   */
  private renderEdge(edge: Edge, nodes: Node[], offsetX: number, offsetY: number): string | null {
    const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);
    const targetNode = nodes.find(n => n.id === edge.targetNodeId);

    if (!sourceNode || !targetNode) {
      return null;
    }

    // Calculate connection points
    const connectionPoints = getOptimalConnectionPoints(sourceNode, targetNode);

    // Adjust coordinates
    const sourcePoint = {
      x: connectionPoints.source.position.x + offsetX,
      y: connectionPoints.source.position.y + offsetY,
    };
    const targetPoint = {
      x: connectionPoints.target.position.x + offsetX,
      y: connectionPoints.target.position.y + offsetY,
    };

    // Generate path
    const pathData = edge.type === 'inheritance' || edge.type === 'realization'
      ? generateDirectPath(sourcePoint, targetPoint)
      : generateOrthogonalPath(sourcePoint, targetPoint);

    // Determine marker
    const markerEnd = this.getMarkerEnd(edge.type);

    // Build stroke attributes
    const strokeAttributes: string[] = [
      `stroke="${edge.style.stroke}"`,
      `stroke-width="${edge.style.strokeWidth}"`,
      'fill="none"',
      `marker-end="url(#${markerEnd})"`,
    ];

    // Add dash array for specific edge types
    if (edge.type === 'dependency') {
      strokeAttributes.push('stroke-dasharray="5 5"');
    } else if (edge.type === 'realization') {
      strokeAttributes.push('stroke-dasharray="3 3"');
    } else if (edge.style.strokeDasharray) {
      strokeAttributes.push(`stroke-dasharray="${edge.style.strokeDasharray}"`);
    }

    const parts: string[] = [];
    parts.push(`<path d="${pathData}" ${strokeAttributes.join(' ')}/>`);

    // Add label if present
    if (edge.label) {
      const midX = (sourcePoint.x + targetPoint.x) / 2;
      const midY = (sourcePoint.y + targetPoint.y) / 2 - 5;
      parts.push(`<text x="${midX}" y="${midY}" text-anchor="middle"
                  font-family="Arial, sans-serif" font-size="10" fill="#000"
                  stroke="white" stroke-width="3" paint-order="stroke fill">
                  ${this.escapeXml(edge.label)}
                 </text>`);
    }

    return parts.join('\n');
  }

  /**
   * Get marker end based on edge type
   */
  private getMarkerEnd(edgeType: Edge['type']): string {
    switch (edgeType) {
      case 'inheritance':
        return 'arrow-triangle';
      case 'composition':
        return 'arrow-diamond-filled';
      case 'aggregation':
        return 'arrow-diamond';
      case 'dependency':
        return 'arrow-open';
      case 'realization':
        return 'arrow-triangle-open';
      default:
        return 'arrow-default';
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Export to downloadable blob
   */
  exportToBlob(nodes: Node[], edges: Edge[]): Blob {
    const svgString = this.exportToSVG(nodes, edges);
    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  /**
   * Trigger download of SVG file
   */
  downloadSVG(nodes: Node[], edges: Edge[], filename = 'diagram.svg'): void {
    const blob = this.exportToBlob(nodes, edges);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Default exporter instance
export const svgExporter = new SVGExporter();