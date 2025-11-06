/**
 * Ellipse node component for React Flow
 * Used for: Use case ovals, various PlantUML elliptical shapes
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface EllipseNodeData {
  label: string;
  width?: number;
  height?: number;
  shapeType: string;
}

function EllipseNode({ data, selected }: NodeProps<EllipseNodeData>) {
  const width = data.width || 120;
  const height = data.height || 60;

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: '8px', height: '8px', top: '0', left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', width: '8px', height: '8px', top: '50%', left: '0', transform: 'translateY(-50%)' }}
      />

      {/* SVG Ellipse */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          cursor: 'move',
          filter: selected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      >
        {/* Ellipse shape */}
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - 2}
          ry={height / 2 - 2}
          fill="white"
          stroke={selected ? '#1a73e8' : '#333'}
          strokeWidth="2"
        />

        {/* Label */}
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontFamily="Arial, sans-serif"
          fill="#333"
        >
          {/* Split text by newlines for multi-line support */}
          {data.label.split('\n').map((line, i, arr) => (
            <tspan
              key={i}
              x={width / 2}
              dy={i === 0 ? -(arr.length - 1) * 7 : 14}
            >
              {line}
            </tspan>
          ))}
        </text>
      </svg>

      {/* Source handles */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: '8px', height: '8px', top: '50%', right: '0', transform: 'translateY(-50%)' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: '8px', height: '8px', bottom: '0', left: '50%', transform: 'translateX(-50%)' }}
      />
    </div>
  );
}

export default memo(EllipseNode);
