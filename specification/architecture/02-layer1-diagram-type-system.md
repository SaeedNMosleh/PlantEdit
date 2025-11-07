# Layer 1: Diagram Type System

> **Foundation Layer - SVG to Domain Model Transformation**

## 1. Overview

### 1.1 Purpose
Transform PlantUML SVG output into structured, editable diagram concepts that can be manipulated programmatically.

### 1.2 Core Responsibility
```
Input:  PlantUML SVG (presentation)
Output: Diagram Model (domain concepts)
```

### 1.3 Why This Layer Exists
- **Decoupling**: Separate PlantUML's SVG format from our domain model
- **Abstraction**: Work with diagram concepts, not SVG elements
- **Validation**: Ensure diagram structure is valid
- **Editability**: Define what can be modified and how
- **Testability**: Can test without any rendering

## 2. System Components

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PlantUML SVG Input                        │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Diagram Type        │
              │ Detector            │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │Activity │    │Sequence │    │ Class   │
    │Detector │    │Detector │    │Detector │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │ (Selected)
              ┌──────────▼──────────┐
              │ Diagram Type        │
              │ Registry            │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ Diagram Type        │
              │ Handler             │
              │ (e.g., Activity)    │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │Structure│    │ Parser  │    │Concepts │
    │  Def    │    │         │    │         │
    └─────────┘    └────┬────┘    └─────────┘
                        │
              ┌─────────▼─────────┐
              │  Diagram Model    │
              │  (Domain)         │
              └───────────────────┘
```

### 2.2 Directory Structure

```
src/diagram-types/
├── registry/
│   ├── DiagramTypeRegistry.ts       # Central registry
│   └── DiagramTypeRegistry.test.ts
│
├── detection/
│   ├── DiagramTypeDetector.ts       # Main detector
│   ├── detectors/
│   │   ├── ActivityDetector.ts
│   │   ├── SequenceDetector.ts
│   │   ├── ClassDetector.ts
│   │   └── GenericDetector.ts       # Fallback
│   └── __tests__/
│       ├── detector.test.ts
│       └── fixtures/                 # Sample SVGs for testing
│
├── core/
│   ├── DiagramType.ts               # Base interface
│   ├── DiagramModel.ts              # Domain model
│   ├── StructureDefinition.ts       # Structure format
│   └── EditabilityRules.ts          # Editability format
│
├── activity/
│   ├── structure.yaml               # SVG structure definition
│   ├── concepts.ts                  # Activity-specific concepts
│   ├── ActivityParser.ts            # Parser implementation
│   ├── editability.ts               # What can be edited
│   ├── ActivityType.ts              # Exports the type
│   └── __tests__/
│       ├── parser.test.ts
│       └── fixtures/
│           ├── simple-activity.svg
│           ├── with-decisions.svg
│           ├── nested-branches.svg
│           └── fork-join.svg
│
├── sequence/
│   └── ...                          # Same structure
│
└── class/
    └── ...                          # Same structure
```

## 3. Core Interfaces

### 3.1 DiagramType Interface

```typescript
/**
 * Represents a specific type of PlantUML diagram
 * Each diagram type implements this interface
 */
interface DiagramType {
  /**
   * Unique identifier for this diagram type
   * @example 'activity', 'sequence', 'class'
   */
  readonly name: string;

  /**
   * Human-readable name
   * @example 'Activity Diagram', 'Sequence Diagram'
   */
  readonly displayName: string;

  /**
   * Version of the structure definition
   */
  readonly version: string;

  /**
   * Determines if this diagram type can handle the given SVG
   * @param svg - The SVG element to check
   * @returns true if this type can parse the SVG
   */
  canHandle(svg: SVGElement): boolean;

  /**
   * Parse SVG into a diagram model
   * @param svg - The SVG element to parse
   * @returns Structured diagram model
   * @throws ParseError if SVG structure is invalid
   */
  parse(svg: SVGElement): DiagramModel;

  /**
   * Get the structure definition for this diagram type
   * Useful for documentation and validation
   */
  getStructure(): StructureDefinition;

  /**
   * Get editability rules for this diagram type
   * Defines what can be edited and how
   */
  getEditability(): EditabilityRules;

  /**
   * Validate a diagram model for this type
   * @param model - The diagram model to validate
   * @returns Validation result with errors if any
   */
  validate(model: DiagramModel): ValidationResult;
}
```

### 3.2 DiagramModel Interface

```typescript
/**
 * Universal diagram representation
 * All diagram types produce this structure
 */
interface DiagramModel {
  /** Type of diagram */
  type: string;

  /** All nodes in the diagram */
  nodes: DiagramNode[];

  /** All edges/connections in the diagram */
  edges: DiagramEdge[];

  /** Diagram metadata */
  metadata: DiagramMetadata;

  /** Original SVG for reference */
  originalSVG?: string;
}

interface DiagramNode {
  /** Unique identifier */
  id: string;

  /** Node type (e.g., 'action', 'decision', 'class') */
  type: string;

  /** Display label */
  label: string;

  /** Position in diagram */
  position: Point;

  /** Size of the node */
  size: Size;

  /** Type-specific data */
  data: Record<string, any>;

  /** Reference to original SVG element */
  svgElement?: SVGElement;
}

interface DiagramEdge {
  /** Unique identifier */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Edge type (e.g., 'transition', 'message', 'association') */
  type: string;

  /** Optional label */
  label?: string;

  /** Type-specific data */
  data: Record<string, any>;

  /** Reference to original SVG element */
  svgElement?: SVGElement;
}

interface DiagramMetadata {
  /** Diagram title if specified */
  title?: string;

  /** Layout direction (e.g., 'TB', 'LR') */
  direction?: string;

  /** Original SVG dimensions */
  dimensions?: {
    width: number;
    height: number;
    viewBox?: string;
  };

  /** Diagram-specific metadata */
  [key: string]: any;
}
```

### 3.3 StructureDefinition Format

```yaml
# structure.yaml - Documents PlantUML's SVG structure

name: "Activity Diagram"
version: "1.0"
plantuml_version: "1.2024.x"

# Description of how PlantUML generates SVG for this diagram type
description: |
  Activity diagrams use specific SVG patterns:
  - Start/end nodes are small ellipses (rx=11, ry=11)
  - Actions are rounded rectangles (rx=12.5, ry=12.5)
  - Decisions are 4-point polygons

# Node type definitions
nodes:
  # Start and End nodes
  start_end:
    selector: "ellipse[rx='11'][ry='11']"
    description: "Start and end nodes"
    type: "start_end"
    properties:
      - name: "fill"
        cssSelector: "fill"
        description: "Fill color (black for end, white for start)"
    editable: true

  # Action nodes
  action:
    selector: "g > rect[rx='12.5'][ry='12.5']"
    description: "Action/activity boxes"
    type: "action"
    has_text: true
    text_selector: "text"
    editable: true

  # Decision nodes
  decision:
    selector: "polygon"
    filter: "has 4 or 5 points"  # 5 if first point repeated
    description: "Decision diamond"
    type: "decision"
    has_text: true
    editable: true

# Edge type definitions
edges:
  transition:
    selector: "path[d*='M']"
    description: "Transitions between nodes"
    source_detection: "path_start_coordinates"
    target_detection: "path_end_coordinates"
    label_selector: "text"

# Grouping and hierarchy
groups:
  partition:
    selector: "g[class*='partition']"
    description: "Swimlane partitions"

# Special elements
notes:
  selector: "rect[class='note']"
  description: "Note annotations"
```

### 3.4 EditabilityRules Format

```typescript
interface EditabilityRules {
  /** Rules for nodes by type */
  nodes: {
    [nodeType: string]: NodeEditability;
  };

  /** Rules for edges */
  edges: EdgeEditability;

  /** Diagram-level constraints */
  constraints?: DiagramConstraints;
}

interface NodeEditability {
  /** Can the node be moved? */
  movable: boolean;

  /** Can the node be resized? */
  resizable: boolean;

  /** Can the node be deleted? */
  deletable: boolean;

  /** Can new edges be connected to this node? */
  connectable: boolean;

  /** Which properties can be edited? */
  editableProperties?: string[];

  /** Custom constraints */
  constraints?: {
    /** Only allow horizontal movement */
    horizontalOnly?: boolean;

    /** Only allow vertical movement */
    verticalOnly?: boolean;

    /** Minimum size */
    minSize?: Size;

    /** Maximum size */
    maxSize?: Size;

    /** Snap to grid */
    snapToGrid?: boolean;
  };
}

interface EdgeEditability {
  /** Can edges be added manually? */
  addable: boolean;

  /** Can edges be deleted? */
  deletable: boolean;

  /** Can edge labels be edited? */
  labelEditable: boolean;

  /** Can edge routes be modified? */
  routeEditable: boolean;
}

interface DiagramConstraints {
  /** Validation function */
  validate?: (model: DiagramModel) => ValidationResult;

  /** Required nodes */
  requiredNodes?: {
    [nodeType: string]: {
      min?: number;
      max?: number;
    };
  };

  /** Custom rules */
  customRules?: ValidationRule[];
}
```

## 4. Diagram Type Implementation

### 4.1 Activity Diagram Example

```typescript
// activity/ActivityType.ts

import { DiagramType, DiagramModel, StructureDefinition, EditabilityRules } from '../core';
import { ActivityParser } from './ActivityParser';
import { activityEditability } from './editability';
import structureDefinition from './structure.yaml';

export class ActivityDiagramType implements DiagramType {
  readonly name = 'activity';
  readonly displayName = 'Activity Diagram';
  readonly version = '1.0';

  private parser: ActivityParser;

  constructor() {
    this.parser = new ActivityParser();
  }

  canHandle(svg: SVGElement): boolean {
    // Activity diagrams have characteristic patterns:
    // 1. Small ellipses for start/end (rx="11", ry="11")
    const hasStartEnd = svg.querySelector('ellipse[rx="11"][ry="11"]') !== null;

    // 2. Rounded rectangles for actions (rx="12.5")
    const hasActions = svg.querySelector('rect[rx="12.5"]') !== null;

    // Need at least one of these to be confident
    return hasStartEnd || hasActions;
  }

  parse(svg: SVGElement): DiagramModel {
    return this.parser.parse(svg);
  }

  getStructure(): StructureDefinition {
    return structureDefinition;
  }

  getEditability(): EditabilityRules {
    return activityEditability;
  }

  validate(model: DiagramModel): ValidationResult {
    const errors: string[] = [];

    // Activity diagrams should have exactly one start
    const startNodes = model.nodes.filter(n => n.type === 'start_end' && n.data.isStart);
    if (startNodes.length === 0) {
      errors.push('Activity diagram must have a start node');
    } else if (startNodes.length > 1) {
      errors.push('Activity diagram can only have one start node');
    }

    // Should have at least one end
    const endNodes = model.nodes.filter(n => n.type === 'start_end' && n.data.isEnd);
    if (endNodes.length === 0) {
      errors.push('Activity diagram should have at least one end node');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 4.2 Parser Implementation

```typescript
// activity/ActivityParser.ts

export class ActivityParser {
  parse(svg: SVGElement): DiagramModel {
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];

    // Parse different node types
    nodes.push(...this.parseStartEndNodes(svg));
    nodes.push(...this.parseActionNodes(svg));
    nodes.push(...this.parseDecisionNodes(svg));
    nodes.push(...this.parseForkJoinNodes(svg));

    // Parse edges
    edges.push(...this.parseTransitions(svg, nodes));

    // Extract metadata
    const metadata = this.parseMetadata(svg);

    return {
      type: 'activity',
      nodes,
      edges,
      metadata,
      originalSVG: svg.outerHTML
    };
  }

  private parseStartEndNodes(svg: SVGElement): DiagramNode[] {
    const nodes: DiagramNode[] = [];
    const ellipses = svg.querySelectorAll('ellipse[rx="11"][ry="11"]');

    ellipses.forEach((ellipse, index) => {
      const el = ellipse as SVGEllipseElement;

      // Determine if start or end based on fill
      const fill = el.getAttribute('fill') || '';
      const isEnd = fill === 'black' || fill === '#000000';

      nodes.push({
        id: this.generateId('start_end', index),
        type: 'start_end',
        label: isEnd ? 'end' : 'start',
        position: {
          x: parseFloat(el.getAttribute('cx') || '0') - 11,
          y: parseFloat(el.getAttribute('cy') || '0') - 11
        },
        size: { width: 22, height: 22 },
        data: {
          isStart: !isEnd,
          isEnd: isEnd,
          fill: fill
        },
        svgElement: el
      });
    });

    return nodes;
  }

  private parseActionNodes(svg: SVGElement): DiagramNode[] {
    const nodes: DiagramNode[] = [];
    const rects = svg.querySelectorAll('rect[rx="12.5"]');

    rects.forEach((rect, index) => {
      const el = rect as SVGRectElement;
      const parent = el.parentElement;

      // Get text label
      const textElement = parent?.querySelector('text');
      const label = textElement?.textContent?.trim() || '';

      nodes.push({
        id: this.generateId('action', index),
        type: 'action',
        label: label,
        position: {
          x: parseFloat(el.getAttribute('x') || '0'),
          y: parseFloat(el.getAttribute('y') || '0')
        },
        size: {
          width: parseFloat(el.getAttribute('width') || '0'),
          height: parseFloat(el.getAttribute('height') || '0')
        },
        data: {},
        svgElement: el
      });
    });

    return nodes;
  }

  private parseDecisionNodes(svg: SVGElement): DiagramNode[] {
    const nodes: DiagramNode[] = [];
    const polygons = svg.querySelectorAll('polygon');

    polygons.forEach((polygon, index) => {
      const points = polygon.getAttribute('points') || '';
      const pointArray = points.split(' ').filter(p => p.trim());

      // Decision nodes are 4-point diamonds (sometimes 5 if first point repeated)
      if (pointArray.length === 4 || pointArray.length === 5) {
        const parent = polygon.parentElement;
        const textElement = parent?.querySelector('text');
        const label = textElement?.textContent?.trim() || '';

        // Calculate bounding box
        const coords = pointArray.map(p => {
          const [x, y] = p.split(',').map(parseFloat);
          return { x, y };
        });

        const xs = coords.map(c => c.x);
        const ys = coords.map(c => c.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        nodes.push({
          id: this.generateId('decision', index),
          type: 'decision',
          label: label,
          position: { x: minX, y: minY },
          size: {
            width: maxX - minX,
            height: maxY - minY
          },
          data: {
            points: points
          },
          svgElement: polygon
        });
      }
    });

    return nodes;
  }

  private generateId(type: string, index: number): string {
    return `${type}-${index}-${Date.now()}`;
  }

  // ... other parsing methods
}
```

## 5. Diagram Type Registry

### 5.1 Registry Implementation

```typescript
// registry/DiagramTypeRegistry.ts

export class DiagramTypeRegistry {
  private types: Map<string, DiagramType> = new Map();
  private defaultType?: DiagramType;

  /**
   * Register a diagram type
   */
  register(type: DiagramType): void {
    if (this.types.has(type.name)) {
      throw new Error(`Diagram type '${type.name}' is already registered`);
    }
    this.types.set(type.name, type);
  }

  /**
   * Set the default/fallback diagram type
   */
  setDefault(type: DiagramType): void {
    this.defaultType = type;
  }

  /**
   * Get a diagram type by name
   */
  get(name: string): DiagramType | undefined {
    return this.types.get(name);
  }

  /**
   * Get all registered diagram types
   */
  getAll(): DiagramType[] {
    return Array.from(this.types.values());
  }

  /**
   * Check if a diagram type is registered
   */
  has(name: string): boolean {
    return this.types.has(name);
  }

  /**
   * Get the default diagram type
   */
  getDefault(): DiagramType | undefined {
    return this.defaultType;
  }
}

// Global registry instance
export const diagramTypeRegistry = new DiagramTypeRegistry();
```

### 5.2 Registration

```typescript
// Initialize registry (in app startup)
import { diagramTypeRegistry } from './registry/DiagramTypeRegistry';
import { ActivityDiagramType } from './activity/ActivityType';
import { SequenceDiagramType } from './sequence/SequenceType';
import { GenericDiagramType } from './generic/GenericType';

// Register specific diagram types
diagramTypeRegistry.register(new ActivityDiagramType());
diagramTypeRegistry.register(new SequenceDiagramType());

// Set fallback
diagramTypeRegistry.setDefault(new GenericDiagramType());
```

## 6. Diagram Type Detection

### 6.1 Detector Implementation

```typescript
// detection/DiagramTypeDetector.ts

export class DiagramTypeDetector {
  constructor(private registry: DiagramTypeRegistry) {}

  /**
   * Detect which diagram type can handle the given SVG
   */
  detect(svg: SVGElement): DiagramType | null {
    // Try each registered type
    for (const type of this.registry.getAll()) {
      if (type.canHandle(svg)) {
        return type;
      }
    }

    // Fall back to default
    return this.registry.getDefault() || null;
  }

  /**
   * Get confidence scores for each diagram type
   * Useful for debugging and logging
   */
  detectWithConfidence(svg: SVGElement): Array<{
    type: DiagramType;
    confidence: number;
  }> {
    // Implementation that returns confidence scores
    // Could be enhanced to provide more detailed detection
  }
}
```

## 7. Testing Strategy

### 7.1 Test Structure

```typescript
// activity/__tests__/parser.test.ts

describe('ActivityParser', () => {
  let parser: ActivityParser;

  beforeEach(() => {
    parser = new ActivityParser();
  });

  describe('parseStartEndNodes', () => {
    it('should parse start node correctly', () => {
      const svg = loadFixture('simple-activity.svg');
      const model = parser.parse(svg);

      const startNodes = model.nodes.filter(n =>
        n.type === 'start_end' && n.data.isStart
      );

      expect(startNodes).toHaveLength(1);
      expect(startNodes[0].label).toBe('start');
    });

    it('should parse end node correctly', () => {
      const svg = loadFixture('simple-activity.svg');
      const model = parser.parse(svg);

      const endNodes = model.nodes.filter(n =>
        n.type === 'start_end' && n.data.isEnd
      );

      expect(endNodes).toHaveLength(1);
      expect(endNodes[0].label).toBe('end');
    });
  });

  describe('parseActionNodes', () => {
    it('should extract action labels', () => {
      const svg = loadFixture('with-actions.svg');
      const model = parser.parse(svg);

      const actions = model.nodes.filter(n => n.type === 'action');

      expect(actions).toHaveLength(3);
      expect(actions[0].label).toBe('Read Input');
      expect(actions[1].label).toBe('Process');
      expect(actions[2].label).toBe('Save');
    });
  });

  describe('parseDecisionNodes', () => {
    it('should parse decision diamonds', () => {
      const svg = loadFixture('with-decisions.svg');
      const model = parser.parse(svg);

      const decisions = model.nodes.filter(n => n.type === 'decision');

      expect(decisions).toHaveLength(1);
      expect(decisions[0].label).toContain('Valid?');
    });
  });
});
```

### 7.2 Fixture Management

```
activity/__tests__/fixtures/
├── simple-activity.svg          # Basic start → action → end
├── with-decisions.svg           # Includes decision diamonds
├── nested-branches.svg          # Nested if statements
├── fork-join.svg                # Parallel execution
└── complex-activity.svg         # Real-world complex example
```

## 8. Error Handling

### 8.1 Parse Errors

```typescript
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly diagramType: string,
    public readonly elementType: string,
    public readonly element?: SVGElement
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

// Usage in parser
if (!startNode) {
  throw new ParseError(
    'Activity diagram must have a start node',
    'activity',
    'start_end'
  );
}
```

### 8.2 Validation Errors

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}
```

## 9. Performance Considerations

### 9.1 Lazy Loading

```typescript
// Load diagram types on demand
const registry = new LazyDiagramTypeRegistry();

registry.registerLazy('activity', () => import('./activity/ActivityType'));
registry.registerLazy('sequence', () => import('./sequence/SequenceType'));
```

### 9.2 Caching

```typescript
// Cache parsed results
class CachingParser {
  private cache = new Map<string, DiagramModel>();

  parse(svg: SVGElement): DiagramModel {
    const key = this.generateKey(svg);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const model = this.actualParse(svg);
    this.cache.set(key, model);
    return model;
  }
}
```

## 10. Next Steps

1. Review this specification
2. Implement core interfaces
3. Start with Activity Diagram implementation
4. Write comprehensive tests
5. Validate before moving to Layer 2

---

**Version**: 1.0
**Status**: Ready for Implementation
**Next Document**: [Activity Diagram Specification](../diagram-types/activity-diagram.md)
