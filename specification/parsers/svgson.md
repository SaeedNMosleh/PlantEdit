# SVG Parser: svgson

> **Bidirectional SVG ↔ JSON Conversion for Visual Property Extraction**

## Overview

**svgson** is the chosen library for parsing PlantUML-generated SVG into a structured Abstract Syntax Tree (AST) and for regenerating SVG from modified AST.

### Why svgson?

After evaluating multiple SVG parsing libraries (svg-parser, SVGO, raw DOM manipulation), svgson emerged as the best choice for PlantEdit's use case.

### Key Advantages

1. **Bidirectional**
   - Parse: SVG string → JSON AST
   - Stringify: JSON AST → SVG string
   - Essential for editing workflow

2. **Clean JSON Structure**
   - Easy to traverse and manipulate
   - Plain JavaScript objects (no special classes)
   - Serializable for storage/debugging

3. **Browser + Node.js**
   - Works in both environments
   - No native dependencies
   - Small bundle size

4. **Actively Maintained**
   - Regular updates
   - TypeScript definitions available
   - Good documentation

5. **Sufficient Performance**
   - Fast enough for PlantUML SVGs (typically <5KB)
   - Full parse: ~10-20ms for typical diagram
   - Not incremental, but PlantUML SVGs are small enough

### Comparison with Alternatives

| Feature | svgson | svg-parser | SVGO | Raw DOM |
|---------|--------|------------|------|---------|
| **Bidirectional** | ✅ Yes | ❌ Read-only | ❌ Optimizer | ⚠️ Manual |
| **JSON AST** | ✅ Clean | ✅ HAST | ⚠️ Complex | ❌ No |
| **Ease of Use** | ✅✅✅ | ✅✅ | ⚠️ | ⚠️ |
| **TypeScript** | ✅ @types | ✅ @types | ✅ Built-in | ✅ Built-in |
| **Maintenance** | ✅ Active | ⚠️ Stable | ✅ Active | ✅ Native |

**Decision**: svgson provides the best balance of features and ease of use.

---

## Installation

```bash
npm install svgson
```

TypeScript definitions are available:
```bash
npm install --save-dev @types/svgson
```

---

## API Overview

### Basic Usage

```typescript
import { parse, stringify } from 'svgson';

// Parse SVG to AST
const svgString = '<svg><rect x="10" y="10" width="50" height="50"/></svg>';
const ast = await parse(svgString);

// Modify AST
ast.children[0].attributes.x = '20';

// Stringify back to SVG
const newSvg = stringify(ast);
```

### AST Structure

```typescript
interface SvgsonNode {
  name: string;                    // Element tag name
  type: 'element' | 'text';        // Node type
  attributes: Record<string, string>; // All attributes
  children: SvgsonNode[];          // Child nodes
  value?: string;                  // Text content (for text nodes)
}
```

**Example**:
```typescript
{
  name: 'svg',
  type: 'element',
  attributes: {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 100 100',
    width: '100',
    height: '100'
  },
  children: [
    {
      name: 'rect',
      type: 'element',
      attributes: {
        x: '10',
        y: '10',
        width: '50',
        height: '50',
        fill: '#0000FF'
      },
      children: []
    },
    {
      name: 'text',
      type: 'element',
      attributes: {
        x: '35',
        y: '35',
        'text-anchor': 'middle'
      },
      children: [
        {
          name: '',
          type: 'text',
          value: 'Hello',
          children: []
        }
      ]
    }
  ]
}
```

---

## Integration with PlantEdit

### 1. Parse PlantUML SVG

```typescript
import { parse } from 'svgson';

async function parsePlantUMLSVG(svgString: string): Promise<SvgsonNode> {
  try {
    const ast = await parse(svgString, {
      // Options
      camelCase: false,  // Keep kebab-case attributes (x-link-href)
      transformNode: (node) => {
        // Optional: transform nodes during parsing
        return node;
      }
    });

    return ast;
  } catch (error) {
    throw new Error(`Failed to parse SVG: ${error.message}`);
  }
}
```

### 2. Extract Visual Properties

Use svgson AST with PlantUML knowledge (from svg-generation-patterns.md):

```typescript
import { SvgsonNode } from 'svgson';

function findActivityNodes(svgAst: SvgsonNode): ActivityNode[] {
  const nodes: ActivityNode[] = [];

  // Find all rounded rectangles (Activity nodes)
  traverse(svgAst, (node) => {
    if (node.name === 'rect' &&
        node.attributes.rx === '12.5' &&
        node.attributes.ry === '12.5') {

      // Extract visual properties
      const activityNode: ActivityNode = {
        id: generateId(),
        type: 'activity',
        position: {
          x: parseFloat(node.attributes.x || '0'),
          y: parseFloat(node.attributes.y || '0')
        },
        size: {
          width: parseFloat(node.attributes.width || '0'),
          height: parseFloat(node.attributes.height || '0')
        },
        style: {
          fill: node.attributes.fill,
          stroke: node.attributes.stroke,
          strokeWidth: node.attributes['stroke-width']
        },
        // Reference to svgson node
        svgElement: node
      };

      // Find text label
      const parent = findParent(svgAst, node);
      const textNode = parent?.children.find(c => c.name === 'text');
      if (textNode) {
        activityNode.label = extractText(textNode);
      }

      nodes.push(activityNode);
    }
  });

  return nodes;
}

// Helper: Traverse AST
function traverse(node: SvgsonNode, callback: (node: SvgsonNode) => void) {
  callback(node);
  for (const child of node.children) {
    traverse(child, callback);
  }
}

// Helper: Extract text content
function extractText(textNode: SvgsonNode): string {
  return textNode.children
    .filter(c => c.type === 'text')
    .map(c => c.value || '')
    .join('');
}
```

### 3. Modify and Regenerate SVG

```typescript
import { stringify } from 'svgson';

async function updateNodePosition(
  svgAst: SvgsonNode,
  nodeId: string,
  newPosition: Point
): Promise<string> {
  // Find node in AST
  const node = findNodeById(svgAst, nodeId);

  if (node && node.name === 'rect') {
    // Update position
    node.attributes.x = String(newPosition.x);
    node.attributes.y = String(newPosition.y);

    // Also update parent's transform if needed
    const parent = findParent(svgAst, node);
    if (parent && parent.attributes.transform) {
      // Parse and update transform
      parent.attributes.transform = updateTransform(
        parent.attributes.transform,
        newPosition
      );
    }
  }

  // Regenerate SVG
  return stringify(svgAst, {
    // Options
    selfClose: true,  // <rect /> vs <rect></rect>
    transformAttr: (key, value) => {
      // Optional: transform attributes during stringification
      return { key, value };
    }
  });
}
```

### 4. Two-Parser Integration

svgson works alongside tree-sitter-plantuml:

```typescript
import Parser from 'tree-sitter';
import PlantUML from 'tree-sitter-plantuml';
import { parse as parseSVG, stringify } from 'svgson';

async function createDomainModel(
  plantUMLCode: string,
  svgString: string
): Promise<DiagramModel> {

  // 1. Parse PlantUML source (tree-sitter)
  const tsParser = new Parser();
  tsParser.setLanguage(PlantUML);
  const sourceTree = tsParser.parse(plantUMLCode);

  // 2. Parse SVG (svgson)
  const svgAst = await parseSVG(svgString);

  // 3. Extract nodes from SVG
  const visualNodes = extractNodesFromSVG(svgAst);

  // 4. Map to source locations (from tree-sitter)
  const sourceMap = createSourceMap(sourceTree, visualNodes);

  // 5. Create complete domain model
  const domainModel: DiagramModel = {
    type: detectDiagramType(sourceTree),
    nodes: visualNodes.map((vNode, index) => ({
      ...vNode,
      sourceLocation: sourceMap[index]
    })),
    edges: extractEdgesFromSVG(svgAst),
    metadata: extractMetadata(svgAst),
    originalCode: plantUMLCode,
    originalSVG: svgString,
    // AST references
    sourceAST: sourceTree,
    svgAST: svgAst
  };

  return domainModel;
}
```

---

## Usage Patterns

### Pattern 1: Query by Selector

Find nodes matching PlantUML patterns:

```typescript
function findNodesByPattern(
  svgAst: SvgsonNode,
  pattern: { name?: string; attributes?: Record<string, string> }
): SvgsonNode[] {
  const results: SvgsonNode[] = [];

  traverse(svgAst, (node) => {
    if (pattern.name && node.name !== pattern.name) return;

    if (pattern.attributes) {
      for (const [key, value] of Object.entries(pattern.attributes)) {
        if (node.attributes[key] !== value) return;
      }
    }

    results.push(node);
  });

  return results;
}

// Usage: Find all activity nodes
const activityNodes = findNodesByPattern(svgAst, {
  name: 'rect',
  attributes: { rx: '12.5', ry: '12.5' }
});
```

### Pattern 2: Extract PlantUML Metadata

PlantUML adds semantic metadata to SVG (see svg-generation-patterns.md):

```typescript
function extractMetadata(node: SvgsonNode): Record<string, string> {
  const metadata: Record<string, string> = {};

  // PlantUML metadata attributes
  const metaKeys = [
    'data-entity',
    'data-entity-uid',
    'data-qualified-name',
    'data-participant',
    'data-participant-1',
    'data-participant-2',
    'class',
    'id'
  ];

  for (const key of metaKeys) {
    if (node.attributes[key]) {
      metadata[key] = node.attributes[key];
    }
  }

  return metadata;
}
```

### Pattern 3: Transform Coordinates

Handle nested transforms:

```typescript
function getAbsolutePosition(
  svgAst: SvgsonNode,
  node: SvgsonNode
): Point {
  let x = parseFloat(node.attributes.x || '0');
  let y = parseFloat(node.attributes.y || '0');

  // Walk up tree, accumulate transforms
  let current = findParent(svgAst, node);
  while (current && current.name !== 'svg') {
    if (current.attributes.transform) {
      const transform = parseTransform(current.attributes.transform);
      if (transform.type === 'translate') {
        x += transform.x;
        y += transform.y;
      }
    }
    current = findParent(svgAst, current);
  }

  return { x, y };
}

function parseTransform(transform: string): { type: string; x: number; y: number } {
  // Parse "translate(x,y)" or "translate(x y)"
  const match = transform.match(/translate\(([^,\s]+)[,\s]+([^)]+)\)/);
  if (match) {
    return {
      type: 'translate',
      x: parseFloat(match[1]),
      y: parseFloat(match[2])
    };
  }
  return { type: 'none', x: 0, y: 0 };
}
```

### Pattern 4: Path Parents

Find parent group for context:

```typescript
function findParent(
  ast: SvgsonNode,
  target: SvgsonNode,
  current: SvgsonNode = ast
): SvgsonNode | null {
  for (const child of current.children) {
    if (child === target) {
      return current;
    }
    const found = findParent(ast, target, child);
    if (found) return found;
  }
  return null;
}
```

---

## Performance Considerations

### 1. Caching Parsed AST

```typescript
class SVGCache {
  private cache = new Map<string, SvgsonNode>();

  async parse(svgString: string): Promise<SvgsonNode> {
    const hash = hashString(svgString);

    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    const ast = await parseSVG(svgString);
    this.cache.set(hash, ast);
    return ast;
  }

  clear() {
    this.cache.clear();
  }
}
```

### 2. Build Node Index

For fast lookups:

```typescript
class SVGIndex {
  private byId = new Map<string, SvgsonNode>();
  private byMetadata = new Map<string, SvgsonNode[]>();

  constructor(ast: SvgsonNode) {
    this.buildIndex(ast);
  }

  private buildIndex(node: SvgsonNode) {
    // Index by ID
    if (node.attributes.id) {
      this.byId.set(node.attributes.id, node);
    }

    // Index by metadata
    if (node.attributes['data-entity-uid']) {
      const uid = node.attributes['data-entity-uid'];
      if (!this.byMetadata.has(uid)) {
        this.byMetadata.set(uid, []);
      }
      this.byMetadata.get(uid)!.push(node);
    }

    // Recurse
    for (const child of node.children) {
      this.buildIndex(child);
    }
  }

  getById(id: string): SvgsonNode | undefined {
    return this.byId.get(id);
  }

  getByUID(uid: string): SvgsonNode[] {
    return this.byMetadata.get(uid) || [];
  }
}
```

### 3. Lazy Traversal

Don't traverse entire tree if not needed:

```typescript
function findFirst(
  ast: SvgsonNode,
  predicate: (node: SvgsonNode) => boolean
): SvgsonNode | null {
  if (predicate(ast)) return ast;

  for (const child of ast.children) {
    const found = findFirst(child, predicate);
    if (found) return found;  // Stop early
  }

  return null;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
import { parse, stringify } from 'svgson';

describe('SVG Parsing', () => {
  it('should parse simple rect', async () => {
    const svg = '<svg><rect x="10" y="20" width="30" height="40"/></svg>';
    const ast = await parse(svg);

    expect(ast.name).toBe('svg');
    expect(ast.children[0].name).toBe('rect');
    expect(ast.children[0].attributes.x).toBe('10');
  });

  it('should handle nested groups', async () => {
    const svg = `
      <svg>
        <g transform="translate(10,20)">
          <rect x="5" y="5" width="10" height="10"/>
        </g>
      </svg>
    `;
    const ast = await parse(svg);

    const group = ast.children[0];
    expect(group.name).toBe('g');
    expect(group.attributes.transform).toBe('translate(10,20)');
  });

  it('should preserve all attributes', async () => {
    const svg = '<svg><rect data-entity="MyClass" data-uid="123"/></svg>';
    const ast = await parse(svg);

    const rect = ast.children[0];
    expect(rect.attributes['data-entity']).toBe('MyClass');
    expect(rect.attributes['data-uid']).toBe('123');
  });
});

describe('SVG Stringification', () => {
  it('should roundtrip correctly', async () => {
    const original = '<svg><rect x="10" y="20"/></svg>';
    const ast = await parse(original);
    const regenerated = stringify(ast);

    // Parse both and compare structures (whitespace may differ)
    const ast1 = await parse(original);
    const ast2 = await parse(regenerated);
    expect(ast1).toEqual(ast2);
  });

  it('should apply modifications', async () => {
    const svg = '<svg><rect x="10" y="20"/></svg>';
    const ast = await parse(svg);

    ast.children[0].attributes.x = '30';
    const modified = stringify(ast);

    expect(modified).toContain('x="30"');
  });
});
```

### Integration Tests

Test with real PlantUML SVGs:

```typescript
describe('PlantUML SVG Parsing', () => {
  it('should parse activity diagram', async () => {
    const plantUMLSVG = await generateSVG(`
      @startuml
      :Activity 1;
      :Activity 2;
      @enduml
    `);

    const ast = await parse(plantUMLSVG);
    const activityNodes = findActivityNodes(ast);

    expect(activityNodes).toHaveLength(2);
    expect(activityNodes[0].label).toBe('Activity 1');
  });

  it('should extract metadata', async () => {
    const plantUMLSVG = await generateClassDiagram();
    const ast = await parse(plantUMLSVG);

    const entities = findNodesByPattern(ast, {
      attributes: { 'data-entity': '*' }  // Wildcard
    });

    expect(entities.length).toBeGreaterThan(0);
  });
});
```

---

## Error Handling

### Graceful Degradation

```typescript
async function safeParseSVG(svgString: string): Promise<SvgsonNode | null> {
  try {
    return await parse(svgString);
  } catch (error) {
    console.error('SVG parsing failed:', error);

    // Attempt fallback: Use browser DOM parser
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') {
        return null;
      }

      // Convert DOM to svgson-like structure manually
      return domToSvgson(doc.documentElement);
    } catch (fallbackError) {
      console.error('Fallback parsing failed:', fallbackError);
      return null;
    }
  }
}
```

### Validation

```typescript
function validateSVGAst(ast: SvgsonNode): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (ast.name !== 'svg') {
    errors.push('Root element must be <svg>');
  }

  if (!ast.attributes.viewBox && !ast.attributes.width) {
    errors.push('SVG must have viewBox or width/height');
  }

  // Check for PlantUML markers
  const hasPlantUMLComment = JSON.stringify(ast).includes('<!--SRC=');
  if (!hasPlantUMLComment) {
    errors.push('Warning: May not be PlantUML-generated SVG');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## TypeScript Types

### Type Definitions

```typescript
import { SvgsonNode } from 'svgson';

// Extend with PlantEdit-specific metadata
interface ExtendedSvgsonNode extends SvgsonNode {
  // Index in parent's children array
  index?: number;

  // Cached absolute position
  absolutePosition?: Point;

  // Reference to parent (not in svgson by default)
  parent?: ExtendedSvgsonNode;

  // PlantEdit metadata
  metadata?: {
    nodeType?: string;
    diagramType?: string;
    semanticId?: string;
  };
}

// Helper to build parent references
function buildParentRefs(
  node: SvgsonNode,
  parent?: ExtendedSvgsonNode
): ExtendedSvgsonNode {
  const extended = node as ExtendedSvgsonNode;
  extended.parent = parent;

  extended.children = extended.children.map((child, index) => {
    const extendedChild = buildParentRefs(child, extended);
    extendedChild.index = index;
    return extendedChild;
  });

  return extended;
}
```

---

## Best Practices

1. **Always use async/await** - svgson API is promise-based
2. **Cache parsed ASTs** - Parsing is relatively fast but caching helps
3. **Build indexes** - For frequent lookups, build node indexes
4. **Validate SVG** - Check that SVG is PlantUML-generated
5. **Handle errors gracefully** - SVG parsing can fail
6. **Test roundtrips** - Ensure parse → modify → stringify works
7. **Use PlantUML metadata** - Leverage data-* attributes for reliability

---

## References

- **svgson npm**: https://www.npmjs.com/package/svgson
- **svgson GitHub**: https://github.com/elrumordelaluz/svgson
- **TypeScript types**: @types/svgson
- **PlantUML SVG patterns**: ../plantuml/svg-generation-patterns.md

---

**Version**: 1.0
**Status**: Specification Complete
**Integration**: Ready for PlantEdit Layer 1 implementation
