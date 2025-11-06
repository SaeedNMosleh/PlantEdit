/**
 * Rectangle node component for React Flow
 * Used for: Activity actions, class boxes, generic rectangles
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface RectangleNodeData {
  label: string;
  width?: number;
  height?: number;
  shapeType: string;
}

function RectangleNode({ data, selected }: NodeProps<RectangleNodeData>) {
  const width = data.width || 120;
  const height = data.height || 60;

  return (
    <div
      style={{
        width: `${width}px`,
        minHeight: `${height}px`,
        padding: '10px',
        border: selected ? '2px solid #1a73e8' : '2px solid #333',
        borderRadius: '4px',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        cursor: 'move',
        boxShadow: selected ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />

      {/* Label */}
      <div
        style={{
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {data.label}
      </div>

      {/* Source handles */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
    </div>
  );
}

export default memo(RectangleNode);
