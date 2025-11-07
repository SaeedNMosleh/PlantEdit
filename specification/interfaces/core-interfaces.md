# Core Interfaces

> **Type Definitions for PlantEdit System**

This document contains all TypeScript interface definitions for the PlantEdit system. These interfaces form the contracts between components and should be implemented exactly as specified.

## 1. Diagram Type Interfaces

### 1.1 DiagramType

The main interface that all diagram type implementations must satisfy.

```typescript
/**
 * Represents a specific type of PlantUML diagram (Activity, Sequence, Class, etc.)
 *
 * Each diagram type provides:
 * - Detection logic to identify if it can handle an SVG
 * - Parsing logic to convert SVG to DiagramModel
 * - Structure definition documenting SVG format
 * - Editability rules defining what can be modified
 * - Validation logic to ensure diagram correctness
 */
interface DiagramType {
  /**
   * Unique identifier for this diagram type
   * Must be lowercase, alphanumeric with hyphens
   * @example 'activity', 'sequence', 'class-diagram'
   */
  readonly name: string;

  /**
   * Human-readable display name
   * @example 'Activity Diagram', 'Sequence Diagram'
   */
  readonly displayName: string;

  /**
   * Version of this diagram type implementation
   * Follows semantic versioning
   * @example '1.0.0', '2.1.3'
   */
  readonly version: string;

  /**
   * Determines if this diagram type can handle the given SVG
   *
   * This method should examine the SVG structure and return true
   * if it recognizes patterns specific to this diagram type.
   *
   * Important: Should be fast as it's called for detection
   *
   * @param svg - The SVG element to examine
   * @returns true if this type can parse the SVG, false otherwise
   */
  canHandle(svg: SVGElement): boolean;

  /**
   * Parse SVG into a structured diagram model
   *
   * This is the main parsing logic that extracts diagram concepts
   * from PlantUML's SVG output.
   *
   * @param svg - The SVG element to parse
   * @returns Structured diagram model
   * @throws {ParseError} if SVG structure is invalid or unexpected
   */
  parse(svg: SVGElement): DiagramModel;

  /**
   * Get the structure definition for this diagram type
   *
   * Returns documentation of how PlantUML generates SVG for
   * this diagram type. Useful for:
   * - Documentation
   * - Debugging parsing issues
   * - Version compatibility checks
   *
   * @returns Structure definition object
   */
  getStructure(): StructureDefinition;

  /**
   * Get editability rules for this diagram type
   *
   * Defines what elements can be edited and how.
   * These rules are used by the rendering layer to
   * enable/disable editing features.
   *
   * @returns Editability rules object
   */
  getEditability(): EditabilityRules;

  /**
   * Validate a diagram model
   *
   * Checks if the diagram model is valid for this type.
   * Examples of validation:
   * - Activity diagrams must have exactly one start node
   * - Sequence diagrams must have at least two participants
   * - Class diagrams can't have circular inheritance
   *
   * @param model - The diagram model to validate
   * @returns Validation result with any errors found
   */
  validate(model: DiagramModel): ValidationResult;
}
```

### 1.2 DiagramModel

The universal representation of any diagram.

```typescript
/**
 * Universal diagram representation
 *
 * All diagram types parse SVG into this common structure.
 * This allows the rendering layer to be diagram-type agnostic.
 */
interface DiagramModel {
  /**
   * Type of diagram
   * Must match a registered DiagramType.name
   * @example 'activity', 'sequence'
   */
  type: string;

  /**
   * All nodes/elements in the diagram
   * Order may matter for some diagram types
   */
  nodes: DiagramNode[];

  /**
   * All edges/connections between nodes
   */
  edges: DiagramEdge[];

  /**
   * Diagram-level metadata
   */
  metadata: DiagramMetadata;

  /**
   * Original SVG for reference
   * Useful for debugging and export
   */
  originalSVG?: string;

  /**
   * Parsing timestamp
   * When this model was created
   */
  parsedAt?: Date;
}
```

### 1.3 DiagramNode

Represents a single node/element in a diagram.

```typescript
/**
 * A node in the diagram
 *
 * Nodes represent diagram elements like:
 * - Actions in activity diagrams
 * - Classes in class diagrams
 * - Participants in sequence diagrams
 * - States in state diagrams
 */
interface DiagramNode {
  /**
   * Unique identifier within this diagram
   * Must be stable across re-parses when possible
   */
  id: string;

  /**
   * Node type specific to the diagram type
   * @example For activity: 'action', 'decision', 'start_end'
   * @example For class: 'class', 'interface', 'enum'
   */
  type: string;

  /**
   * Display label/text
   * May contain newlines for multi-line labels
   */
  label: string;

  /**
   * Position in the diagram coordinate space
   * Origin is top-left (0, 0)
   */
  position: Point;

  /**
   * Size of the node
   */
  size: Size;

  /**
   * Node-type-specific data
   * Contents depend on diagram type and node type
   *
   * @example For activity action: { }
   * @example For class: { attributes: string[], methods: string[] }
   * @example For sequence participant: { lifeline: boolean }
   */
  data: Record<string, any>;

  /**
   * Reference to original SVG element
   * Useful for debugging and advanced use cases
   * May be undefined if node was synthesized
   */
  svgElement?: SVGElement;

  /**
   * Parent node ID if this node is nested
   * @example Nodes inside a partition/swimlane
   */
  parent?: string;

  /**
   * Z-index for rendering order
   * Higher numbers render on top
   */
  zIndex?: number;
}
```

### 1.4 DiagramEdge

Represents a connection between nodes.

```typescript
/**
 * An edge/connection in the diagram
 *
 * Edges represent connections like:
 * - Transitions in activity diagrams
 * - Messages in sequence diagrams
 * - Associations in class diagrams
 * - Transitions in state diagrams
 */
interface DiagramEdge {
  /**
   * Unique identifier within this diagram
   */
  id: string;

  /**
   * Source node ID
   * Must reference an existing node
   */
  source: string;

  /**
   * Target node ID
   * Must reference an existing node
   */
  target: string;

  /**
   * Edge type specific to the diagram type
   * @example For activity: 'transition'
   * @example For class: 'association', 'inheritance', 'composition'
   * @example For sequence: 'message', 'return'
   */
  type: string;

  /**
   * Optional label on the edge
   * @example Condition on activity transition: "valid?"
   * @example Message name in sequence diagram
   */
  label?: string;

  /**
   * Edge-type-specific data
   * @example For sequence message: { synchronous: true, return: false }
   * @example For class relationship: { multiplicity: '1..*' }
   */
  data: Record<string, any>;

  /**
   * Path points for custom routing
   * If undefined, renderer should auto-route
   */
  points?: Point[];

  /**
   * Reference to original SVG element
   */
  svgElement?: SVGElement;

  /**
   * Edge direction
   * Some diagram types have bidirectional edges
   */
  bidirectional?: boolean;

  /**
   * Visual style hints
   */
  style?: {
    /** Dashed line */
    dashed?: boolean;
    /** Line color */
    color?: string;
    /** Arrow style */
    arrowType?: 'normal' | 'open' | 'diamond' | 'none';
  };
}
```

## 2. Supporting Types

### 2.1 Geometry Types

```typescript
/**
 * A point in 2D space
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Size in 2D space
 */
interface Size {
  width: number;
  height: number;
}

/**
 * A rectangle in 2D space
 */
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 2.2 Metadata Types

```typescript
/**
 * Diagram metadata
 */
interface DiagramMetadata {
  /**
   * Diagram title if specified in PlantUML
   */
  title?: string;

  /**
   * Layout direction
   * @example 'TB' (top-to-bottom), 'LR' (left-to-right)
   */
  direction?: 'TB' | 'LR' | 'RL' | 'BT';

  /**
   * Original SVG dimensions
   */
  dimensions?: {
    width: number;
    height: number;
    viewBox?: string;
  };

  /**
   * Diagram type-specific metadata
   * Contents depend on diagram type
   */
  [key: string]: any;
}
```

## 3. Structure Definition Interfaces

### 3.1 StructureDefinition

```typescript
/**
 * Documents how PlantUML generates SVG for a diagram type
 *
 * This is typically loaded from a YAML file but represented
 * as TypeScript for type safety.
 */
interface StructureDefinition {
  /** Name of diagram type */
  name: string;

  /** Version of this structure definition */
  version: string;

  /** PlantUML version this is based on */
  plantumlVersion: string;

  /** Human-readable description */
  description: string;

  /** Node type definitions */
  nodes: {
    [nodeType: string]: NodeStructure;
  };

  /** Edge type definitions */
  edges: {
    [edgeType: string]: EdgeStructure;
  };

  /** Group/container definitions */
  groups?: {
    [groupType: string]: GroupStructure;
  };

  /** Special element definitions */
  notes?: ElementStructure;
}

interface NodeStructure {
  /** CSS selector to find this node type in SVG */
  selector: string;

  /** Additional filter logic description */
  filter?: string;

  /** Human-readable description */
  description: string;

  /** Node type identifier */
  type: string;

  /** Whether this node typically has text */
  hasText?: boolean;

  /** Selector for text element */
  textSelector?: string;

  /** Properties available on this node type */
  properties?: PropertyDefinition[];

  /** Whether this node is editable by default */
  editable?: boolean;
}

interface EdgeStructure {
  /** CSS selector */
  selector: string;

  /** Description */
  description: string;

  /** How to determine source node */
  sourceDetection: string;

  /** How to determine target node */
  targetDetection: string;

  /** Selector for edge label */
  labelSelector?: string;
}

interface GroupStructure {
  /** CSS selector */
  selector: string;

  /** Description */
  description: string;
}

interface ElementStructure {
  /** CSS selector */
  selector: string;

  /** Description */
  description: string;
}

interface PropertyDefinition {
  /** Property name */
  name: string;

  /** CSS selector or attribute name */
  cssSelector: string;

  /** Description */
  description: string;

  /** Default value if any */
  defaultValue?: any;
}
```

## 4. Editability Interfaces

### 4.1 EditabilityRules

```typescript
/**
 * Defines what can be edited in a diagram
 */
interface EditabilityRules {
  /**
   * Rules for each node type
   * Key is the node type name
   */
  nodes: {
    [nodeType: string]: NodeEditability;
  };

  /**
   * Rules for edges
   */
  edges: EdgeEditability;

  /**
   * Diagram-level constraints
   */
  constraints?: DiagramConstraints;
}
```

### 4.2 NodeEditability

```typescript
/**
 * Editability rules for a specific node type
 */
interface NodeEditability {
  /**
   * Can the node be moved?
   * If false, position is fixed
   */
  movable: boolean;

  /**
   * Can the node be resized?
   * If false, size is fixed
   */
  resizable: boolean;

  /**
   * Can the node be deleted?
   */
  deletable: boolean;

  /**
   * Can new edges be connected to/from this node?
   */
  connectable: boolean;

  /**
   * Which node properties can be edited
   * @example ['label', 'color', 'style']
   */
  editableProperties?: string[];

  /**
   * Movement constraints
   */
  movementConstraints?: {
    /** Only allow horizontal movement */
    horizontalOnly?: boolean;

    /** Only allow vertical movement */
    verticalOnly?: boolean;

    /** Bounds for movement */
    bounds?: Rectangle;

    /** Snap to grid */
    snapToGrid?: boolean;

    /** Grid size if snapping */
    gridSize?: number;
  };

  /**
   * Size constraints
   */
  sizeConstraints?: {
    /** Minimum size */
    minSize?: Size;

    /** Maximum size */
    maxSize?: Size;

    /** Maintain aspect ratio */
    fixedAspectRatio?: boolean;
  };
}
```

### 4.3 EdgeEditability

```typescript
/**
 * Editability rules for edges
 */
interface EdgeEditability {
  /**
   * Can edges be added manually?
   */
  addable: boolean;

  /**
   * Can edges be deleted?
   */
  deletable: boolean;

  /**
   * Can edge labels be edited?
   */
  labelEditable: boolean;

  /**
   * Can edge routes be modified?
   * If true, user can add/move waypoints
   */
  routeEditable: boolean;

  /**
   * Can edge style be changed?
   */
  styleEditable?: boolean;
}
```

### 4.4 DiagramConstraints

```typescript
/**
 * Diagram-level validation constraints
 */
interface DiagramConstraints {
  /**
   * Required node counts
   * @example Activity diagrams must have exactly 1 start node
   */
  requiredNodes?: {
    [nodeType: string]: {
      min?: number;
      max?: number;
    };
  };

  /**
   * Custom validation rules
   */
  customRules?: ValidationRule[];
}

interface ValidationRule {
  /** Rule identifier */
  id: string;

  /** Human-readable description */
  description: string;

  /** Validation function */
  validate: (model: DiagramModel) => boolean;

  /** Error message if validation fails */
  errorMessage: string;
}
```

## 5. Validation Interfaces

### 5.1 ValidationResult

```typescript
/**
 * Result of validation
 */
interface ValidationResult {
  /**
   * Whether the diagram is valid
   */
  valid: boolean;

  /**
   * Errors found (empty if valid)
   */
  errors: ValidationError[];

  /**
   * Warnings (non-fatal issues)
   */
  warnings?: ValidationWarning[];
}

interface ValidationError {
  /**
   * Error code for programmatic handling
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Severity level
   */
  severity: 'error' | 'critical';

  /**
   * Node ID if error relates to specific node
   */
  nodeId?: string;

  /**
   * Edge ID if error relates to specific edge
   */
  edgeId?: string;

  /**
   * Suggested fix if available
   */
  suggestion?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}
```

## 6. Error Interfaces

### 6.1 ParseError

```typescript
/**
 * Error thrown during parsing
 */
class ParseError extends Error {
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
```

### 6.2 ValidationError

```typescript
/**
 * Error thrown during validation
 */
class DiagramValidationError extends Error {
  constructor(
    message: string,
    public readonly result: ValidationResult
  ) {
    super(message);
    this.name = 'DiagramValidationError';
  }
}
```

## 7. Registry Interfaces

### 7.1 DiagramTypeRegistry

```typescript
/**
 * Central registry for diagram types
 */
interface IDiagramTypeRegistry {
  /**
   * Register a diagram type
   * @throws Error if type name is already registered
   */
  register(type: DiagramType): void;

  /**
   * Set the default/fallback diagram type
   */
  setDefault(type: DiagramType): void;

  /**
   * Get a diagram type by name
   */
  get(name: string): DiagramType | undefined;

  /**
   * Get all registered diagram types
   */
  getAll(): DiagramType[];

  /**
   * Check if a type is registered
   */
  has(name: string): boolean;

  /**
   * Get the default diagram type
   */
  getDefault(): DiagramType | undefined;

  /**
   * Unregister a diagram type
   */
  unregister(name: string): boolean;
}
```

## 8. Detection Interfaces

### 8.1 DiagramTypeDetector

```typescript
/**
 * Detects which diagram type can handle an SVG
 */
interface IDiagramTypeDetector {
  /**
   * Detect the diagram type
   *
   * @param svg - SVG element to analyze
   * @returns The diagram type that can handle this SVG, or null
   */
  detect(svg: SVGElement): DiagramType | null;

  /**
   * Get confidence scores for debugging
   *
   * @param svg - SVG element to analyze
   * @returns Array of types with confidence scores (0-1)
   */
  detectWithConfidence(svg: SVGElement): Array<{
    type: DiagramType;
    confidence: number;
  }>;
}
```

## 9. Usage Examples

### 9.1 Implementing a Diagram Type

```typescript
import { DiagramType, DiagramModel, StructureDefinition, EditabilityRules } from './core-interfaces';

class MyDiagramType implements DiagramType {
  readonly name = 'my-diagram';
  readonly displayName = 'My Diagram';
  readonly version = '1.0.0';

  canHandle(svg: SVGElement): boolean {
    // Detection logic
    return svg.querySelector('.my-diagram-marker') !== null;
  }

  parse(svg: SVGElement): DiagramModel {
    // Parsing logic
    return {
      type: this.name,
      nodes: [],
      edges: [],
      metadata: {}
    };
  }

  getStructure(): StructureDefinition {
    // Return structure definition
  }

  getEditability(): EditabilityRules {
    // Return editability rules
  }

  validate(model: DiagramModel): ValidationResult {
    // Validation logic
    return { valid: true, errors: [] };
  }
}
```

### 9.2 Using the Registry

```typescript
import { diagramTypeRegistry } from './registry';
import { DiagramTypeDetector } from './detection';

// Register types
diagramTypeRegistry.register(new ActivityDiagramType());
diagramTypeRegistry.register(new SequenceDiagramType());

// Detect and parse
const detector = new DiagramTypeDetector(diagramTypeRegistry);
const svgElement = getSVGElement();

const type = detector.detect(svgElement);
if (type) {
  const model = type.parse(svgElement);
  const validation = type.validate(model);

  if (validation.valid) {
    // Use the model
  }
}
```

---

**Version**: 1.0
**Status**: Final
**Last Updated**: 2025-11-07
