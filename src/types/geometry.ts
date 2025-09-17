/**
 * Core geometry types for the diagram system
 */

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ViewportState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface ConnectionPoint {
  readonly position: Position;
  readonly direction: 'north' | 'south' | 'east' | 'west';
}

// Utility functions for geometry calculations
export const createPosition = (x: number, y: number): Position => ({ x, y });
export const createSize = (width: number, height: number): Size => ({ width, height });
export const createBoundingBox = (x: number, y: number, width: number, height: number): BoundingBox => ({ x, y, width, height });

// Type guards
export const isValidPosition = (pos: unknown): pos is Position => {
  return typeof pos === 'object' && pos !== null &&
         typeof (pos as Position).x === 'number' &&
         typeof (pos as Position).y === 'number';
};

export const isValidSize = (size: unknown): size is Size => {
  return typeof size === 'object' && size !== null &&
         typeof (size as Size).width === 'number' &&
         typeof (size as Size).height === 'number' &&
         (size as Size).width >= 0 && (size as Size).height >= 0;
};