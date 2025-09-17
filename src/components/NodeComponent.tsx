/**
 * NodeComponent - renders individual nodes with drag support and selection
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDiagramStore } from '@/stores/diagramStore';
import { Node } from '@/types/graph';
import { Position } from '@/types/geometry';
import { clsx } from 'clsx';

export interface NodeComponentProps {
  node: Node;
  onMove?: (nodeId: string, position: Position) => void;
}

export const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  onMove,
}) => {
  const { moveNode } = useDiagramStore();
  const zoom = useDiagramStore((s) => s.diagram.viewport.zoom);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const nodeRef = useRef<SVGGElement>(null);

  // Handle mouse down to start dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;

      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      const newPosition: Position = {
        x: node.position.x + deltaX,
        y: node.position.y + deltaY,
      };

      moveNode(node.id, newPosition);
      onMove?.(node.id, newPosition);

      // Update drag start for next move
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, node.position, moveNode, onMove, dragStart, zoom]);

  // Handle node click
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // No selection system - just handle click
  }, []);

  // Render node content based on type
  const renderNodeContent = useMemo(() => {
    switch (node.data.type) {
      case 'entity':
        return (
          <>
            <text
              x={node.size.width / 2}
              y={20}
              textAnchor="middle"
              className="fill-current text-sm font-semibold"
              dominantBaseline="middle"
            >
              {node.data.label}
            </text>
            {node.data.description && (
              <text
                x={node.size.width / 2}
                y={35}
                textAnchor="middle"
                className="fill-current text-xs"
                dominantBaseline="middle"
              >
                {node.data.description}
              </text>
            )}
          </>
        );

      case 'class':
        return (
          <>
            <text
              x={node.size.width / 2}
              y={20}
              textAnchor="middle"
              className="fill-current text-sm font-bold"
              dominantBaseline="middle"
            >
              {node.data.label}
            </text>
            {/* Add lines for attributes and methods */}
            <line
              x1={5}
              y1={30}
              x2={node.size.width - 5}
              y2={30}
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </>
        );

      case 'actor':
        return (
          <>
            {/* Simple actor representation */}
            <circle
              cx={node.size.width / 2}
              cy={15}
              r={8}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1={node.size.width / 2}
              y1={23}
              x2={node.size.width / 2}
              y2={45}
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x={node.size.width / 2}
              y={node.size.height - 5}
              textAnchor="middle"
              className="fill-current text-xs"
              dominantBaseline="middle"
            >
              {node.data.label}
            </text>
          </>
        );

      default:
        return (
          <text
            x={node.size.width / 2}
            y={node.size.height / 2}
            textAnchor="middle"
            className="fill-current text-sm"
            dominantBaseline="middle"
          >
            {node.data.label}
          </text>
        );
    }
  }, [node]);

  // Calculate styles
  const nodeStyles = useMemo(() => {
    const baseStyles = {
      fill: node.style.fill,
      stroke: node.style.stroke,
      strokeWidth: node.style.strokeWidth,
      strokeDasharray: node.style.strokeDasharray,
    };

    // Show as draggable with dashed border when hovering
    if (isDragging) {
      return {
        ...baseStyles,
        strokeDasharray: '4 2',
        filter: 'drop-shadow(0 0 4px rgba(0, 123, 255, 0.3))',
      };
    }

    return baseStyles;
  }, [node.style, isDragging]);

  return (
    <g
      ref={nodeRef}
      transform={`translate(${node.position.x}, ${node.position.y})`}
      className={clsx(
        'node-component cursor-move',
        isDragging && 'opacity-70'
      )}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Main node rectangle */}
      <rect
        width={node.size.width}
        height={node.size.height}
        rx={node.style.cornerRadius || 2.5}
        ry={node.style.cornerRadius || 2.5}
        style={nodeStyles}
      />

      {/* Node content */}
      <g className="node-content">
        {renderNodeContent}
      </g>

      {/* Drag indicator when dragging */}
      {isDragging && (
        <rect
          width={node.size.width}
          height={node.size.height}
          fill="rgba(0, 123, 255, 0.1)"
          stroke="rgba(0, 123, 255, 0.5)"
          strokeWidth="2"
          strokeDasharray="5 5"
          rx={node.style.cornerRadius || 2.5}
          ry={node.style.cornerRadius || 2.5}
        />
      )}
    </g>
  );
};

// Utility component for rendering specific node types
export const EntityNode: React.FC<{ node: Node }> = ({ node }) => {
  if (node.data.type !== 'entity') return null;

  return (
    <g>
      <text
        x={node.size.width / 2}
        y={20}
        textAnchor="middle"
        className="fill-current text-sm font-semibold"
      >
        {node.data.label}
      </text>
      {node.data.description && (
        <text
          x={node.size.width / 2}
          y={35}
          textAnchor="middle"
          className="fill-current text-xs text-gray-600"
        >
          {node.data.description}
        </text>
      )}
    </g>
  );
};