// SVG diagram parsing functionality for extracting nodes and edges

function parseSVG(svgDoc) {
    const nodes = [];
    const edges = [];

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

    // Build edges from all paths - PlantUML structure varies
    const allPaths = svgDoc.querySelectorAll('path');
    console.log('Found', allPaths.length, 'path elements');
    
    allPaths.forEach(pathEl => {
        const parentGroup = pathEl.closest('g');
        const titleEl = parentGroup ? parentGroup.querySelector('title') : null;
        let src = null, tgt = null;
        
        if (titleEl) {
            console.log('Path parent title:', titleEl.textContent);
            
            // Try different arrow patterns
            const patterns = [
                /([\w-]+)\s*-->\s*([\w-]+)/,
                /([\w-]+)\s*->\s*([\w-]+)/,
                /(\w+).*?(\w+)/
            ];
            
            for (const pattern of patterns) {
                const m = titleEl.textContent.match(pattern);
                if (m && m[1] !== m[2]) {
                    const sId = m[1];
                    const tId = m[2];
                    console.log('Trying to match:', sId, '->', tId);
                    
                    // More flexible node matching
                    src = nodes.find(n =>
                        n.id === sId ||
                        n.id.includes(sId) ||
                        sId.includes(n.id)
                    ) || null;
                    tgt = nodes.find(n =>
                        n.id === tId ||
                        n.id.includes(tId) ||
                        tId.includes(n.id)
                    ) || null;
                    
                    console.log('Matched source:', src?.id, 'target:', tgt?.id);
                    if (src && tgt) break;
                }
            }
        }
        
        edges.push({ element: pathEl, source: src, target: tgt });
    });

    return { nodes, edges };
}

function findNodeById(nodes, id) {
    return nodes.find(n => n.id === id || n.id.includes(id));
}

function findNearestNodeToPoint(nodes, svgDoc, point) {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach(node => {
        const box = getNodeBoxSVG(svgDoc, node.element);
        const dx = box.cx - point.x;
        const dy = box.cy - point.y;
        const distance = dx * dx + dy * dy;

        if (distance < bestDistance) {
            bestDistance = distance;
            best = node;
        }
    });

    return best;
}

function getNodeBoxSVG(svgDoc, el) {
    const r = el.getBoundingClientRect();
    const svgCTM = svgDoc.getScreenCTM();
    if (!svgCTM) return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, cx: 0, cy: 0 };

    const pt = svgDoc.createSVGPoint();
    pt.x = r.left; pt.y = r.top;
    const p1 = pt.matrixTransform(svgCTM.inverse());
    pt.x = r.right; pt.y = r.bottom;
    const p2 = pt.matrixTransform(svgCTM.inverse());

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

// Export to global scope for CDN usage
window.DiagramParser = {
    parseSVG,
    findNodeById,
    findNearestNodeToPoint
};