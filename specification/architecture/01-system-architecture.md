# PlantEdit System Architecture

> **High-Level Design for Scalable Multi-Diagram Support**

## 1. Vision & Goals

### 1.1 Primary Goal
Enable **interactive editing of PlantUML diagrams** by providing a visual interface that allows users to:
- Move diagram elements
- Rearrange layouts
- Modify connections
- Preserve changes back to PlantUML source

### 1.2 Core Requirements
1. **Multi-Diagram Support**: Support multiple PlantUML diagram types (Activity, Sequence, Class, State, etc.)
2. **Scalability**: Easy to add new diagram types without modifying core system
3. **Maintainability**: Clear separation of concerns, testable components
4. **Flexibility**: Rendering library should be swappable
5. **Incremental Development**: Build diagram support one type at a time

### 1.3 Non-Goals
- Parse PlantUML source code directly (use SVG output instead)
- Support all PlantUML features in first version
- Real-time collaboration (future consideration)

## 2. Fundamental Insight

### 2.1 The Key Realization

**PlantUML IS consistent in its SVG output - but PER diagram type, not universally.**

- Activity diagrams **always** use the same SVG structure
- Sequence diagrams **always** use a different (but consistent) structure
- Each diagram type has **unique, but predictable** patterns

### 2.2 The Wrong Approach (What NOT to Do)

```
❌ Universal SVG Parser
   ↓
   Try to parse all diagram types with one parser
   ↓
   Complex heuristics, fragile detection, unmaintainable
```

### 2.3 The Right Approach

```
✅ Per-Diagram-Type System
   ↓
   One parser per diagram type
   ↓
   Simple, focused, maintainable, testable
```

## 3. System Architecture

### 3.1 Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PlantUML Source                          │
│                  @startuml ... @enduml                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ PlantUML Server/CLI
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    PlantUML SVG Output                       │
│              (Diagram-type-specific structure)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │
            ╔════════════▼═══════════════╗
            ║      LAYER 1               ║
            ║  Diagram Type System       ║
            ║  (Foundation Layer)        ║
            ╚════════════╦═══════════════╝
                         │
            ┌────────────▼────────────┐
            │  Diagram Type Detection │
            └────────────┬────────────┘
                         │
            ┌────────────▼─────────────────────────────┐
            │  Diagram-Specific Parser                 │
            │  (Activity / Sequence / Class / etc.)    │
            └────────────┬─────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │   Domain Model          │
            │   (Diagram Concepts)    │
            │   - Nodes               │
            │   - Edges               │
            │   - Metadata            │
            │   - Editability Rules   │
            └────────────┬────────────┘
                         │
            ╔════════════▼═══════════════╗
            ║      LAYER 2               ║
            ║   Rendering System         ║
            ║  (Presentation Layer)      ║
            ╚════════════╦═══════════════╝
                         │
            ┌────────────▼────────────┐
            │  Rendering Adapter       │
            │  (React Flow / D3 / etc.)│
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │  Visual Representation  │
            │  + User Interaction     │
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │  Modified Diagram       │
            │  Concepts               │
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │  Export                 │
            │  (SVG / PNG / Source*)  │
            └─────────────────────────┘

* Source code update is future enhancement
```

### 3.2 Layer 1: Diagram Type System (Foundation)

**Purpose**: Transform PlantUML SVG into structured, editable diagram concepts

**Responsibilities**:
1. **Detect** what type of diagram the SVG represents
2. **Parse** the SVG using diagram-type-specific parsers
3. **Extract** diagram elements as domain concepts (nodes, edges, etc.)
4. **Define** what can be edited and how
5. **Validate** diagram structure and constraints

**Key Components**:
```
diagram-types/
├── registry/
│   └── DiagramTypeRegistry.ts        # Central registry
├── detection/
│   ├── DiagramTypeDetector.ts        # Auto-detect diagram type
│   └── detectors/
│       ├── ActivityDetector.ts
│       ├── SequenceDetector.ts
│       └── ...
├── activity/
│   ├── structure.yaml                # SVG structure definition
│   ├── concepts.ts                   # Domain model
│   ├── parser.ts                     # Activity-specific parser
│   ├── editability.ts                # What can be edited
│   └── __tests__/
│       ├── parser.test.ts
│       └── fixtures/                 # Sample SVGs
├── sequence/
│   └── ...
└── class/
    └── ...
```

**Why Layer 1 First**:
- Must understand diagram structure before rendering
- Provides clean domain model for rendering
- Testable independent of UI
- Reusable across different renderers

### 3.3 Layer 2: Rendering System (Presentation)

**Purpose**: Visually render diagram concepts and handle user interactions

**Responsibilities**:
1. **Render** diagram concepts visually
2. **Handle** user interactions (drag, select, resize)
3. **Provide** visual feedback
4. **Export** modified diagrams

**Key Components**:
```
rendering/
├── adapter-interface.ts              # Common interface
├── react-flow/
│   ├── ReactFlowAdapter.ts          # React Flow implementation
│   ├── components/
│   │   ├── ActivityRenderer.ts
│   │   ├── SequenceRenderer.ts
│   │   └── ...
│   └── __tests__/
├── d3/
│   ├── D3Adapter.ts                 # D3 implementation
│   └── ...
└── canvas/
    └── ...                           # Future: Canvas renderer
```

**Why Layer 2 Second**:
- Depends on clean domain model from Layer 1
- Can be swapped without affecting parsing
- Multiple renderers can coexist
- Focus on presentation, not data

## 4. Core Abstractions

### 4.1 Diagram Type

A **Diagram Type** represents a specific kind of PlantUML diagram (Activity, Sequence, Class, etc.)

**Contract**:
```typescript
interface DiagramType {
  // Identification
  name: string;                    // 'activity', 'sequence', etc.
  displayName: string;             // 'Activity Diagram'

  // Detection
  canHandle(svg: SVGElement): boolean;

  // Parsing
  parse(svg: SVGElement): DiagramModel;

  // Metadata
  getStructure(): StructureDefinition;
  getEditability(): EditabilityRules;
}
```

### 4.2 Diagram Model

A **Diagram Model** is the domain representation of a diagram

**Contract**:
```typescript
interface DiagramModel {
  type: string;                    // Diagram type name
  nodes: DiagramNode[];            // All nodes in diagram
  edges: DiagramEdge[];            // All connections
  metadata: DiagramMetadata;       // Title, direction, etc.
}

interface DiagramNode {
  id: string;                      // Unique identifier
  type: string;                    // Node type (e.g., 'action', 'decision')
  position: Point;                 // X, Y coordinates
  size: Size;                      // Width, height
  label: string;                   // Display text
  data: Record<string, any>;       // Type-specific data
}

interface DiagramEdge {
  id: string;                      // Unique identifier
  source: string;                  // Source node ID
  target: string;                  // Target node ID
  label?: string;                  // Edge label
  data: Record<string, any>;       // Type-specific data
}
```

### 4.3 Structure Definition

A **Structure Definition** documents how PlantUML generates SVG for a diagram type

**Format** (YAML):
```yaml
name: "Activity Diagram"
version: "1.0"

svg_structure:
  nodes:
    start_end:
      selector: "ellipse[rx='11'][ry='11']"
      type: "start_end"
      properties:
        - fill_color
        - stroke_width

    action:
      selector: "g > rect[rx='12.5']"
      type: "action"
      has_text: true

    decision:
      selector: "polygon[points*='4']"
      type: "decision"
      has_text: true

  edges:
    selector: "path[d*='M']"
    source_detection: "path_start_coordinates"
    target_detection: "path_end_coordinates"
```

### 4.4 Editability Rules

**Editability Rules** define what can be modified in a diagram

**Contract**:
```typescript
interface EditabilityRules {
  nodes: {
    [nodeType: string]: NodeEditability;
  };
  edges: EdgeEditability;
  constraints?: DiagramConstraints;
}

interface NodeEditability {
  movable: boolean;
  resizable: boolean;
  deletable: boolean;
  connectable: boolean;
  properties?: {
    [prop: string]: boolean;     // Which properties can be edited
  };
}
```

### 4.5 Rendering Adapter

A **Rendering Adapter** implements diagram visualization using a specific library

**Contract**:
```typescript
interface RenderingAdapter {
  // Lifecycle
  initialize(container: HTMLElement): void;
  destroy(): void;

  // Rendering
  render(model: DiagramModel): void;
  clear(): void;

  // Interaction
  onNodeMove(handler: (nodeId: string, position: Point) => void): void;
  onNodeResize(handler: (nodeId: string, size: Size) => void): void;
  onEdgeChange(handler: (edgeId: string, data: any) => void): void;
  onSelectionChange(handler: (selectedIds: string[]) => void): void;

  // State
  getState(): DiagramModel;
  setState(model: DiagramModel): void;

  // Export
  exportSVG(): string;
  exportPNG(): Blob;
}
```

## 5. Data Flow

### 5.1 Initial Rendering Flow

```
1. User provides PlantUML source
   ↓
2. PlantUML generates SVG
   ↓
3. DiagramTypeDetector analyzes SVG
   ↓
4. Appropriate DiagramType parser selected
   ↓
5. Parser extracts DiagramModel
   ↓
6. DiagramModel passed to RenderingAdapter
   ↓
7. RenderingAdapter renders visual representation
   ↓
8. User sees editable diagram
```

### 5.2 Interaction Flow

```
1. User drags a node
   ↓
2. RenderingAdapter captures event
   ↓
3. RenderingAdapter updates visual position
   ↓
4. RenderingAdapter fires onNodeMove callback
   ↓
5. Application updates DiagramModel
   ↓
6. Application can export modified diagram
```

### 5.3 Export Flow

```
1. User clicks export
   ↓
2. Application requests current state from RenderingAdapter
   ↓
3. RenderingAdapter returns updated DiagramModel
   ↓
4. Application can:
   a) Export as SVG (via adapter)
   b) Export as PNG (via adapter)
   c) Update PlantUML source* (future)
```

## 6. Scalability Strategy

### 6.1 Adding New Diagram Types

**Process**:
1. Analyze PlantUML SVG output for the new diagram type
2. Create structure definition (YAML)
3. Define domain concepts (TypeScript interfaces)
4. Implement parser (TypeScript class)
5. Define editability rules
6. Write comprehensive tests
7. Register diagram type
8. Done - no changes to core system needed

**Isolation**: Each diagram type is completely independent

### 6.2 Adding New Rendering Libraries

**Process**:
1. Implement RenderingAdapter interface
2. Test with existing diagram types
3. Done - no changes to parsers needed

**Flexibility**: Rendering is pluggable

### 6.3 Extending Functionality

**Examples**:
- Add new node types to existing diagram: Update that diagram's parser only
- Add new interaction: Update RenderingAdapter interface, implement in adapters
- Add export format: Update RenderingAdapter interface, implement in adapters

## 7. Technology Stack

### 7.1 Layer 1 (Diagram Type System)

**Language**: TypeScript
- Strong typing for diagram models
- Interface contracts
- Better IDE support

**Testing**: Jest
- Unit tests for each parser
- Integration tests for diagram type detection
- Fixture-based testing with real SVG samples

**Data Format**: YAML for structure definitions
- Human-readable
- Easy to version control
- Clear documentation

### 7.2 Layer 2 (Rendering System)

**Primary Option**: React + React Flow
- Component-based architecture
- Rich ecosystem
- Built-in interactions

**Alternative**: D3.js
- Direct SVG manipulation
- Maximum flexibility
- Proven technology

**Choice**: Determined after Layer 1 is complete

## 8. Quality Attributes

### 8.1 Maintainability
- **Separation of Concerns**: Clear boundaries between layers
- **Single Responsibility**: Each parser handles one diagram type
- **Documentation**: Structure definitions are self-documenting
- **Tests**: Comprehensive test coverage per diagram type

### 8.2 Scalability
- **Incremental**: Add diagram types one at a time
- **Isolated**: Changes don't affect other diagram types
- **Systematic**: Clear process for adding new types

### 8.3 Flexibility
- **Pluggable Rendering**: Swap rendering libraries
- **Extensible**: Easy to add new diagram types
- **Adaptable**: Can support new PlantUML features

### 8.4 Reliability
- **Type Safety**: TypeScript for compile-time checking
- **Validation**: Diagram structure validation
- **Testing**: Each component independently testable

## 9. Risk Mitigation

### 9.1 PlantUML Changes SVG Structure

**Risk**: PlantUML changes how it generates SVG

**Mitigation**:
- Structure definitions document current format
- Tests include actual SVG fixtures
- Version structure definitions
- Easy to update single diagram type

### 9.2 Performance with Large Diagrams

**Risk**: Large diagrams may be slow to parse/render

**Mitigation**:
- Lazy loading of diagram types
- Efficient parsing algorithms
- Rendering optimization (Layer 2 concern)
- Progressive rendering if needed

### 9.3 Complex Diagrams

**Risk**: Some diagram types may be very complex

**Mitigation**:
- Start with simple diagram types
- Validate architecture before tackling complex ones
- Can mark features as "unsupported" initially

## 10. Success Criteria

### 10.1 Phase 1 (Foundation)
- [ ] Core interfaces defined
- [ ] Diagram type registry working
- [ ] Detection system working
- [ ] Process documented

### 10.2 Phase 2 (First Diagram Type)
- [ ] Activity diagram fully supported
- [ ] All tests passing
- [ ] Can move nodes
- [ ] Can export modified diagram
- [ ] End-to-end working

### 10.3 Phase 3 (Validation)
- [ ] Second diagram type added (Sequence)
- [ ] Process validated as scalable
- [ ] No changes to core system needed
- [ ] Architecture proven

### 10.4 Phase 4 (Production Ready)
- [ ] 3+ diagram types supported
- [ ] Rendering layer mature
- [ ] Export working for all types
- [ ] Documentation complete
- [ ] Ready for users

## 11. Next Steps

1. **Review this architecture** with team
2. **Validate** the approach makes sense
3. **Define** core interfaces (see `interfaces/core-interfaces.md`)
4. **Document** Layer 1 in detail (see `architecture/02-layer1-diagram-type-system.md`)
5. **Start** with Activity Diagram implementation

---

**Version**: 1.0
**Status**: Approved for Implementation
**Next Document**: [02-layer1-diagram-type-system.md](02-layer1-diagram-type-system.md)
