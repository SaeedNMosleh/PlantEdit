/**
 * Result type pattern for type-safe error handling
 */

export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// Helper functions for creating results
export const createSuccess = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const createError = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Utility functions for working with results
export const isSuccess = <T, E>(result: Result<T, E>): result is { success: true; data: T } => {
  return result.success;
};

export const isError = <T, E>(result: Result<T, E>): result is { success: false; error: E } => {
  return !result.success;
};

export const mapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => U
): Result<U, E> => {
  if (isSuccess(result)) {
    return createSuccess(mapper(result.data));
  }
  return result as Result<U, E>;
};

export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => Result<U, E>
): Result<U, E> => {
  if (isSuccess(result)) {
    return mapper(result.data);
  }
  return result as Result<U, E>;
};

// Error types for different parts of the application
export class PlantUMLError extends Error {
  constructor(
    public readonly code: PlantUMLErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PlantUMLError';
  }
}

export type PlantUMLErrorCode =
  | 'INVALID_SYNTAX'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'PARSING_ERROR';

export class GraphError extends Error {
  constructor(
    public readonly code: GraphErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GraphError';
  }
}

export type GraphErrorCode =
  | 'NODE_NOT_FOUND'
  | 'EDGE_NOT_FOUND'
  | 'INVALID_CONNECTION'
  | 'DUPLICATE_ID'
  | 'VALIDATION_ERROR';

export class SVGParsingError extends Error {
  constructor(
    public readonly code: SVGParsingErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SVGParsingError';
  }
}

export type SVGParsingErrorCode =
  | 'INVALID_SVG'
  | 'MISSING_ELEMENTS'
  | 'MALFORMED_STRUCTURE'
  | 'UNSUPPORTED_FORMAT'
  | 'PARSING_ERROR';