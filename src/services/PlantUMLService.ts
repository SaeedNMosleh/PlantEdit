/**
 * PlantUML service using plantuml-encoder library
 */

import { encode } from 'plantuml-encoder';
import { PlantUMLServiceConfig, PlantUMLGenerationRequest, PlantUMLOptions } from '@/types/plantuml';
import { Result, createSuccess, createError, PlantUMLError } from '@/types/result';

export class PlantUMLService {
  private config: PlantUMLServiceConfig;

  constructor(config?: Partial<PlantUMLServiceConfig>) {
    this.config = {
      serverUrl: 'https://www.plantuml.com/plantuml',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
  }

  /**
   * Generate SVG from PlantUML source
   */
  async generateSVG(source: string, _options?: PlantUMLOptions): Promise<Result<string, PlantUMLError>> {
    try {
      const encoded = encode(source);
      const url = `${this.config.serverUrl}/svg/${encoded}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        return createError(new PlantUMLError(
          'SERVER_ERROR',
          `Server responded with ${response.status}: ${response.statusText}`,
          { status: response.status, statusText: response.statusText }
        ));
      }

      const svgText = await response.text();

      // Basic validation that we received SVG content
      if (!svgText.includes('<svg')) {
        return createError(new PlantUMLError(
          'INVALID_SYNTAX',
          'Response does not contain valid SVG content',
          { response: svgText }
        ));
      }

      return createSuccess(svgText);
    } catch (error) {
      return createError(new PlantUMLError(
        'NETWORK_ERROR',
        `Failed to generate SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      ));
    }
  }

  /**
   * Generate PNG from PlantUML source
   */
  async generatePNG(source: string, _options?: PlantUMLOptions): Promise<Result<Blob, PlantUMLError>> {
    try {
      const encoded = encode(source);
      const url = `${this.config.serverUrl}/png/${encoded}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        return createError(new PlantUMLError(
          'SERVER_ERROR',
          `Server responded with ${response.status}: ${response.statusText}`,
          { status: response.status, statusText: response.statusText }
        ));
      }

      const blob = await response.blob();

      // Validate that we received a PNG
      if (!blob.type.includes('image')) {
        return createError(new PlantUMLError(
          'INVALID_SYNTAX',
          'Response does not contain valid image content',
          { contentType: blob.type }
        ));
      }

      return createSuccess(blob);
    } catch (error) {
      return createError(new PlantUMLError(
        'NETWORK_ERROR',
        `Failed to generate PNG: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      ));
    }
  }

  /**
   * Generate diagram with format detection
   */
  async generateDiagram(request: PlantUMLGenerationRequest): Promise<Result<string | Blob, PlantUMLError>> {
    switch (request.format) {
      case 'svg':
        return this.generateSVG(request.source, request.options);
      case 'png':
        return this.generatePNG(request.source, request.options);
      case 'pdf':
        return this.generatePDF(request.source, request.options);
      default:
        return createError(new PlantUMLError(
          'INVALID_SYNTAX',
          `Unsupported format: ${request.format}`,
          { format: request.format }
        ));
    }
  }

  /**
   * Generate PDF from PlantUML source
   */
  private async generatePDF(source: string, _options?: PlantUMLOptions): Promise<Result<Blob, PlantUMLError>> {
    try {
      const encoded = encode(source);
      const url = `${this.config.serverUrl}/pdf/${encoded}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        return createError(new PlantUMLError(
          'SERVER_ERROR',
          `Server responded with ${response.status}: ${response.statusText}`,
          { status: response.status, statusText: response.statusText }
        ));
      }

      const blob = await response.blob();
      return createSuccess(blob);
    } catch (error) {
      return createError(new PlantUMLError(
        'NETWORK_ERROR',
        `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      ));
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'image/svg+xml,image/png,application/pdf,*/*',
            'User-Agent': 'PlantEdit/2.0.0',
          },
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff: wait 1s, 2s, 4s...
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Validate PlantUML syntax (basic check)
   */
  validateSyntax(source: string): Result<true, PlantUMLError> {
    const trimmed = source.trim();

    if (!trimmed) {
      return createError(new PlantUMLError(
        'INVALID_SYNTAX',
        'PlantUML source cannot be empty'
      ));
    }

    if (!trimmed.startsWith('@start') || !trimmed.includes('@end')) {
      return createError(new PlantUMLError(
        'INVALID_SYNTAX',
        'PlantUML source must start with @start and end with @end'
      ));
    }

    return createSuccess(true);
  }

  /**
   * Get encoded URL for sharing
   */
  getEncodedUrl(source: string, format: 'svg' | 'png' | 'pdf' = 'svg'): string {
    const encoded = encode(source);
    return `${this.config.serverUrl}/${format}/${encoded}`;
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<PlantUMLServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default service instance
export const plantUMLService = new PlantUMLService();