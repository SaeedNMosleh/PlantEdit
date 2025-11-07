# Process: Adding a New Diagram Type

> **Step-by-Step Guide for Systematic Diagram Type Implementation**

This document provides a complete, step-by-step process for adding support for a new PlantUML diagram type to PlantEdit.

## Overview

Adding a new diagram type involves 7 main steps:
1. SVG Analysis
2. Structure Definition
3. Concept Modeling
4. Parser Implementation
5. Editability Rules
6. Testing
7. Registration

**Time Estimate**: 3-5 days per diagram type (depending on complexity)

---

## Step 1: SVG Analysis (Day 1)

### 1.1 Generate Sample SVGs

Create diverse PlantUML examples and generate their SVG output:

```bash
# Create test files
mkdir -p analysis/sequence/samples

# Simple example
cat > analysis/sequence/simple.puml <<EOF
@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi back
@enduml
EOF

# Complex example
cat > analysis/sequence/complex.puml <<EOF
@startuml
participant User
participant System
participant Database

User -> System: Request
activate System
System -> Database: Query
activate Database
Database --> System: Data
deactivate Database
System --> User: Response
deactivate System
@enduml
EOF

# Generate SVGs
plantuml -tsvg analysis/sequence/samples/*.puml
```

### 1.2 Analyze SVG Structure

Open SVGs in a text editor or browser dev tools and document:

**Checklist**:
- [ ] How are different node types represented?
- [ ] What SVG elements are used (rect, ellipse, path, etc.)?
- [ ] What CSS classes or IDs are used?
- [ ] How is text/labels positioned?
- [ ] How are edges/connections represented?
- [ ] Are there consistent attributes (like specific rx/ry values)?
- [ ] How is hierarchy/grouping handled?
- [ ] Are there special elements (notes, frames, etc.)?

**Document findings** in a temporary file:

```
analysis/sequence/findings.md
```

Example findings:
```markdown
# Sequence Diagram SVG Structure

## Participants
- Represented as: <rect class="participant">
- Text label: <text> child of parent <g>
- Position: x,y attributes on rect
- Width: width attribute (varies)
- Height: Usually 40px

## Lifelines
- Represented as: <line class="lifeline">
- Starts: Below participant box
- Extends: To bottom of diagram
- Style: Dashed line

## Messages
- Represented as: <line class="message"> + <polygon> (arrow)
- Direction: From lifeline to lifeline
- Label: <text> positioned above line
- Types: Can be solid or dashed
```

### 1.3 Identify Patterns

Look for **consistent patterns**:
- Do all action nodes use the same rx value?
- Are IDs predictable or generated?
- Is there nesting (groups within groups)?
- What determines sequence/order?

---

## Step 2: Structure Definition (Day 1-2)

### 2.1 Create Structure YAML

Create `diagram-types/[type]/structure.yaml`

```yaml
name: "Sequence Diagram"
version: "1.0"
plantuml_version: "1.2024.x"

description: |
  Sequence diagrams show interaction between participants over time.
  PlantUML generates specific SVG structures for:
  - Participants (boxes at top)
  - Lifelines (vertical dashed lines)
  - Messages (horizontal arrows)
  - Activation boxes (rectangles on lifelines)

nodes:
  participant:
    selector: "rect.participant"
    description: "Participant in the sequence"
    type: "participant"
    has_text: true
    text_selector: "text"
    properties:
      - name: "width"
        cssSelector: "width"
        description: "Width of participant box"
    editable: true

  activation:
    selector: "rect.activation"
    description: "Activation box on lifeline"
    type: "activation"
    editable: true

edges:
  message:
    selector: "line.message"
    description: "Message between participants"
    source_detection: "x1 coordinate matches participant"
    target_detection: "x2 coordinate matches participant"
    label_selector: "text"

special_elements:
  lifeline:
    selector: "line.lifeline"
    description: "Vertical lifeline for each participant"

  note:
    selector: "rect.note"
    description: "Note annotation"
```

### 2.2 Validate Against Samples

Check that all elements in your sample SVGs are covered by the structure definition.

---

## Step 3: Concept Modeling (Day 2)

### 3.1 Define Domain Concepts

Create `diagram-types/[type]/concepts.ts`

```typescript
/**
 * Sequence Diagram Concepts
 */

export enum SequenceNodeType {
  PARTICIPANT = 'participant',
  ACTOR = 'actor',
  BOUNDARY = 'boundary',
  CONTROL = 'control',
  ENTITY = 'entity',
  DATABASE = 'database'
}

export enum MessageType {
  SYNCHRONOUS = 'synchronous',
  ASYNCHRONOUS = 'asynchronous',
  RETURN = 'return',
  CREATE = 'create',
  DESTROY = 'destroy'
}

export interface SequenceParticipant {
  id: string;
  type: SequenceNodeType;
  name: string;
  position: { x: number; y: number };
  order: number;  // Left-to-right order
}

export interface SequenceMessage {
  id: string;
  type: MessageType;
  from: string;  // Participant ID
  to: string;    // Participant ID
  label: string;
  sequenceNumber: number;  // Order in time
}

export interface SequenceActivation {
  id: string;
  participant: string;  // Participant ID
  startY: number;
  endY: number;
}

export interface SequenceDiagram {
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  activations: SequenceActivation[];
  metadata: {
    title?: string;
  };
}
```

### 3.2 Map SVG to Concepts

Document how SVG elements map to concepts:

```
SVG rect.participant → SequenceParticipant
SVG line.message → SequenceMessage
SVG rect.activation → SequenceActivation
```

---

## Step 4: Parser Implementation (Day 2-3)

### 4.1 Create Parser Class

Create `diagram-types/[type]/[Type]Parser.ts`

```typescript
import { DiagramModel, DiagramNode, DiagramEdge } from '../core';
import { SequenceDiagram, SequenceParticipant, SequenceMessage } from './concepts';

export class SequenceParser {
  parse(svg: SVGElement): DiagramModel {
    // Parse participants
    const participants = this.parseParticipants(svg);

    // Parse messages
    const messages = this.parseMessages(svg, participants);

    // Parse activations
    const activations = this.parseActivations(svg, participants);

    // Convert to generic DiagramModel
    return this.toDiagramModel(participants, messages, activations);
  }

  private parseParticipants(svg: SVGElement): SequenceParticipant[] {
    const participants: SequenceParticipant[] = [];
    const rects = svg.querySelectorAll('rect.participant');

    rects.forEach((rect, index) => {
      const el = rect as SVGRectElement;
      const parent = el.parentElement;
      const text = parent?.querySelector('text')?.textContent || '';

      participants.push({
        id: this.generateId('participant', index),
        type: SequenceNodeType.PARTICIPANT,
        name: text,
        position: {
          x: parseFloat(el.getAttribute('x') || '0'),
          y: parseFloat(el.getAttribute('y') || '0')
        },
        order: index
      });
    });

    // Sort by x position to get correct left-to-right order
    return participants.sort((a, b) => a.position.x - b.position.x);
  }

  private parseMessages(svg: SVGElement, participants: SequenceParticipant[]): SequenceMessage[] {
    // Implementation...
  }

  private toDiagramModel(participants, messages, activations): DiagramModel {
    const nodes: DiagramNode[] = participants.map(p => ({
      id: p.id,
      type: p.type,
      label: p.name,
      position: p.position,
      size: { width: 100, height: 40 },  // Typical size
      data: { order: p.order }
    }));

    const edges: DiagramEdge[] = messages.map(m => ({
      id: m.id,
      source: m.from,
      target: m.to,
      type: m.type,
      label: m.label,
      data: { sequenceNumber: m.sequenceNumber }
    }));

    return {
      type: 'sequence',
      nodes,
      edges,
      metadata: {}
    };
  }

  private generateId(type: string, index: number): string {
    return `${type}-${index}`;
  }
}
```

### 4.2 Implement Incrementally

Build the parser step by step:
1. Start with simplest node type
2. Add tests for that node type
3. Move to next node type
4. Add edge parsing
5. Add special elements

**Don't try to do everything at once!**

---

## Step 5: Editability Rules (Day 3)

### 5.1 Define Rules

Create `diagram-types/[type]/editability.ts`

```typescript
import { EditabilityRules } from '../core';

export const sequenceEditability: EditabilityRules = {
  nodes: {
    participant: {
      movable: true,
      resizable: false,  // Fixed height
      deletable: true,
      connectable: true,
      movementConstraints: {
        verticalOnly: false,
        horizontalOnly: true,  // Only move horizontally
        snapToGrid: false
      }
    },

    activation: {
      movable: false,  // Position determined by messages
      resizable: true,  // Can resize vertically
      deletable: true,
      connectable: false,
      sizeConstraints: {
        minSize: { width: 10, height: 20 },
        fixedAspectRatio: false
      }
    }
  },

  edges: {
    addable: true,      // Can add new messages
    deletable: true,
    labelEditable: true,
    routeEditable: false  // Messages are straight lines
  },

  constraints: {
    requiredNodes: {
      participant: { min: 2 }  // Need at least 2 participants
    }
  }
};
```

### 5.2 Document Rationale

Add comments explaining WHY certain rules exist:

```typescript
participant: {
  movable: true,
  // Participants can only move horizontally because their vertical
  // position is fixed at the top of the diagram
  movementConstraints: {
    horizontalOnly: true
  }
}
```

---

## Step 6: Testing (Day 3-4)

### 6.1 Create Test Structure

```
diagram-types/sequence/__tests__/
├── parser.test.ts
├── type.test.ts
└── fixtures/
    ├── simple.svg
    ├── with-activations.svg
    ├── with-notes.svg
    └── complex.svg
```

### 6.2 Write Parser Tests

```typescript
describe('SequenceParser', () => {
  let parser: SequenceParser;

  beforeEach(() => {
    parser = new SequenceParser();
  });

  describe('parseParticipants', () => {
    it('should parse all participants', () => {
      const svg = loadFixture('simple.svg');
      const model = parser.parse(svg);

      expect(model.nodes).toHaveLength(2);
      expect(model.nodes[0].type).toBe('participant');
      expect(model.nodes[0].label).toBe('Alice');
      expect(model.nodes[1].label).toBe('Bob');
    });

    it('should order participants left-to-right', () => {
      const svg = loadFixture('multiple-participants.svg');
      const model = parser.parse(svg);

      const positions = model.nodes.map(n => n.position.x);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
  });

  describe('parseMessages', () => {
    it('should parse message direction correctly', () => {
      const svg = loadFixture('simple.svg');
      const model = parser.parse(svg);

      expect(model.edges).toHaveLength(2);
      expect(model.edges[0].source).toBe('participant-0'); // Alice
      expect(model.edges[0].target).toBe('participant-1'); // Bob
    });

    it('should extract message labels', () => {
      const svg = loadFixture('simple.svg');
      const model = parser.parse(svg);

      expect(model.edges[0].label).toBe('Hello');
    });
  });
});
```

### 6.3 Write Integration Tests

```typescript
describe('SequenceDiagramType', () => {
  let type: SequenceDiagramType;

  beforeEach(() => {
    type = new SequenceDiagramType();
  });

  it('should detect sequence diagrams', () => {
    const svg = loadFixture('simple.svg');
    expect(type.canHandle(svg)).toBe(true);
  });

  it('should not detect other diagram types', () => {
    const activitySvg = loadFixture('activity.svg');
    expect(type.canHandle(activitySvg)).toBe(false);
  });

  it('should validate correctly', () => {
    const svg = loadFixture('simple.svg');
    const model = type.parse(svg);
    const result = type.validate(model);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation with insufficient participants', () => {
    const model: DiagramModel = {
      type: 'sequence',
      nodes: [/* only 1 participant */],
      edges: [],
      metadata: {}
    };

    const result = type.validate(model);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('insufficient-participants');
  });
});
```

### 6.4 Test with Real SVGs

**Critical**: Test with actual PlantUML-generated SVGs, not hand-written ones!

```bash
# Generate test SVGs
plantuml -tsvg diagram-types/sequence/__tests__/fixtures/*.puml

# Run tests
npm test -- sequence
```

---

## Step 7: Registration (Day 4)

### 7.1 Create Main Type File

Create `diagram-types/[type]/SequenceType.ts` (or whatever the type is)

```typescript
import { DiagramType, DiagramModel, StructureDefinition, EditabilityRules, ValidationResult } from '../core';
import { SequenceParser } from './SequenceParser';
import { sequenceEditability } from './editability';
import structureDefinition from './structure.yaml';

export class SequenceDiagramType implements DiagramType {
  readonly name = 'sequence';
  readonly displayName = 'Sequence Diagram';
  readonly version = '1.0.0';

  private parser: SequenceParser;

  constructor() {
    this.parser = new SequenceParser();
  }

  canHandle(svg: SVGElement): boolean {
    // Sequence diagrams have participants and lifelines
    const hasParticipants = svg.querySelector('rect.participant') !== null;
    const hasLifelines = svg.querySelector('line.lifeline') !== null;

    return hasParticipants && hasLifelines;
  }

  parse(svg: SVGElement): DiagramModel {
    return this.parser.parse(svg);
  }

  getStructure(): StructureDefinition {
    return structureDefinition;
  }

  getEditability(): EditabilityRules {
    return sequenceEditability;
  }

  validate(model: DiagramModel): ValidationResult {
    const errors: ValidationError[] = [];

    // Must have at least 2 participants
    if (model.nodes.length < 2) {
      errors.push({
        code: 'insufficient-participants',
        message: 'Sequence diagram must have at least 2 participants',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 7.2 Register in Application

In your application initialization:

```typescript
// app/initialization.ts
import { diagramTypeRegistry } from '../diagram-types/registry';
import { SequenceDiagramType } from '../diagram-types/sequence/SequenceType';

export function initializeDiagramTypes() {
  // Register all diagram types
  diagramTypeRegistry.register(new SequenceDiagramType());
  // ... other types
}
```

### 7.3 Update Documentation

Add entry to `specification/diagram-types/`:
- Create `sequence-diagram.md` with full specification
- Update main README with list of supported types

---

## Checklist

Before considering a diagram type "complete", verify:

### Analysis Phase
- [ ] Generated 5+ diverse sample SVGs
- [ ] Documented all node types
- [ ] Documented all edge types
- [ ] Documented special elements
- [ ] Identified consistent patterns

### Implementation Phase
- [ ] Created structure.yaml
- [ ] Defined domain concepts
- [ ] Implemented parser
- [ ] Defined editability rules
- [ ] Written comprehensive tests
- [ ] All tests passing

### Integration Phase
- [ ] Created DiagramType class
- [ ] Implemented canHandle() detection
- [ ] Implemented validate() method
- [ ] Registered with registry
- [ ] Updated documentation

### Quality Phase
- [ ] Code reviewed
- [ ] Tests cover edge cases
- [ ] Documentation complete
- [ ] Examples provided

---

## Common Pitfalls

### 1. Assuming SVG Structure
❌ **Don't**: Assume PlantUML uses standard SVG patterns
✅ **Do**: Analyze actual generated SVG

### 2. Over-Generalizing
❌ **Don't**: Try to make parser work for all diagram types
✅ **Do**: Focus on ONE diagram type at a time

### 3. Incomplete Testing
❌ **Don't**: Test with only simple examples
✅ **Do**: Test with complex, real-world diagrams

### 4. Ignoring Edge Cases
❌ **Don't**: Only test the happy path
✅ **Do**: Test empty diagrams, single nodes, etc.

### 5. Tight Coupling
❌ **Don't**: Reference other diagram types in your parser
✅ **Do**: Keep each diagram type completely isolated

---

## Tips for Success

1. **Start Simple**: Begin with the simplest diagram type
2. **Test Early**: Write tests before implementing complex logic
3. **Iterate**: Build parser incrementally, testing at each step
4. **Document**: Explain WHY, not just WHAT
5. **Use Real Data**: Always test with actual PlantUML SVG output
6. **Ask for Help**: If stuck, check similar diagram type implementations

---

## Estimated Timeline

| Phase | Time | Activities |
|-------|------|------------|
| Analysis | 0.5-1 day | SVG analysis, pattern identification |
| Modeling | 0.5 day | Structure definition, concepts |
| Implementation | 1-2 days | Parser, editability rules |
| Testing | 1 day | Unit tests, integration tests |
| Integration | 0.5 day | Registration, documentation |
| **Total** | **3-5 days** | Full diagram type support |

**Note**: Times are for someone familiar with the system. First diagram type may take longer.

---

## Next Steps

After completing a diagram type:

1. **Validate with Users**: Get feedback on parsing accuracy
2. **Refine**: Adjust based on real-world usage
3. **Optimize**: Profile and optimize if needed
4. **Document**: Share learnings for next diagram type
5. **Start Next Type**: Apply learnings to next diagram

---

**Version**: 1.0
**Last Updated**: 2025-11-07
**Next Review**: After first diagram type implementation
