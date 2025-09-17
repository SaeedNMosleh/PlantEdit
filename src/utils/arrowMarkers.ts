/**
 * Arrow marker utilities for SVG rendering
 */

// Define marker types
export type MarkerType =
  | 'arrow-default'
  | 'arrow-triangle'
  | 'arrow-triangle-open'
  | 'arrow-diamond'
  | 'arrow-diamond-filled'
  | 'arrow-open'
  | 'arrow-circle'
  | 'arrow-square'
  | 'arrow-plus'
  | 'arrow-dotted'
  | 'arrow-bidirectional';

// Helper function to get marker URL
export const getMarkerUrl = (marker: MarkerType): string => `url(#${marker})`;

// Predefined marker mappings for different edge types
export const EDGE_TYPE_MARKERS: Record<string, MarkerType> = {
  inheritance: 'arrow-triangle',
  realization: 'arrow-triangle-open',
  composition: 'arrow-diamond-filled',
  aggregation: 'arrow-diamond',
  dependency: 'arrow-open',
  association: 'arrow-default',
  extension: 'arrow-plus',
  bidirectional: 'arrow-bidirectional',
} as const;