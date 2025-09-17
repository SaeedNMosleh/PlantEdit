/**
 * ArrowMarkers - SVG marker definitions for automatic arrow orientation
 * This completely eliminates manual polygon calculation and arrow rotation issues
 */

import React from 'react';

export const ArrowMarkers: React.FC = () => {
  return (
    <defs>
      {/* Default arrow marker */}
      <marker
        id="arrow-default"
        viewBox="0 0 10 10"
        refX="9"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
      </marker>

      {/* Triangle arrow for inheritance */}
      <marker
        id="arrow-triangle"
        viewBox="0 0 10 10"
        refX="8"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill="white" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Open triangle for realization */}
      <marker
        id="arrow-triangle-open"
        viewBox="0 0 10 10"
        refX="8"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill="none" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Diamond for composition */}
      <marker
        id="arrow-diamond-filled"
        viewBox="0 0 12 8"
        refX="11"
        refY="4"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,4 L4,0 L8,4 L4,8 z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Open diamond for aggregation */}
      <marker
        id="arrow-diamond"
        viewBox="0 0 12 8"
        refX="11"
        refY="4"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,4 L4,0 L8,4 L4,8 z" fill="white" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Open arrow for dependency */}
      <marker
        id="arrow-open"
        viewBox="0 0 10 10"
        refX="9"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L9,3 L0,6" fill="none" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Circle marker */}
      <marker
        id="arrow-circle"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <circle cx="5" cy="5" r="3" fill="white" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Plus marker for extensions */}
      <marker
        id="arrow-plus"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <circle cx="5" cy="5" r="4" fill="white" stroke="currentColor" strokeWidth="1" />
        <path d="M2,5 L8,5 M5,2 L5,8" stroke="currentColor" strokeWidth="1" />
      </marker>

      {/* Custom markers for specific PlantUML edge types */}

      {/* Dotted line end marker */}
      <marker
        id="arrow-dotted"
        viewBox="0 0 10 10"
        refX="9"
        refY="3"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill="currentColor" opacity="0.7" />
      </marker>

      {/* Bidirectional arrow */}
      <marker
        id="arrow-bidirectional"
        viewBox="0 0 20 10"
        refX="10"
        refY="5"
        markerWidth="12"
        markerHeight="8"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,5 L6,0 L6,3 L14,3 L14,0 L20,5 L14,10 L14,7 L6,7 L6,10 z" fill="currentColor" />
      </marker>

      {/* Drop shadow filter for selected edges */}
      <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      {/* Drop shadow for nodes */}
      <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.2"/>
      </filter>
    </defs>
  );
};

