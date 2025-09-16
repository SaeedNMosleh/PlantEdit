// PlantEdit - Simple SVG editor with real-time auto-routing

class PlantEdit {
    constructor() {
        this.plantumlInput = document.getElementById('plantuml-input');
        this.generateBtn = document.getElementById('generate-btn');
        this.svgContainer = document.getElementById('svg-container');
        this.exportBtn = document.getElementById('export-btn');
        this.exportPngBtn = document.getElementById('export-png-btn');
        this.toggleEditBtn = document.getElementById('toggle-edit-btn');
        this.zoomFitBtn = document.getElementById('zoom-fit-btn');
        this.zoomResetBtn = document.getElementById('zoom-reset-btn');
        this.statusText = document.getElementById('status-text');

        this.isEditMode = false;
        this.svgElement = null;
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;

        // D3 behaviors
        this.zoomBehavior = null;
        this.dragBehavior = null;

        this.initializeEventListeners();
        this.initializeCollapsiblePanels();
    }

    initializeEventListeners() {
        this.generateBtn.addEventListener('click', () => this.handleGenerate());
        this.exportBtn.addEventListener('click', () => this.handleExportSVG());
        this.exportPngBtn?.addEventListener('click', () => this.handleExportPNG());
        this.toggleEditBtn.addEventListener('click', () => this.handleToggleEdit());
        this.zoomFitBtn?.addEventListener('click', () => this.handleZoomFit());
        this.zoomResetBtn?.addEventListener('click', () => this.handleZoomReset());
    }

    initializeCollapsiblePanels() {
        const collapseButtons = document.querySelectorAll('.collapse-btn');
        collapseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) {
                    target.classList.toggle('collapsed');
                    btn.textContent = target.classList.contains('collapsed') ? '+' : '−';
                }
            });
        });
    }

    async handleGenerate() {
        const plantumlText = this.plantumlInput.value.trim();
        if (!plantumlText) {
            alert('Please enter PlantUML syntax.');
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('Generating diagram...');

            const svgText = await window.PlantUMLEncoder.generateSVG(plantumlText);
            console.log('Generated SVG text:', svgText);
            if (svgText) {
                this.displaySVG(svgText);
                this.updateStatus('Diagram generated successfully');
            }
        } catch (error) {
            console.error('Error generating diagram:', error);
            alert('Error generating diagram. Please check your PlantUML syntax.');
            this.updateStatus('Error generating diagram');
        } finally {
            this.showLoading(false);
        }
    }

    displaySVG(svgText) {
        console.log('Displaying SVG, text length:', svgText.length);
        // Clear container and insert SVG
        this.svgContainer.innerHTML = svgText;
        this.svgElement = this.svgContainer.querySelector('svg');
        console.log('SVG element found:', !!this.svgElement);

        if (this.svgElement) {
            // Setup full canvas viewport
            this.setupFullCanvasViewport();

            // Parse nodes and edges
            const { nodes, edges } = window.DiagramParser.parseSVG(this.svgElement);
            this.nodes = nodes;
            this.edges = edges;

            console.log(`Loaded ${this.nodes.length} nodes and ${this.edges.length} edges`);
            console.log('Nodes:', this.nodes.map(n => ({ id: n.id, element: n.element.tagName })));
            console.log('Edges:', this.edges.map(e => ({ source: e.source?.id, target: e.target?.id, element: e.element.tagName })));

            // Skip auto-layout initially to preserve original diagram appearance
            // this.applyAutoLayout();

            // Initialize D3 zoom and pan
            this.initializeZoomPan();

            // Initialize selection and dragging if in edit mode
            if (this.isEditMode) {
                this.enableEditMode();
            }
        } else {
            console.error('No SVG element found in container');
        }
    }

    setupFullCanvasViewport() {
        // Minimal changes - just make it fit the container properly
        // Don't modify viewBox or other attributes that could deform the diagram
        this.svgElement.style.width = '100%';
        this.svgElement.style.height = 'auto';
        this.svgElement.style.maxWidth = '100%';
    }

    initializeZoomPan() {
        if (!this.svgElement) return;

        // Create a main group for all content
        const existingContent = Array.from(this.svgElement.children);
        const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mainGroup.setAttribute('class', 'main-content-group');

        // Move all existing content into the main group
        existingContent.forEach(child => {
            mainGroup.appendChild(child);
        });
        this.svgElement.appendChild(mainGroup);

        // Create zoom behavior that only affects the main group
        this.zoomBehavior = d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                // Apply zoom transform only to the main content group
                d3.select(mainGroup)
                    .attr('transform', event.transform);
            });

        // Apply zoom to SVG
        d3.select(this.svgElement).call(this.zoomBehavior);

        // Disable double-click zoom
        d3.select(this.svgElement).on('dblclick.zoom', null);

        // Reset to normal zoom level
        this.resetZoomToNormal();
    }

    initializeDragBehavior() {
        if (!this.svgElement) return;

        this.dragBehavior = d3.drag()
            .on('start', (event, d) => {
                // Prevent zoom during drag
                event.sourceEvent.stopPropagation();

                // Find the node being dragged
                const nodeElement = event.sourceEvent.target.closest('g');
                const node = this.nodes.find(n => n.element === nodeElement);

                if (node) {
                    // Select the node
                    this.selectNode(node);
                }
            })
            .on('drag', (event, d) => {
                const nodeElement = event.sourceEvent.target.closest('g');
                const node = this.nodes.find(n => n.element === nodeElement);

                if (node) {
                    // Convert screen coordinates to SVG coordinates
                    const mainGroup = this.svgElement.querySelector('.main-content-group');
                    const svgPoint = this.screenToSVGPoint(event.x, event.y);
                    const lastSvgPoint = this.screenToSVGPoint(event.x - event.dx, event.y - event.dy);

                    const dx = svgPoint.x - lastSvgPoint.x;
                    const dy = svgPoint.y - lastSvgPoint.y;

                    // Update node position
                    node.tx = (node.tx || 0) + dx;
                    node.ty = (node.ty || 0) + dy;

                    // Apply transform
                    const baseTransform = node.baseTransform || '';
                    const newTransform = `${baseTransform} translate(${node.tx}, ${node.ty})`.trim();
                    node.element.setAttribute('transform', newTransform);

                    // Real-time edge routing
                    this.updateConnectedEdges(node);
                }
            })
            .on('end', (event, d) => {
                // Final edge update
                this.updateAllEdges();
            });
    }

    updateConnectedEdges(movedNode) {
        console.log('Updating connected edges for node:', movedNode.id);
        console.log('All edges:', this.edges.map(e => ({ source: e.source?.id, target: e.target?.id })));
        // Find edges connected to this node
        const connectedEdges = this.edges.filter(edge =>
            edge.source === movedNode || edge.target === movedNode
        );
        console.log('Found connected edges:', connectedEdges.length);

        // Update each connected edge using smart routing
        connectedEdges.forEach(edge => {
            if (edge.source && edge.target) {
                console.log('Recalculating path for edge between', edge.source.id, 'and', edge.target.id);
                this.calculateSmartEdgePath(edge);
            } else {
                console.warn('Edge missing source or target:', edge);
            }
        });
    }

    calculateSmartEdgePath(edge) {
        const sourceBox = this.getNodeBoundingBox(edge.source);
        const targetBox = this.getNodeBoundingBox(edge.target);

        if (sourceBox && targetBox) {
            // Calculate connection points
            const connectionPoints = this.getOptimalConnectionPoints(sourceBox, targetBox);

            // Use orthogonal routing
            const path = this.generateOrthogonalPath(
                connectionPoints.source.x, connectionPoints.source.y,
                connectionPoints.target.x, connectionPoints.target.y
            );

            // Update the edge path
            edge.element.setAttribute('d', path);
        }
    }

    getNodeBoundingBox(node) {
        try {
            const rect = node.element.querySelector('rect');
            if (rect) {
                const bbox = rect.getBBox();
                const transform = node.element.getAttribute('transform') || '';

                // Parse translate values
                let tx = node.tx || 0;
                let ty = node.ty || 0;

                return {
                    x: bbox.x + tx,
                    y: bbox.y + ty,
                    width: bbox.width,
                    height: bbox.height,
                    centerX: bbox.x + tx + bbox.width / 2,
                    centerY: bbox.y + ty + bbox.height / 2
                };
            }
        } catch (e) {
            console.warn('Could not get bounding box for node:', e);
        }
        return null;
    }

    getOptimalConnectionPoints(sourceBox, targetBox) {
        const dx = targetBox.centerX - sourceBox.centerX;
        const dy = targetBox.centerY - sourceBox.centerY;

        let sourcePoint, targetPoint;

        // Determine connection direction
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal connection
            if (dx > 0) {
                sourcePoint = { x: sourceBox.x + sourceBox.width, y: sourceBox.centerY };
                targetPoint = { x: targetBox.x, y: targetBox.centerY };
            } else {
                sourcePoint = { x: sourceBox.x, y: sourceBox.centerY };
                targetPoint = { x: targetBox.x + targetBox.width, y: targetBox.centerY };
            }
        } else {
            // Vertical connection
            if (dy > 0) {
                sourcePoint = { x: sourceBox.centerX, y: sourceBox.y + sourceBox.height };
                targetPoint = { x: targetBox.centerX, y: targetBox.y };
            } else {
                sourcePoint = { x: sourceBox.centerX, y: sourceBox.y };
                targetPoint = { x: targetBox.centerX, y: targetBox.y + targetBox.height };
            }
        }

        return { source: sourcePoint, target: targetPoint };
    }

    generateOrthogonalPath(sourceX, sourceY, targetX, targetY) {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;

        // Create orthogonal path with smart routing
        if (Math.abs(dx) >= Math.abs(dy)) {
            // Horizontal preference
            const midX = sourceX + dx / 2;
            return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
        } else {
            // Vertical preference
            const midY = sourceY + dy / 2;
            return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
        }
    }

    updateAllEdges() {
        if (!this.svgElement) return;

        this.edges.forEach(edge => {
            if (edge.source && edge.target) {
                this.calculateSmartEdgePath(edge);
            }
        });
    }

    applyAutoLayout() {
        if (!window.dagre || this.nodes.length === 0) return;

        // Create a new directed graph
        const g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: 'TB',
            nodesep: 50,
            ranksep: 80,
            marginx: 20,
            marginy: 20
        });
        g.setDefaultEdgeLabel(() => ({}));

        // Add nodes to the graph
        this.nodes.forEach(node => {
            const bbox = this.getNodeBoundingBox(node);
            if (bbox) {
                g.setNode(node.id, {
                    width: bbox.width,
                    height: bbox.height,
                    node: node
                });
            }
        });

        // Add edges to the graph
        this.edges.forEach(edge => {
            if (edge.source && edge.target) {
                g.setEdge(edge.source.id, edge.target.id, { edge: edge });
            }
        });

        // Run the layout algorithm
        dagre.layout(g);

        // Apply the calculated positions
        g.nodes().forEach(nodeId => {
            const nodeData = g.node(nodeId);
            const node = nodeData.node;

            // Calculate offset from original position
            const originalBbox = this.getNodeBoundingBox(node);
            if (originalBbox) {
                node.tx = nodeData.x - originalBbox.x - originalBbox.width / 2;
                node.ty = nodeData.y - originalBbox.y - originalBbox.height / 2;

                // Apply the transform
                const baseTransform = node.baseTransform || '';
                const newTransform = `${baseTransform} translate(${node.tx}, ${node.ty})`.trim();
                node.element.setAttribute('transform', newTransform);
            }
        });

        // Update all edges after layout
        this.updateAllEdges();

        console.log('Auto-layout applied using Dagre');
    }

    screenToSVGPoint(x, y) {
        const pt = this.svgElement.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const svgCTM = this.svgElement.getScreenCTM();
        if (!svgCTM) return { x: 0, y: 0 };
        const transformed = pt.matrixTransform(svgCTM.inverse());
        return { x: transformed.x, y: transformed.y };
    }

    selectNode(node) {
        // Clear previous selection
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
        }

        // Select new node
        this.selectedNode = node;
        if (node) {
            node.element.classList.add('selected');
        }
    }

    enableEditMode() {
        console.log('Enabling edit mode, nodes count:', this.nodes.length);
        if (!this.svgElement) {
            console.error('No SVG element for edit mode');
            return;
        }

        this.initializeDragBehavior();
        console.log('Drag behavior initialized:', !!this.dragBehavior);

        // Make nodes draggable and selectable
        this.nodes.forEach(node => {
            const nodeSelection = d3.select(node.element);
            console.log('Making node draggable:', node.id, node.element.tagName);

            // Add visual feedback
            node.element.classList.add('editable');

            // Apply drag behavior
            nodeSelection.call(this.dragBehavior);

            // Add click selection
            nodeSelection.on('click', (event) => {
                event.stopPropagation();
                this.selectNode(node);
            });
        });

        // Clear selection when clicking empty space
        d3.select(this.svgElement).on('click', () => {
            this.selectNode(null);
        });

        this.svgContainer.classList.add('edit-mode');

        // Reset zoom to normal when entering edit mode
        this.resetZoomToNormal();

        this.updateStatus('Edit mode enabled - drag nodes, auto-layout available');
    }

    disableEditMode() {
        if (!this.svgElement) return;

        // Remove edit behaviors
        this.nodes.forEach(node => {
            const nodeSelection = d3.select(node.element);
            node.element.classList.remove('editable', 'selected');
            nodeSelection.on('.drag', null);
            nodeSelection.on('click', null);
        });

        d3.select(this.svgElement).on('click', null);
        this.selectedNode = null;
        this.svgContainer.classList.remove('edit-mode');
        this.updateStatus('Edit mode disabled');
    }

    handleToggleEdit() {
        this.isEditMode = !this.isEditMode;
        this.toggleEditBtn.textContent = this.isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode';

        if (this.isEditMode) {
            this.enableEditMode();
        } else {
            this.disableEditMode();
        }
    }

    handleZoomFit() {
        if (!this.svgElement || this.nodes.length === 0) return;

        // Calculate bounds of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            const bbox = this.getNodeBoundingBox(node);
            if (bbox) {
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            }
        });

        if (minX !== Infinity) {
            const padding = 50;
            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;

            // Calculate scale to fit content in viewport
            const containerRect = this.svgContainer.getBoundingClientRect();
            const scaleX = (containerRect.width - 2 * padding) / contentWidth;
            const scaleY = (containerRect.height - 2 * padding) / contentHeight;
            const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

            // Center the content
            const centerX = (containerRect.width / 2) - ((minX + maxX) / 2) * scale;
            const centerY = (containerRect.height / 2) - ((minY + maxY) / 2) * scale;

            // Apply transform to main content group
            const mainGroup = this.svgElement.querySelector('.main-content-group');
            if (mainGroup) {
                d3.select(this.svgElement)
                    .transition()
                    .duration(750)
                    .call(this.zoomBehavior.transform, d3.zoomIdentity.translate(centerX, centerY).scale(scale));
            }

            this.updateStatus('Zoomed to fit content');
        }
    }

    handleZoomReset() {
        this.resetZoomToNormal();
    }

    resetZoomToNormal() {
        if (!this.svgElement) return;

        d3.select(this.svgElement)
            .transition()
            .duration(500)
            .call(this.zoomBehavior.transform, d3.zoomIdentity);

        this.updateStatus('Zoom reset to normal');
    }

    async handleExportSVG() {
        if (!this.svgElement) {
            alert('No diagram to export.');
            return;
        }

        const svgData = new XMLSerializer().serializeToString(this.svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        this.downloadBlob(blob, 'diagram.svg');
        this.updateStatus('SVG exported');
    }

    async handleExportPNG() {
        if (!this.plantumlInput.value.trim()) {
            alert('No diagram to export.');
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('Generating PNG...');

            const pngBlob = await window.PlantUMLEncoder.generatePNG(this.plantumlInput.value.trim());
            if (pngBlob) {
                this.downloadBlob(pngBlob, 'diagram.png');
                this.updateStatus('PNG exported');
            }
        } catch (error) {
            console.error('Error exporting PNG:', error);
            alert('Error exporting PNG.');
            this.updateStatus('Error exporting PNG');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        if (show) {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = 'Generating...';
        } else {
            this.generateBtn.disabled = false;
            this.generateBtn.textContent = 'Generate Diagram';
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    updateStatus(message) {
        if (this.statusText) {
            this.statusText.textContent = message;
            setTimeout(() => {
                if (this.statusText.textContent === message) {
                    this.statusText.textContent = 'Ready';
                }
            }, 3000);
        }
    }
}

// Initialize PlantEdit when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PlantEdit();
});