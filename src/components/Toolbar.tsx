/**
 * Toolbar component with diagram controls
 */

import React from 'react';
import { useViewportOperations } from '@/hooks/useDiagramInteractions';
import { useNodes } from '@/stores/diagramStore';
import { clsx } from 'clsx';

export interface ToolbarProps {
  onExportSVG?: () => void;
  onExportPNG?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onExportSVG,
  onExportPNG,
}) => {
  const { zoomIn, zoomOut, zoomToFit, resetZoom } = useViewportOperations();
  const nodes = useNodes();

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Group - Empty for now */}
        <div className="flex items-center space-x-2">
          {/* Future controls can go here */}
        </div>

        {/* Right Group - Export and Zoom Controls */}
        <div className="flex items-center space-x-2">
          {/* Export Controls */}
          {nodes.length > 0 && (
            <>
              <button
                onClick={onExportSVG}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Export current diagram as SVG"
              >
                Export SVG
              </button>
              <button
                onClick={onExportPNG}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Export current diagram as PNG"
              >
                Export PNG
              </button>
              <div className="w-px h-6 bg-gray-300" />
            </>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center bg-white border border-gray-300 rounded-md">
            <button
              onClick={zoomOut}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              title="Zoom Out (Ctrl+-)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M8 11h6" />
              </svg>
            </button>

            <div className="w-px h-6 bg-gray-300" />

            <button
              onClick={zoomIn}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              title="Zoom In (Ctrl++)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M8 11h6M11 8v6" />
              </svg>
            </button>
          </div>

          <button
            onClick={zoomToFit}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            title="Fit to View"
          >
            Fit
          </button>

          <button
            onClick={resetZoom}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            title="Reset Zoom (Ctrl+0)"
          >
            100%
          </button>
        </div>
      </div>
    </div>
  );
};