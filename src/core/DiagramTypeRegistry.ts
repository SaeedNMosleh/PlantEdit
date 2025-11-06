/**
 * Registry for diagram type handlers
 * Allows pluggable support for different PlantUML diagram types
 */

import { DiagramTypeHandler } from './types';

export class DiagramTypeRegistry {
  private handlers: Map<string, DiagramTypeHandler> = new Map();
  private defaultHandler: DiagramTypeHandler | null = null;

  /**
   * Register a diagram type handler
   */
  register(handler: DiagramTypeHandler): void {
    this.handlers.set(handler.name, handler);
  }

  /**
   * Set the default/fallback handler
   */
  setDefault(handler: DiagramTypeHandler): void {
    this.defaultHandler = handler;
  }

  /**
   * Get a specific handler by name
   */
  get(name: string): DiagramTypeHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Detect which handler should process the given SVG
   */
  detectHandler(svg: SVGElement): DiagramTypeHandler | null {
    // Try each registered handler
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(svg)) {
        return handler;
      }
    }

    // Fall back to default handler
    return this.defaultHandler;
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): DiagramTypeHandler[] {
    return Array.from(this.handlers.values());
  }
}

// Global singleton instance
export const diagramRegistry = new DiagramTypeRegistry();
