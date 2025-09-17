/**
 * Status Bar component
 */

import React from 'react';
import { useNodes, useEdges, useViewport } from '@/stores/diagramStore';

export interface StatusBarProps {
  status: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const nodes = useNodes();
  const edges = useEdges();
  const viewport = useViewport();

  const zoomPercentage = Math.round(viewport.zoom * 100);

  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between text-sm text-gray-600">
        {/* Left - Status */}
        <div className="flex items-center space-x-4">
          <span className="font-medium">{status}</span>
          <div className="flex items-center space-x-2">
            <span>Nodes: {nodes.length}</span>
            <span>•</span>
            <span>Edges: {edges.length}</span>
          </div>
        </div>

        {/* Right - Zoom */}
        <div className="flex items-center space-x-2">
          <span>Zoom: {zoomPercentage}%</span>
        </div>
      </div>
    </div>
  );
};