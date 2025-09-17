/**
 * EdgeComponent - renders edges with dynamic path calculation using SVG markers
 * This solves the arrow orientation and coordinate system issues
 */

import React, { useMemo } from 'react';
import { Edge, Node } from '@/types/graph';
import { getOptimalConnectionPoints, generateOrthogonalPath } from '@/utils/geometry';
import { clsx } from 'clsx';

export interface EdgeComponentProps {
  edge: Edge;
  nodes: Node[];
}

export const EdgeComponent: React.FC<EdgeComponentProps> = ({
  edge,
  nodes,
}) => {
  // Find source and target nodes
  const sourceNode = useMemo(() =>
    nodes.find(node => node.id === edge.sourceNodeId),
    [nodes, edge.sourceNodeId]
  );

  const targetNode = useMemo(() =>
    nodes.find(node => node.id === edge.targetNodeId),
    [nodes, edge.targetNodeId]
  );

  // Calculate connection points and path
  const { pathData, connectionPoints } = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return { pathData: '', connectionPoints: null };
    }

    const points = getOptimalConnectionPoints(sourceNode, targetNode);

    // Generate path based on edge type and preferences
    const pathData = generateOrthogonalPath(points.source.position, points.target.position);

    return { pathData, connectionPoints: points };
  }, [sourceNode, targetNode, edge.type]);

  // Determine marker based on edge type
  const markerEnd = useMemo(() => {
    switch (edge.type) {
      case 'inheritance':
        return 'url(#arrow-triangle)';
      case 'composition':
        return 'url(#arrow-diamond-filled)';
      case 'aggregation':
        return 'url(#arrow-diamond)';
      case 'dependency':
        return 'url(#arrow-open)';
      case 'realization':
        return 'url(#arrow-triangle-open)';
      default:
        return 'url(#arrow-default)';
    }
  }, [edge.type]);

  // Calculate styles
  const edgeStyles = useMemo(() => {
    const baseStyles = {
      stroke: edge.style.stroke,
      strokeWidth: edge.style.strokeWidth,
      strokeDasharray: edge.style.strokeDasharray,
      fill: 'none',
      markerEnd,
    };

    // Special styles for different edge types
    switch (edge.type) {
      case 'dependency':
        return {
          ...baseStyles,
          strokeDasharray: '5 5',
        };
      case 'realization':
        return {
          ...baseStyles,
          strokeDasharray: '3 3',
        };
      default:
        return baseStyles;
    }
  }, [edge.style, edge.type, markerEnd]);

  // Don't render if nodes are missing
  if (!sourceNode || !targetNode || !pathData) {
    return null;
  }

  return (
    <g
      className={clsx(
        'edge-component',
        `edge-type-${edge.type}`
      )}
    >
      {/* Main edge path */}
      <path
        d={pathData}
        style={edgeStyles}
        className="edge-path pointer-events-none"
      />

      {/* Edge label */}
      {edge.label && connectionPoints && (
        <text
          x={(connectionPoints.source.position.x + connectionPoints.target.position.x) / 2}
          y={(connectionPoints.source.position.y + connectionPoints.target.position.y) / 2 - 5}
          textAnchor="middle"
          className="fill-current text-xs font-medium pointer-events-none"
          style={{
            paintOrder: 'stroke fill',
            stroke: 'white',
            strokeWidth: '3px',
            strokeLinejoin: 'round',
          }}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
};

// Helper component for rendering edge labels
export const EdgeLabel: React.FC<{
  label: string;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
}> = ({ label, sourcePoint, targetPoint }) => {
  const midpoint = {
    x: (sourcePoint.x + targetPoint.x) / 2,
    y: (sourcePoint.y + targetPoint.y) / 2,
  };

  return (
    <text
      x={midpoint.x}
      y={midpoint.y - 5}
      textAnchor="middle"
      className="fill-current text-xs font-medium pointer-events-none"
      style={{
        paintOrder: 'stroke fill',
        stroke: 'white',
        strokeWidth: '2px',
        strokeLinejoin: 'round',
      }}
    >
      {label}
    </text>
  );
};