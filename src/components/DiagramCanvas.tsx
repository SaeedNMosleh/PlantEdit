/**
 * Main DiagramCanvas component - shows original PlantUML SVG with draggable nodes overlaid
 */

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { DiagramCanvasRef } from '@/hooks/useDiagramCanvas';
import * as d3 from 'd3';
import { useDiagramStore, useNodes, useEdges, useViewport } from '@/stores/diagramStore';
import { NodeComponent } from './NodeComponent';
import { EdgeComponent } from './EdgeComponent';
import { ArrowMarkers } from './ArrowMarkers';
import { Position } from '@/types/geometry';
import { clsx } from 'clsx';


export interface DiagramCanvasProps {
  className?: string;
  onNodeMove?: (nodeId: string, position: Position) => void;
}

export const DiagramCanvas = forwardRef<DiagramCanvasRef, DiagramCanvasProps>(({
  className,
  onNodeMove,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const mainGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Store selectors
  const nodes = useNodes();
  const edges = useEdges();
  const viewport = useViewport();
  const { updateViewport, moveNode } = useDiagramStore();


  // Initialize zoom behavior
  useEffect(() => {
    if (!svgRef.current || !mainGroupRef.current) return;

    const svg = d3.select(svgRef.current);
    const mainGroup = d3.select(mainGroupRef.current);

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        const { transform } = event;

        // Apply transform to main group
        mainGroup.attr('transform', transform.toString());

        // Update store
        updateViewport({
          zoom: transform.k,
          panX: transform.x,
          panY: transform.y,
        });
      });

    // Apply zoom to SVG
    svg.call(zoomBehavior);

    // Disable double-click zoom
    svg.on('dblclick.zoom', null);

    // Store reference for external control
    zoomBehaviorRef.current = zoomBehavior;

    // Set initial transform
    const initialTransform = d3.zoomIdentity
      .translate(viewport.panX, viewport.panY)
      .scale(viewport.zoom);

    svg.call(zoomBehavior.transform, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, [updateViewport, viewport.panX, viewport.panY, viewport.zoom]);

  // Handle canvas click
// Keep viewport bounds in sync with current nodes (initial load and any changes)
useEffect(() => {
  if (nodes.length === 0) return;

  const bbox = useDiagramStore.getState().getBoundingBox();
  if (bbox) {
    const pad = 40;
    updateViewport({
      bounds: {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + 2 * pad,
        height: bbox.height + 2 * pad,
      },
    });
  }
}, [nodes, updateViewport]);
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Just prevent propagation for now
    event.stopPropagation();
  }, []);

  // Handle node move - update store and notify parent
  const handleNodeMove = useCallback((nodeId: string, position: Position) => {
    // Update node position in the store
    moveNode(nodeId, position);
    onNodeMove?.(nodeId, position);

    // Recompute bounding box and update viewport bounds so background expands/shrinks
    const bbox = useDiagramStore.getState().getBoundingBox();
    if (bbox) {
      const pad = 40;
      updateViewport({
        bounds: {
          x: bbox.x - pad,
          y: bbox.y - pad,
          width: bbox.width + 2 * pad,
          height: bbox.height + 2 * pad,
        },
      });
    }
  }, [moveNode, onNodeMove, updateViewport]);

  // Public methods for external control
  const zoomToFit = useCallback(() => {
    if (!zoomBehaviorRef.current || !svgRef.current || nodes.length === 0) return;

    // Calculate bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const { position, size } = node;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    });

    if (minX !== Infinity) {
      const padding = 50;
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      const svg = svgRef.current;
      const svgRect = svg.getBoundingClientRect();
      const scaleX = (svgRect.width - 2 * padding) / contentWidth;
      const scaleY = (svgRect.height - 2 * padding) / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      const centerX = (svgRect.width / 2) - ((minX + maxX) / 2) * scale;
      const centerY = (svgRect.height / 2) - ((minY + maxY) / 2) * scale;

      const transform = d3.zoomIdentity.translate(centerX, centerY).scale(scale);

      d3.select(svg)
        .transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, transform);
    }
  }, [nodes]);

  const resetZoom = useCallback(() => {
    if (!zoomBehaviorRef.current || !svgRef.current) return;

    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    zoomToFit,
    resetZoom,
  }), [zoomToFit, resetZoom]);

  // Always render interactive canvas (no original SVG underlay)
  return (
    <div
      className={clsx(
        'diagram-canvas-container',
        'relative w-full h-full overflow-hidden',
        className
      )}
    >
      <svg
        ref={svgRef}
        className="w-full h-full bg-white"
        onClick={handleCanvasClick}
        style={{
          background: 'transparent',
          cursor: 'default',
        }}
      >
        {/* Define arrow markers */}
        <ArrowMarkers />

        {/* Main content group - this is where zoom/pan transform is applied */}
        <g ref={mainGroupRef} className="main-content-group">
          {/* Dynamic background that expands/shrinks with content */}
          <rect
            x={viewport.bounds.x}
            y={viewport.bounds.y}
            width={viewport.bounds.width}
            height={viewport.bounds.height}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={1}
          />

          {/* Render edges first (behind nodes) */}
          {edges.map(edge => (
            <EdgeComponent
              key={edge.id}
              edge={edge}
              nodes={nodes}
            />
          ))}

          {/* Render nodes */}
          {nodes.map(node => (
            <NodeComponent
              key={node.id}
              node={node}
              onMove={handleNodeMove}
            />
          ))}
        </g>
      </svg>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">
        Drag boxes to edit - edges update automatically
      </div>
    </div>
  );
});

