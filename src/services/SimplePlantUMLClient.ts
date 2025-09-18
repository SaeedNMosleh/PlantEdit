/**
 * Simple PlantUML client - just fetches SVG from server
 */

import { encode } from 'plantuml-encoder';

export class SimplePlantUMLClient {
  private serverUrl = 'https://www.plantuml.com/plantuml';

  async getSVG(plantumlSource: string): Promise<string> {
    const encoded = encode(plantumlSource);
    const url = `${this.serverUrl}/svg/${encoded}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch diagram: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }
}

export const plantUMLClient = new SimplePlantUMLClient();