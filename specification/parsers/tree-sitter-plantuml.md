# Tree-sitter PlantUML Parser

> **Separate Project: Incremental Grammar Development for LSP Support**

## Overview

This document specifies a **separate tree-sitter project** for parsing PlantUML source code. This parser is designed to be developed independently and used by PlantEdit and other tools requiring PlantUML AST capabilities.

### Project Separation

**Repository**: `tree-sitter-plantuml` (separate from PlantEdit)

**Reason for Separation**:
- Reusable by multiple projects (LSP servers, formatters, linters, editors)
- Independent release cycle
- Can be contributed to tree-sitter community
- Follows tree-sitter ecosystem conventions
- Enables testing and benchmarking in isolation

**Integration**: PlantEdit will consume this as an npm package

---

## Why Tree-sitter?

Based on comprehensive research and comparison with alternatives (Lezer, Langium, ANTLR4, Peggy, hand-written parsers):

### Key Advantages

1. **Best-in-class Incremental Parsing**
   - Sub-millisecond re-parsing (<1ms typical)
   - Only re-parses changed regions
   - Essential for Language Server Protocol (LSP)

2. **Automatic Error Recovery**
   - Continues parsing after errors
   - Inserts error nodes automatically
   - No manual error handling needed
   - Critical for IDE/editor support

3. **Lossless Concrete Syntax Tree**
   - Preserves ALL tokens (whitespace, comments, everything)
   - Perfect roundtrip (text → tree → text)
   - Essential for formatters and refactoring tools

4. **Rich Ecosystem**
   - S-expression queries for pattern matching
   - Syntax highlighting generation
   - Used by GitHub, VSCode, Neovim, Emacs
   - Large community, many example grammars

5. **Proven at Scale**
   - GitHub uses for millions of files
   - Battle-tested in production
   - Will be maintained for decades

6. **LLM-Friendly Grammar**
   - Declarative JavaScript grammar format
   - LLMs can generate grammar rules effectively
   - Clear, structured format

### Comparison with Alternatives

| Feature | Tree-sitter | Langium | ANTLR4 | Peggy | Hand-written |
|---------|-------------|---------|--------|-------|--------------|
| **Incremental** | ✅ <1ms | ✅ ~10ms | ❌ No | ❌ No | ⚠️ DIY |
| **Error Recovery** | ✅ Auto | ✅ Good | ⚠️ Limited | ⚠️ Limited | ⚠️ Manual |
| **Lossless** | ✅ Yes | ⚠️ Optional | ❌ No | ❌ No | ⚠️ DIY |
| **Ecosystem** | ✅✅✅ | ⚠️ | ✅ | ⚠️ | ❌ |
| **JavaScript** | ✅ WASM | ✅ Native | ⚠️ Slow | ✅ Native | ✅ Native |

**Decision**: Tree-sitter is the best choice for LSP-grade PlantUML parsing.

---

## Architecture

### 1. Parser Components

```
tree-sitter-plantuml/
├── grammar.js              # Grammar definition
├── src/
│   ├── parser.c           # Generated parser (don't edit)
│   ├── scanner.c          # Custom lexer (if needed)
│   └── node-types.json    # Generated node types
├── queries/
│   ├── highlights.scm     # Syntax highlighting
│   ├── locals.scm         # Local scope queries
│   ├── tags.scm           # Symbol tagging
│   └── folds.scm          # Code folding
├── test/
│   ├── corpus/            # Grammar tests
│   │   ├── activity.txt
│   │   ├── sequence.txt
│   │   ├── class.txt
│   │   └── ...
│   └── highlight/         # Highlight tests
├── examples/              # Example .puml files
├── package.json
└── binding.gyp            # Node.js bindings
```

### 2. Grammar Structure

The grammar will be defined in `grammar.js` following tree-sitter conventions:

```javascript
module.exports = grammar({
  name: 'plantuml',

  // Tokens to skip (whitespace)
  extras: $ => [
    /\s/,
    $.comment
  ],

  // Inline rules (for performance)
  inline: $ => [
    $.statement
  ],

  // Conflict resolution
  conflicts: $ => [
    // Define if needed
  ],

  rules: {
    // Entry point
    source_file: $ => seq(
      $.start_directive,
      optional($.title),
      repeat($.statement),
      $.end_directive
    ),

    start_directive: $ => choice(
      '@startuml',
      '@startactivity',
      '@startsequence',
      '@startclass',
      '@startstate',
      // ... more diagram types
    ),

    end_directive: $ => choice(
      '@enduml',
      '@endactivity',
      '@endsequence',
      '@endclass',
      '@endstate',
      // ... more diagram types
    ),

    // Statements (will expand incrementally)
    statement: $ => choice(
      $.activity_statement,
      $.sequence_statement,
      $.class_statement,
      $.state_statement,
      $.comment,
      // More types added incrementally
    ),

    // Comments
    comment: $ => token(choice(
      seq("'", /.*/),
      seq('/', '*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')
    )),

    // Activity diagram rules (implemented first)
    activity_statement: $ => choice(
      $.activity_node,
      $.decision_node,
      $.start_node,
      $.stop_node,
      $.partition
    ),

    activity_node: $ => seq(
      ':',
      field('label', $.text),
      ';'
    ),

    decision_node: $ => seq(
      'if',
      '(',
      field('condition', $.expression),
      ')',
      'then',
      optional(seq('(', field('label', $.text), ')'))
    ),

    start_node: $ => 'start',

    stop_node: $ => choice('stop', 'end'),

    partition: $ => seq(
      'partition',
      field('name', $.string),
      '{',
      repeat($.activity_statement),
      '}'
    ),

    // Text and expressions (simplified)
    text: $ => /[^;\n)]+/,

    expression: $ => /[^)]+/,

    string: $ => choice(
      seq('"', /[^"]*/, '"'),
      /[a-zA-Z_][a-zA-Z0-9_]*/
    ),

    // More rules added incrementally...
  }
});
```

### 3. Incremental Development Strategy

**Phase-by-Phase Grammar Implementation:**

#### Phase 1: Core + Activity Diagrams (Week 1-2)
```
✅ Start/end directives
✅ Comments
✅ Activity nodes
✅ Decision nodes
✅ Start/stop nodes
✅ Simple transitions
✅ Partitions
```

**Test Coverage**: 20+ test cases

#### Phase 2: Sequence Diagrams (Week 3-4)
```
✅ Participants (actor, participant, entity, etc.)
✅ Messages (synchronous, asynchronous, return)
✅ Activations
✅ Lifelines
✅ Groups (alt, opt, loop, par)
```

**Test Coverage**: 30+ test cases

#### Phase 3: Class Diagrams (Week 5-6)
```
✅ Class definitions
✅ Fields and methods
✅ Visibility modifiers
✅ Relationships (inheritance, composition, etc.)
✅ Stereotypes
✅ Packages
```

**Test Coverage**: 40+ test cases

#### Phase 4: State Diagrams (Week 7-8)
```
✅ States
✅ Transitions
✅ Composite states
✅ History states
✅ Fork/join
```

**Test Coverage**: 25+ test cases

#### Phase 5: Additional Diagram Types (Ongoing)
- Component diagrams
- Deployment diagrams
- Use case diagrams
- Object diagrams
- Timing diagrams

---

## Testing Strategy

### 1. Corpus Tests

Tree-sitter uses corpus-based testing in `test/corpus/` directory.

**Format**:
```
====================================
Test name: Activity node basic
====================================

:Hello world;

---

(source_file
  (start_directive)
  (activity_statement
    (activity_node
      label: (text)))
  (end_directive))

====================================
Test name: Activity with decision
====================================

@startuml
:Start;
if (condition?) then (yes)
  :Action A;
else (no)
  :Action B;
endif
:End;
@enduml

---

(source_file
  (start_directive)
  (activity_statement
    (activity_node
      label: (text)))
  (activity_statement
    (decision_node
      condition: (expression)
      label: (text)
      (activity_statement
        (activity_node
          label: (text)))
      (activity_statement
        (activity_node
          label: (text)))))
  (activity_statement
    (activity_node
      label: (text)))
  (end_directive))
```

### 2. Test Organization

```
test/corpus/
├── core.txt                   # Start/end, comments
├── activity/
│   ├── nodes.txt             # Activity nodes
│   ├── decisions.txt         # Decision nodes
│   ├── partitions.txt        # Partitions
│   ├── complex.txt           # Complex scenarios
│   └── errors.txt            # Error recovery
├── sequence/
│   ├── participants.txt      # Participant declarations
│   ├── messages.txt          # Message types
│   ├── activations.txt       # Activation boxes
│   ├── groups.txt            # Alt/opt/loop
│   └── errors.txt
├── class/
│   ├── classes.txt           # Class definitions
│   ├── relationships.txt     # Relationships
│   ├── packages.txt          # Package organization
│   └── errors.txt
└── state/
    ├── states.txt
    ├── transitions.txt
    ├── composite.txt
    └── errors.txt
```

### 3. Running Tests

```bash
# Generate parser
npm run build

# Run all tests
npm test

# Run specific test file
npx tree-sitter test -f "Activity node basic"

# Parse example file
npx tree-sitter parse examples/activity.puml

# Interactive playground
npx tree-sitter playground
```

### 4. Error Recovery Tests

**Critical for LSP**: Test that parser recovers from errors gracefully.

```
====================================
Test name: Missing semicolon recovery
====================================

@startuml
:Action 1;
:Action 2  <- missing semicolon
:Action 3;
@enduml

---

(source_file
  (start_directive)
  (activity_statement
    (activity_node
      label: (text)))
  (ERROR
    (activity_node  <- error node inserted
      label: (text)))
  (activity_statement
    (activity_node
      label: (text)))
  (end_directive))
```

**Key principle**: Parser should never crash, always produce some tree.

### 5. Continuous Testing

```javascript
// package.json
{
  "scripts": {
    "build": "tree-sitter generate && node-gyp build",
    "test": "tree-sitter test",
    "test:watch": "tree-sitter test --watch",
    "parse": "tree-sitter parse",
    "playground": "tree-sitter playground"
  }
}
```

### 6. Incremental Validation

**After each grammar addition**:
1. ✅ Write corpus tests for new rules
2. ✅ Verify existing tests still pass
3. ✅ Parse real-world examples
4. ✅ Check error recovery
5. ✅ Update queries (highlights, tags)

---

## Queries for IDE Features

### 1. Syntax Highlighting

`queries/highlights.scm`:
```scheme
; Keywords
[
  "@startuml"
  "@enduml"
  "if"
  "then"
  "else"
  "endif"
  "partition"
  "start"
  "stop"
] @keyword

; Operators
[
  ":"
  ";"
  "("
  ")"
  "{"
  "}"
] @punctuation.delimiter

; Strings
(text) @string
(string) @string

; Comments
(comment) @comment

; Conditions
(expression) @function
```

### 2. Code Folding

`queries/folds.scm`:
```scheme
; Fold partitions
(partition) @fold

; Fold decision blocks
(decision_node) @fold

; Fold composite states
(composite_state) @fold
```

### 3. Symbol Tagging

`queries/tags.scm`:
```scheme
; Extract symbols for outline view
(activity_node
  label: (text) @name) @definition.activity

(partition
  name: (string) @name) @definition.partition

(class_definition
  name: (identifier) @name) @definition.class

(participant
  name: (identifier) @name) @definition.participant
```

---

## Performance Targets

### Parse Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Initial Parse** | <100ms for 10K lines | Acceptable startup time |
| **Incremental Parse** | <5ms for typical edit | LSP responsiveness |
| **Memory** | <10MB for 10K lines | Reasonable overhead |

### Benchmarking

```bash
# Benchmark parsing speed
time npx tree-sitter parse examples/large.puml

# Profile with Node.js
node --prof parse.js
```

---

## Integration with PlantEdit

### 1. Package Installation

```bash
# In PlantEdit project
npm install tree-sitter-plantuml
```

### 2. Usage in PlantEdit

```typescript
import Parser from 'tree-sitter';
import PlantUML from 'tree-sitter-plantuml';

const parser = new Parser();
parser.setLanguage(PlantUML);

// Parse PlantUML source
const sourceCode = `
@startuml
:Activity 1;
:Activity 2;
@enduml
`;

const tree = parser.parse(sourceCode);

// Access AST
const cursor = tree.walk();
console.log(cursor.nodeType); // 'source_file'

// Incremental re-parse
const newCode = sourceCode.replace('Activity 1', 'Step 1');
const newTree = parser.parse(newCode, tree);
// Only re-parses changed region!

// Query for nodes
const query = PlantUML.query(`
  (activity_node
    label: (text) @label)
`);

const matches = query.matches(tree.rootNode);
for (const match of matches) {
  console.log(match.captures[0].node.text);
}
```

### 3. Source Mapping

```typescript
interface DiagramNode {
  id: string;
  type: string;
  label: string;
  position: Point;      // From SVG
  size: Size;          // From SVG

  // NEW: Source location (from tree-sitter)
  sourceLocation?: {
    startPosition: { row: number; column: number };
    endPosition: { row: number; column: number };
    startIndex: number;  // Byte offset
    endIndex: number;
    astNode: TreeSitterNode;  // Reference to tree-sitter node
  };
}
```

### 4. Two-Parser Architecture

```
PlantUML Source Code
    ↓
tree-sitter Parser → AST with source locations
    ↓
PlantUML Server → SVG
    ↓
svgson Parser → SVG AST
    ↓
Source Mapper → Merge
    ↓
Complete Domain Model
(visual properties + source locations)
```

---

## Development Workflow

### Initial Setup

```bash
# Create project
mkdir tree-sitter-plantuml
cd tree-sitter-plantuml

# Initialize tree-sitter
npm init -y
npm install --save-dev tree-sitter-cli
npx tree-sitter init

# Edit grammar.js
# (Use LLM to generate initial grammar)

# Generate parser
npx tree-sitter generate

# Test
npx tree-sitter test
```

### Iterative Development

```bash
# 1. Add grammar rule to grammar.js
# 2. Generate parser
npx tree-sitter generate

# 3. Test interactively
npx tree-sitter playground

# 4. Write corpus test
# Edit test/corpus/activity.txt

# 5. Run tests
npx tree-sitter test

# 6. Fix issues, repeat
```

### Using LLM for Grammar Generation

**Prompt Template**:
```
I'm building a tree-sitter grammar for PlantUML [DIAGRAM_TYPE].

PlantUML syntax:
```
[EXAMPLE CODE]
```

Desired AST structure:
```
[EXPECTED TREE]
```

Current grammar.js has:
```javascript
[CURRENT GRAMMAR]
```

Please add rules for [SPECIFIC FEATURE] to the grammar.
Use tree-sitter's JavaScript grammar format.
Include field names for important captures.
```

---

## Maintenance and Versioning

### Version Strategy

- **Semantic Versioning**: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking grammar changes (rare)
- **MINOR**: New diagram types or major features
- **PATCH**: Bug fixes, small improvements

### Changelog

Maintain `CHANGELOG.md`:
```markdown
## [0.3.0] - 2025-11-15
### Added
- Class diagram support
- Relationship parsing
- Package declarations

### Fixed
- Decision node error recovery
- Comment parsing edge cases

## [0.2.0] - 2025-11-01
### Added
- Sequence diagram support
- Participant types
- Message types

## [0.1.0] - 2025-10-15
### Added
- Initial release
- Activity diagram support
- Basic error recovery
```

### Community

- **GitHub**: Open source, accept contributions
- **Issues**: Track grammar bugs, feature requests
- **PRs**: Accept community grammar improvements
- **Documentation**: Comprehensive README

---

## Success Criteria

### Phase 1 (Activity Diagrams)
- ✅ Parse 95%+ of real-world activity diagrams
- ✅ Error recovery: Continue parsing after errors
- ✅ Performance: <50ms for 1000-line file
- ✅ Tests: 20+ corpus tests passing

### Phase 2 (Sequence Diagrams)
- ✅ Parse 90%+ of sequence diagrams
- ✅ All participant types supported
- ✅ All message types supported
- ✅ Tests: 30+ corpus tests passing

### Phase 3 (Class Diagrams)
- ✅ Parse 90%+ of class diagrams
- ✅ All relationship types supported
- ✅ Visibility and stereotypes working
- ✅ Tests: 40+ corpus tests passing

### Overall Success
- ✅ Used by PlantEdit for LSP features
- ✅ Open source, community contributions
- ✅ Performance meets LSP requirements (<5ms incremental)
- ✅ Error recovery enables robust IDE support

---

## References

### Tree-sitter Documentation
- Official docs: https://tree-sitter.github.io/tree-sitter/
- Creating parsers: https://tree-sitter.github.io/tree-sitter/creating-parsers
- Using parsers: https://tree-sitter.github.io/tree-sitter/using-parsers

### Example Grammars
- tree-sitter-javascript: Reference implementation
- tree-sitter-python: Good error recovery examples
- tree-sitter-rust: Advanced patterns

### PlantUML Reference
- Official PlantUML: https://plantuml.com/
- PlantUML language-grammar: https://github.com/plantuml/language-grammar
- Existing parsers (partial): plantuml-parser (PEG.js)

---

**Version**: 1.0
**Status**: Specification Complete
**Next Step**: Begin Phase 1 implementation (Activity diagrams)
