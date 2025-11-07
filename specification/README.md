# PlantEdit System Specification

> **Foundation Documents for Scalable Multi-Diagram Support**

This directory contains the complete architectural and technical specifications for PlantEdit - a system designed to make PlantUML diagrams interactively editable while maintaining their source code representation.

## 📚 Documentation Structure

### 1. Architecture Specifications
- **[01-system-architecture.md](architecture/01-system-architecture.md)** - High-level system architecture and design principles
- **[02-layer1-diagram-type-system.md](architecture/02-layer1-diagram-type-system.md)** - Core diagram type system (Foundation Layer)
- **[03-layer2-rendering-system.md](architecture/03-layer2-rendering-system.md)** - Rendering and interaction layer

### 2. Diagram Type Specifications
- **[activity-diagram.md](diagram-types/activity-diagram.md)** - Complete specification for Activity Diagrams
- **[sequence-diagram.md](diagram-types/sequence-diagram.md)** - Specification for Sequence Diagrams (future)
- **[class-diagram.md](diagram-types/class-diagram.md)** - Specification for Class Diagrams (future)
- **[template.md](diagram-types/template.md)** - Template for adding new diagram types

### 3. Process Documentation
- **[adding-diagram-type.md](processes/adding-diagram-type.md)** - Step-by-step guide to add a new diagram type
- **[svg-analysis-process.md](processes/svg-analysis-process.md)** - How to analyze PlantUML SVG output
- **[testing-strategy.md](processes/testing-strategy.md)** - Testing approach for diagram types

### 4. Interface Definitions
- **[core-interfaces.md](interfaces/core-interfaces.md)** - Core TypeScript interfaces
- **[diagram-type-interface.md](interfaces/diagram-type-interface.md)** - DiagramType interface specification
- **[rendering-adapter-interface.md](interfaces/rendering-adapter-interface.md)** - Rendering layer interface

### 5. Examples
- **[activity-diagram-example.md](examples/activity-diagram-example.md)** - Complete worked example for Activity Diagrams
- **[svg-samples/](examples/svg-samples/)** - Sample PlantUML SVG outputs

## 🎯 Key Design Principles

### 1. **Separation of Concerns**
```
Layer 1: PlantUML SVG → Diagram Concepts (Domain Model)
         ↓
Layer 2: Diagram Concepts → Visual Representation (Rendering)
```

### 2. **Per-Diagram-Type Approach**
- Each PlantUML diagram type has **unique SVG structure**
- No universal parser - each type gets its **own systematic implementation**
- Diagram types are **isolated** and **independently testable**

### 3. **Incremental & Scalable**
- Add diagram types **one at a time**
- Each addition **validates the architecture**
- **Systematic process** ensures consistency

### 4. **Rendering Library Agnostic**
- Rendering is **Layer 2** (comes after Layer 1 is solid)
- Can use **different renderers** for different diagram types
- Can **switch renderers** without rewriting parsers

## 🏗️ System Layers

### Layer 1: Diagram Type System (Foundation)
**Purpose**: Convert PlantUML SVG to structured diagram concepts

**Components**:
- Diagram Type Detection
- Per-Type SVG Parsers
- Domain Model Definitions
- Editability Rules
- Structure Definitions

**Why First**: Must understand the diagram before we can render it

### Layer 2: Rendering System (Presentation)
**Purpose**: Render diagram concepts visually and handle interactions

**Components**:
- Rendering Adapters (React Flow, D3, Canvas, etc.)
- Interaction Handlers
- Visual Feedback
- Export Capabilities

**Why Second**: Once we have clean diagram concepts, rendering becomes straightforward

## 📋 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Define core interfaces and contracts
- [ ] Build diagram type registry
- [ ] Build diagram type detector
- [ ] Create systematic process documentation

### Phase 2: First Diagram Type - Activity (Weeks 2-4)
- [ ] Analyze PlantUML activity diagram SVG
- [ ] Document structure definition
- [ ] Define domain model (concepts)
- [ ] Implement parser with comprehensive tests
- [ ] Define editability rules
- [ ] Validate end-to-end with simple renderer

### Phase 3: Rendering Layer (Weeks 4-5)
- [ ] Define rendering adapter interface
- [ ] Implement first adapter (React Flow OR D3)
- [ ] Validate adapter works with activity diagrams
- [ ] Ensure true decoupling from Layer 1

### Phase 4: Second Diagram Type - Validation (Weeks 5-7)
- [ ] Pick second diagram type (sequence recommended)
- [ ] Follow the systematic process
- [ ] Validate that process scales
- [ ] Refine process documentation based on learnings

### Phase 5: Continue Incrementally
- [ ] Add one diagram type at a time
- [ ] Each validates the architecture
- [ ] Build comprehensive diagram library

## 🎓 How to Use These Specifications

### For Implementers
1. **Start with** [01-system-architecture.md](architecture/01-system-architecture.md) to understand the overall design
2. **Read** [02-layer1-diagram-type-system.md](architecture/02-layer1-diagram-type-system.md) to understand the foundation
3. **Follow** [adding-diagram-type.md](processes/adding-diagram-type.md) when adding a new diagram type
4. **Reference** [activity-diagram-example.md](examples/activity-diagram-example.md) for a complete worked example

### For Architects
1. Review the layered architecture approach
2. Understand the separation of concerns
3. Validate the interface contracts
4. Assess scalability and maintainability

### For Contributors
1. Read the process documentation
2. Follow the template for new diagram types
3. Ensure tests are comprehensive
4. Document SVG structure thoroughly

## 🔍 Key Insights

### Why This Architecture?

**PlantUML is consistent PER diagram type, not universally**
- Activity diagrams always generate the same SVG structure
- Sequence diagrams always generate a different, but consistent, SVG structure
- Trying to build a universal parser is the wrong abstraction

**The correct approach**:
- One parser per diagram type
- Each parser is simple and focused
- Systematic process ensures quality
- Incremental approach reduces risk

### What Makes This Scalable?

1. **Clear Contracts**: Interfaces define exact expectations
2. **Isolation**: Diagram types don't affect each other
3. **Testability**: Each type tested independently
4. **Process**: Systematic approach for adding types
5. **Decoupling**: Rendering separate from parsing

## 📖 Reading Order

**If you're new to the system**:
1. This README (overview)
2. [01-system-architecture.md](architecture/01-system-architecture.md) (high-level design)
3. [activity-diagram-example.md](examples/activity-diagram-example.md) (concrete example)
4. [adding-diagram-type.md](processes/adding-diagram-type.md) (process)

**If you're implementing**:
1. [02-layer1-diagram-type-system.md](architecture/02-layer1-diagram-type-system.md) (foundation)
2. [core-interfaces.md](interfaces/core-interfaces.md) (contracts)
3. [activity-diagram.md](diagram-types/activity-diagram.md) (first diagram type)
4. [svg-analysis-process.md](processes/svg-analysis-process.md) (how to analyze)

**If you're extending**:
1. [template.md](diagram-types/template.md) (template for new types)
2. [adding-diagram-type.md](processes/adding-diagram-type.md) (step-by-step)
3. Existing diagram type specs for reference

## ✅ Specification Completeness

- [x] System Architecture
- [x] Layer 1 Specification
- [x] Layer 2 Specification
- [x] Activity Diagram Specification (Reference Implementation)
- [x] Process Documentation
- [x] Interface Definitions
- [x] Example Implementation
- [ ] Sequence Diagram Specification (Future)
- [ ] Class Diagram Specification (Future)
- [ ] State Diagram Specification (Future)

## 🚀 Next Steps

1. **Review** these specifications with the team
2. **Validate** the architecture makes sense
3. **Start** with Activity Diagram implementation (Layer 1 only)
4. **Test** thoroughly before adding rendering
5. **Add** rendering layer once Layer 1 is solid
6. **Expand** to second diagram type to validate scalability

---

**Version**: 1.0
**Last Updated**: 2025-11-07
**Status**: Initial Specification
**Next Review**: After Activity Diagram Implementation
