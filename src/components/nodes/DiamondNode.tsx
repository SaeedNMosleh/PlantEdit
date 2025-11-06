/**
 * Diamond node component for React Flow
 * Used for: Decision points in activity diagrams, conditional branches
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface DiamondNodeData {
  label: string;
  width?: number;
  height?: number;
  shapeType: string;
}

function DiamondNode({ data, selected }: NodeProps<DiamondNodeData>) {
  const width = data.width || 80;
  const height = data.height || 80;

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

      {/* SVG Diamond */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          cursor: 'move',
          filter: selected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      >
        {/* Diamond shape */}
        <polygon
          points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`}
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

export default memo(DiamondNode);
