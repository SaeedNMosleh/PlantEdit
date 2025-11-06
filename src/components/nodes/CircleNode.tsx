/**
 * Circle node component for React Flow
 * Used for: Start/end states, state machine states, activity start/end
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CircleNodeData {
  label: string;
  width?: number;
  height?: number;
  shapeType: string;
}

function CircleNode({ data, selected }: NodeProps<CircleNodeData>) {
  const size = Math.max(data.width || 60, data.height || 60);

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: '8px', height: '8px', top: '0' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', width: '8px', height: '8px', left: '0' }}
      />

      {/* Circle shape */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: selected ? '2px solid #1a73e8' : '2px solid #333',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          cursor: 'move',
          boxShadow: selected ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.2s',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
            padding: '5px',
            wordBreak: 'break-word',
          }}
        >
          {data.label}
        </div>
      </div>

      {/* Source handles */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: '8px', height: '8px', right: '0' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: '8px', height: '8px', bottom: '0' }}
      />
    </div>
  );
}

export default memo(CircleNode);
