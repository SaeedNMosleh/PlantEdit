// Main application script for Scenario-Test Diagram Editor

const plantumlInput = document.getElementById('plantuml-input');
const generateBtn = document.getElementById('generate-btn');
const svgContainer = document.getElementById('svg-container');
const exportBtn = document.getElementById('export-btn');
const toggleEditBtn = document.getElementById('toggle-edit-btn');

let isEditMode = false;
let svgDoc = null;
let nodes = [];
let edges = [];
let draggedNode = null;
let offsetX = 0;
let offsetY = 0;
let startTx = 0;
let startTy = 0;
let dragStartSVG = null;

// Function to encode PlantUML text for server
function encodePlantUML(text) {
    const zlibData = pako.deflateRaw(text, { level: 9 });
    let r = "";
    for (let i = 0; i < zlibData.length; i += 3) {
        if (i + 2 === zlibData.length) {
            r += append3bytes(zlibData[i], zlibData[i + 1], 0);
        } else if (i + 1 === zlibData.length) {
            r += append3bytes(zlibData[i], 0, 0);
        } else {
            r += append3bytes(zlibData[i], zlibData[i + 1], zlibData[i + 2]);
        }
    }
    return r;
}

function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

function encode6bit(b) {
    if (b < 10) return String.fromCharCode(48 + b);
    b -= 10;
    if (b < 26) return String.fromCharCode(65 + b);
    b -= 26;
    if (b < 26) return String.fromCharCode(97 + b);
    b -= 26;
    return b === 0 ? '-' : '_';
}

// Function to fetch SVG from PlantUML server
async function generateSVG(plantumlText) {
    const encoded = encodePlantUML(plantumlText);
    const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to generate SVG');
        }
        const svgText = await response.text();
        return svgText;
    } catch (error) {
        console.error('Error generating SVG:', error);
        alert('Error generating diagram. Please check your PlantUML syntax.');
        return null;
    }
}

// Pointer conversion helpers
function svgPointFromEvent(e) {
    const pt = svgDoc.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svgDoc.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
}

function screenToSVGPointXY(x, y) {
    const pt = svgDoc.createSVGPoint();
    pt.x = x; pt.y = y;
    const ctm = svgDoc.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
}

function nodeBoxInSVG(el) {
    const r = el.getBoundingClientRect();
    const p1 = screenToSVGPointXY(r.left, r.top);
    const p2 = screenToSVGPointXY(r.right, r.bottom);
    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const bottom = Math.max(p1.y, p2.y);
    const width = right - left;
    const height = bottom - top;
    return {
        left, right, top, bottom, width, height,
        cx: left + width / 2,
        cy: top + height / 2
    };
}

// Function to parse SVG elements
function parseSVG() {
    nodes = [];
    edges = [];

    // Build nodes from rects grouped by nearest <g>
    const seen = new Set();
    const rects = svgDoc.querySelectorAll('rect');
    rects.forEach(rect => {
        const group = rect.closest('g') || rect;
        if (seen.has(group)) return;
        seen.add(group);

        const titleEl = group.querySelector('title');
        const id =
            (titleEl && titleEl.textContent && titleEl.textContent.trim()) ||
            group.id ||
            rect.id ||
            `node_${nodes.length}`;

        const baseTransform = group.getAttribute('transform') || '';
        nodes.push({
            element: group,
            id,
            baseTransform,
            tx: 0,
            ty: 0
        });
    });

    // Build edges from groups that contain a title like "a --> b"
    const gs = svgDoc.querySelectorAll('g');
    gs.forEach(g => {
        const titleEl = g.querySelector('title');
        const pathEl = g.querySelector('path');
        if (!pathEl) return;
        let src = null, tgt = null;
        if (titleEl && /-->\s*/.test(titleEl.textContent)) {
            const m = titleEl.textContent.match(/([\w-]+)\s*-->\s*([\w-]+)/);
            if (m) {
                const sId = m[1];
                const tId = m[2];
                src = nodes.find(n => n.id.includes(sId)) || null;
                tgt = nodes.find(n => n.id.includes(tId)) || null;
            }
        }
        edges.push({ element: pathEl, source: src, target: tgt });
    });

    // Fallback: any path with marker-end considered an edge if none found
    if (edges.length === 0) {
        svgDoc.querySelectorAll('path[marker-end]').forEach(p => {
            edges.push({ element: p, source: null, target: null });
        });
    }
}

// Function to calculate orthogonal path
function calculateOrthogonalPath(sourceX, sourceY, targetX, targetY) {
    if (Math.abs(targetX - sourceX) >= Math.abs(targetY - sourceY)) {
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
    } else {
        const midY = (sourceY + targetY) / 2;
        return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
    }
}

// Function to update edge paths
function updateEdges() {
    if (!svgDoc) return;
    const svgCTM = svgDoc.getScreenCTM();
    if (!svgCTM) return;

    // Helper: convert screen pixel to SVG coords
    function screenToSVGPoint(x, y) {
        const pt = svgDoc.createSVGPoint();
        pt.x = x; pt.y = y;
        const res = pt.matrixTransform(svgCTM.inverse());
        return { x: res.x, y: res.y };
    }

    // Helper: get node box in SVG coordinates from its screen box
    function getNodeBoxSVG(el) {
        const r = el.getBoundingClientRect();
        const p1 = screenToSVGPoint(r.left, r.top);
        const p2 = screenToSVGPoint(r.right, r.bottom);
        const left = Math.min(p1.x, p2.x);
        const right = Math.max(p1.x, p2.x);
        const top = Math.min(p1.y, p2.y);
        const bottom = Math.max(p1.y, p2.y);
        const width = right - left;
        const height = bottom - top;
        return {
            left, right, top, bottom, width, height,
            cx: left + width / 2,
            cy: top + height / 2
        };
    }

    function nearestNodeToPoint(pt) {
        let best = null;
        let bestD = Number.POSITIVE_INFINITY;
        nodes.forEach(n => {
            const b = getNodeBoxSVG(n.element);
            const dx = b.cx - pt.x;
            const dy = b.cy - pt.y;
            const d2 = dx*dx + dy*dy;
            if (d2 < bestD) {
                bestD = d2;
                best = n;
            }
        });
        return best;
    }

    function chooseConnectionPoints(boxA, boxB) {
        const leftA = { x: boxA.left, y: boxA.cy };
        const rightA = { x: boxA.right, y: boxA.cy };
        const topA = { x: boxA.cx, y: boxA.top };
        const bottomA = { x: boxA.cx, y: boxA.bottom };

        const leftB = { x: boxB.left, y: boxB.cy };
        const rightB = { x: boxB.right, y: boxB.cy };
        const topB = { x: boxB.cx, y: boxB.top };
        const bottomB = { x: boxB.cx, y: boxB.bottom };

        const dx = boxB.cx - boxA.cx;
        const dy = boxB.cy - boxA.cy;

        if (Math.abs(dx) >= Math.abs(dy)) {
            // Horizontal preference
            if (dx >= 0) {
                return { s: rightA, t: leftB };
            } else {
                return { s: leftA, t: rightB };
            }
        } else {
            // Vertical preference
            if (dy >= 0) {
                return { s: bottomA, t: topB };
            } else {
                return { s: topA, t: bottomB };
            }
        }
    }

    edges.forEach(edge => {
        let source = edge.source || null;
        let target = edge.target || null;

        // If not resolved, infer from current path endpoints
        if (!source || !target) {
            const path = edge.element;
            const total = path.getTotalLength ? path.getTotalLength() : 0;
            const pStart = total ? path.getPointAtLength(0.1) : { x: 0, y: 0 };
            const pEnd = total ? path.getPointAtLength(Math.max(0, total - 0.1)) : { x: 0, y: 0 };
            source = source || nearestNodeToPoint(pStart);
            target = target || nearestNodeToPoint(pEnd);
            edge.source = source;
            edge.target = target;
        }

        if (source && target) {
            const boxA = getNodeBoxSVG(source.element);
            const boxB = getNodeBoxSVG(target.element);
            const pts = chooseConnectionPoints(boxA, boxB);
            const newPath = calculateOrthogonalPath(pts.s.x, pts.s.y, pts.t.x, pts.t.y);
            edge.element.setAttribute('d', newPath);
        }
    });
}

// Function to display SVG in container
function displaySVG(svgText) {
    svgContainer.innerHTML = svgText;
    svgDoc = svgContainer.querySelector('svg');
    if (svgDoc) {
        // Make SVG responsive
        svgDoc.setAttribute('width', '100%');
        svgDoc.setAttribute('height', '100%');
        parseSVG();
        if (isEditMode) {
            enableDragging();
        }
    }
}

// Event listeners
generateBtn.addEventListener('click', async () => {
    const plantumlText = plantumlInput.value.trim();
    if (!plantumlText) {
        alert('Please enter PlantUML syntax.');
        return;
    }
    
    const svgText = await generateSVG(plantumlText);
    if (svgText) {
        displaySVG(svgText);
    }
});

exportBtn.addEventListener('click', () => {
    if (!svgDoc) {
        alert('No diagram to export.');
        return;
    }
    const svgData = new XMLSerializer().serializeToString(svgDoc);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
});

toggleEditBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    toggleEditBtn.textContent = isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode';
    if (isEditMode && svgDoc) {
        enableDragging();
    } else if (svgDoc) {
        disableDragging();
    }
});

// Annotation functions
function addAnnotation(node) {
    const box = nodeBoxInSVG(node.element);
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', 4);
    foreignObject.setAttribute('y', box.height + 4);
    foreignObject.setAttribute('width', Math.max(80, box.width - 8));
    foreignObject.setAttribute('height', 50);
    const div = document.createElement('div');
    div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    div.contentEditable = 'true';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.border = '1px solid #ccc';
    div.style.fontSize = '12px';
    div.style.background = 'rgba(255,255,255,0.85)';
    div.style.boxSizing = 'border-box';
    div.innerText = 'Add your note here...';
    foreignObject.appendChild(div);
    node.element.appendChild(foreignObject);
    node.annotation = foreignObject; // Moves with group transform
}

// Dragging functions
function enableDragging() {
    nodes.forEach(node => {
        const el = node.element;
        if (el.dataset.draggableOn === '1') return;
        el.dataset.draggableOn = '1';
        el.classList.add('editable');
        node._dbl = () => addAnnotation(node);
        el.addEventListener('mousedown', startDrag, false);
        el.addEventListener('dblclick', node._dbl, false);
        el.style.cursor = 'move';
    });
}

function disableDragging() {
    nodes.forEach(node => {
        const el = node.element;
        el.classList.remove('editable');
        el.style.cursor = 'default';
        el.removeEventListener('mousedown', startDrag, false);
        if (node._dbl) el.removeEventListener('dblclick', node._dbl, false);
        delete el.dataset.draggableOn;
    });
}

function startDrag(e) {
    const targetGroup = e.target.closest('g') || e.target;
    draggedNode = nodes.find(n => n.element === targetGroup);
    if (!draggedNode) return;
    dragStartSVG = svgPointFromEvent(e);
    startTx = draggedNode.tx || 0;
    startTy = draggedNode.ty || 0;
    document.addEventListener('mousemove', drag, false);
    document.addEventListener('mouseup', endDrag, false);
    e.preventDefault();
}

function drag(e) {
    if (!draggedNode) return;
    const p = svgPointFromEvent(e);
    const dx = p.x - dragStartSVG.x;
    const dy = p.y - dragStartSVG.y;
    const tx = startTx + dx;
    const ty = startTy + dy;
    draggedNode.tx = tx;
    draggedNode.ty = ty;
    const base = draggedNode.baseTransform || '';
    draggedNode.element.setAttribute('transform', `${base} translate(${tx}, ${ty})`);
    updateEdges();
}

function endDrag() {
    draggedNode = null;
    document.removeEventListener('mousemove', drag, false);
    document.removeEventListener('mouseup', endDrag, false);
}

// TODO: Add annotations