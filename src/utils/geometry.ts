/**
 * Geometry utility functions with generics for type safety
 */

import { Position, Size, BoundingBox, Point, ConnectionPoint } from '@/types/geometry';

// Generic interfaces for objects with bounds
export interface HasPosition {
  readonly position: Position;
}

export interface HasSize {
  readonly size: Size;
}

export interface HasBounds extends HasPosition, HasSize {}

// Distance calculations
export const distance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const manhattanDistance = (p1: Point, p2: Point): number => {
  return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
};

// Bounding box calculations
export const getBoundingBox = <T extends HasBounds>(items: T[]): BoundingBox | null => {
  if (items.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  items.forEach(item => {
    const { position, size } = item;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + size.width);
    maxY = Math.max(maxY, position.y + size.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const expandBoundingBox = (box: BoundingBox, padding: number): BoundingBox => ({
  x: box.x - padding,
  y: box.y - padding,
  width: box.width + 2 * padding,
  height: box.height + 2 * padding,
});

// Point-in-bounds checks
export const isPointInBounds = <T extends HasBounds>(point: Point, item: T): boolean => {
  const { position, size } = item;
  return (
    point.x >= position.x &&
    point.x <= position.x + size.width &&
    point.y >= position.y &&
    point.y <= position.y + size.height
  );
};

export const isPointInBoundingBox = (point: Point, box: BoundingBox): boolean => {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
};

// Center calculations
export const getCenter = <T extends HasBounds>(item: T): Point => {
  const { position, size } = item;
  return {
    x: position.x + size.width / 2,
    y: position.y + size.height / 2,
  };
};

export const getCenterOfBounds = (box: BoundingBox): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

// Connection point calculations
export type ConnectionSide = 'north' | 'south' | 'east' | 'west';

export const getConnectionPoint = <T extends HasBounds>(
  item: T,
  side: ConnectionSide
): ConnectionPoint => {
  const { position, size } = item;

  switch (side) {
    case 'north':
      return {
        position: { x: position.x + size.width / 2, y: position.y },
        direction: 'north',
      };
    case 'south':
      return {
        position: { x: position.x + size.width / 2, y: position.y + size.height },
        direction: 'south',
      };
    case 'east':
      return {
        position: { x: position.x + size.width, y: position.y + size.height / 2 },
        direction: 'east',
      };
    case 'west':
      return {
        position: { x: position.x, y: position.y + size.height / 2 },
        direction: 'west',
      };
  }
};

export const getOptimalConnectionPoints = <T extends HasBounds>(
  source: T,
  target: T
): { source: ConnectionPoint; target: ConnectionPoint } => {
  const sourceCenter = getCenter(source);
  const targetCenter = getCenter(target);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // Determine primary direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      return {
        source: getConnectionPoint(source, 'east'),
        target: getConnectionPoint(target, 'west'),
      };
    } else {
      return {
        source: getConnectionPoint(source, 'west'),
        target: getConnectionPoint(target, 'east'),
      };
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      return {
        source: getConnectionPoint(source, 'south'),
        target: getConnectionPoint(target, 'north'),
      };
    } else {
      return {
        source: getConnectionPoint(source, 'north'),
        target: getConnectionPoint(target, 'south'),
      };
    }
  }
};

// Path generation
export const generateOrthogonalPath = (
  sourcePoint: Point,
  targetPoint: Point,
  style: 'horizontal-first' | 'vertical-first' = 'horizontal-first'
): string => {
  const { x: x1, y: y1 } = sourcePoint;
  const { x: x2, y: y2 } = targetPoint;

  if (style === 'horizontal-first') {
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  } else {
    const midY = y1 + (y2 - y1) / 2;
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }
};

export const generateDirectPath = (sourcePoint: Point, targetPoint: Point): string => {
  return `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
};

export const generateCurvedPath = (
  sourcePoint: Point,
  targetPoint: Point,
  curvature = 0.3
): string => {
  const { x: x1, y: y1 } = sourcePoint;
  const { x: x2, y: y2 } = targetPoint;

  const dx = x2 - x1;

  const cx1 = x1 + dx * curvature;
  const cy1 = y1;
  const cx2 = x2 - dx * curvature;
  const cy2 = y2;

  return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
};

// Collision detection
export const doBoxesOverlap = <T extends HasBounds, U extends HasBounds>(
  a: T,
  b: U
): boolean => {
  return !(
    a.position.x + a.size.width <= b.position.x ||
    b.position.x + b.size.width <= a.position.x ||
    a.position.y + a.size.height <= b.position.y ||
    b.position.y + b.size.height <= a.position.y
  );
};

// Transform utilities
export const translatePosition = (position: Position, delta: Position): Position => ({
  x: position.x + delta.x,
  y: position.y + delta.y,
});

export const scalePosition = (position: Position, scale: number): Position => ({
  x: position.x * scale,
  y: position.y * scale,
});

export const scaleSize = (size: Size, scale: number): Size => ({
  width: size.width * scale,
  height: size.height * scale,
});

// Snap to grid
export const snapToGrid = (position: Position, gridSize: number): Position => ({
  x: Math.round(position.x / gridSize) * gridSize,
  y: Math.round(position.y / gridSize) * gridSize,
});

// Find nearest items
export const findNearestItem = <T extends HasBounds>(
  point: Point,
  items: T[]
): T | null => {
  if (items.length === 0) return null;

  let nearest = items[0]!; // Safe because we checked length > 0
  let nearestDistance = distance(point, getCenter(nearest));

  for (let i = 1; i < items.length; i++) {
    const item = items[i]!; // Safe because i < items.length
    const itemDistance = distance(point, getCenter(item));
    if (itemDistance < nearestDistance) {
      nearest = item;
      nearestDistance = itemDistance;
    }
  }

  return nearest;
};

export const findItemsInRegion = <T extends HasBounds>(
  region: BoundingBox,
  items: T[]
): T[] => {
  return items.filter(item => doBoxesOverlap(item, {
    position: { x: region.x, y: region.y },
    size: { width: region.width, height: region.height },
  }));
};