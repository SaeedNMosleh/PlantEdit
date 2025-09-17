/**
 * Hook for diagram canvas control
 */

import { useRef } from 'react';

export interface DiagramCanvasRef {
  zoomToFit: () => void;
  resetZoom: () => void;
}

// Hook for canvas control
export const useDiagramCanvas = () => {
  const canvasRef = useRef<DiagramCanvasRef | null>(null);

  return {
    canvasRef,
    zoomToFit: () => canvasRef.current?.zoomToFit(),
    resetZoom: () => canvasRef.current?.resetZoom(),
  };
};