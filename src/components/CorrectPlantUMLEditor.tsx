/**
 * Correct PlantUML Editor - Enhanced for orthogonal routing and proper drag
 * - Uses D3 for drag with anchored pointer offsets
 * - Recomputes orthogonal (Manhattan) paths live while dragging
 * - Reorients arrowheads based on final segment direction
 * - Keeps exact drag positions (no automatic node repositioning)
 * - Dynamically updates viewBox to fit all content (entities + links)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface CorrectPlantUMLEditorProps {
  svgContent: string;
  onSVGUpdate?: (updatedSVG: string) => void;
}

type XY = { x: number; y: number };
type EntityBox = {
  id: string;
  group: SVGGElement;
  rect: SVGRectElement;
  texts: SVGTextElement[];
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};
type LinkInfo = {
  group: SVGGElement;
  path: SVGPathElement;
  polygon: SVGPolygonElement | null;
  srcId: string;
  dstId: string;
};

export const CorrectPlantUMLEditor: React.FC<CorrectPlantUMLEditorProps> = ({
  svgContent,
  onSVGUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Caches for fast lookup during drag
  const entityMapRef = useRef<Map<string, EntityBox>>(new Map());
  const linksRef = useRef<LinkInfo[]>([]);

  // Drag state per group
  const dragOffsetRef = useRef(new WeakMap<SVGGElement, { dx: number; dy: number }>());
  const lastRectPosRef = useRef(new WeakMap<SVGGElement, { x: number; y: number }>());

  // rAF throttling for live updates
  const movedEntitiesRef = useRef<Set<string>>(new Set());
  const rafIdRef = useRef<number | null>(null);

  const initializeEditor = useCallback(() => {
    if (!containerRef.current || !svgContent) return;

    // Inject original PlantUML SVG content
    containerRef.current.innerHTML = svgContent;

    const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement | null;
    if (!svgElement) return;

    // Build caches
    entityMapRef.current = buildEntityMap(svgElement);
    linksRef.current = buildLinks(svgElement);

    // Find draggable entities that contain both a rect and at least one text
    const allEntities = Array.from(svgElement.querySelectorAll('g.entity')) as SVGGElement[];
    const draggableEntities = allEntities.filter(
      (g) => g.querySelector('rect') && g.querySelector('text')
    );

    // Apply D3 drag behavior
    applyDragBehavior(draggableEntities, svgElement);

    // Set initial viewBox to encompass all content
    updateViewBoxEnhanced(svgElement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgContent]);

  useEffect(() => {
    initializeEditor();
  }, [initializeEditor]);

  // Build a map of entities by their PlantUML data-entity attribute
  const buildEntityMap = (svgElement: SVGSVGElement): Map<string, EntityBox> => {
    const map = new Map<string, EntityBox>();
    const groups = svgElement.querySelectorAll('g.entity');

    groups.forEach((group) => {
      const g = group as SVGGElement;
      const id = g.getAttribute('data-entity') || g.getAttribute('id') || '';
      const rect = g.querySelector('rect') as SVGRectElement | null;
      const texts = Array.from(g.querySelectorAll('text')) as SVGTextElement[];

      if (!id || !rect || texts.length === 0) return;

      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');
      const cx = x + width / 2;
      const cy = y + height / 2;

      map.set(id, {
        id,
        group: g,
        rect,
        texts,
        x,
        y,
        width,
        height,
        cx,
        cy
      });
    });

    return map;
  };

  // Build a list of links using PlantUML data-entity-1/2 metadata
  const buildLinks = (svgElement: SVGSVGElement): LinkInfo[] => {
    const links: LinkInfo[] = [];
    const groups = svgElement.querySelectorAll('g.link');
    groups.forEach((group) => {
      const g = group as SVGGElement;
      const path = g.querySelector('path') as SVGPathElement | null;
      if (!path) return;
      const polygon = g.querySelector('polygon') as SVGPolygonElement | null;
      const srcId = g.getAttribute('data-entity-1') || '';
      const dstId = g.getAttribute('data-entity-2') || '';
      if (!srcId || !dstId) return;

      links.push({
        group: g,
        path,
        polygon,
        srcId,
        dstId
      });
    });
    return links;
  };

  // Choose side anchors on rectangle borders based on relative positions (orthogonal)
  const computeAnchors = (a: EntityBox, b: EntityBox): { start: XY; end: XY; horizontal: boolean } => {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Prefer horizontal when separation is wider
    if (absDx >= absDy) {
      const start: XY = {
        x: dx >= 0 ? a.x + a.width : a.x, // right or left edge center
        y: a.cy
      };
      const end: XY = {
        x: dx >= 0 ? b.x : b.x + b.width, // left or right edge center
        y: b.cy
      };
      return { start, end, horizontal: true };
    } else {
      const start: XY = {
        x: a.cx,
        y: dy >= 0 ? a.y + a.height : a.y // bottom or top edge center
      };
      const end: XY = {
        x: b.cx,
        y: dy >= 0 ? b.y : b.y + b.height // top or bottom edge center
      };
      return { start, end, horizontal: false };
    }
  };

  // Simple Manhattan route with 2-3 segments
  const manhattanRoute = (start: XY, end: XY, horizontalFirst: boolean): XY[] => {
    // Already aligned - straight line
    if (Math.abs(start.x - end.x) < 0.0001 || Math.abs(start.y - end.y) < 0.0001) {
      return [start, end];
    }

    if (horizontalFirst) {
      const midX = (start.x + end.x) / 2;
      return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
    } else {
      const midY = (start.y + end.y) / 2;
      return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
    }
  };

  // Build a path d string from points
  const buildPathD = (points: XY[]): string => {
    if (points.length === 0) return '';
    const p0 = points[0]!;
    let d = `M${fmt(p0.x)},${fmt(p0.y)} `;
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      d += `L${fmt(p.x)},${fmt(p.y)} `;
    }
    return d.trim();
  };

  // Compute arrowhead triangle at the end, oriented along final segment
  const computeArrowHeadPoints = (end: XY, prev: XY, size = 6): string => {
    const vx = end.x - prev.x;
    const vy = end.y - prev.y;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const ux = vx / len;
    const uy = vy / len;

    const baseX = end.x - ux * size;
    const baseY = end.y - uy * size;
    const perpX = -uy;
    const perpY = ux;
    const halfWidth = size * 0.6;

    const p1 = `${fmt(end.x)},${fmt(end.y)}`;
    const p2 = `${fmt(baseX + perpX * halfWidth)},${fmt(baseY + perpY * halfWidth)}`;
    const p3 = `${fmt(baseX - perpX * halfWidth)},${fmt(baseY - perpY * halfWidth)}`;
    return `${p1} ${p2} ${p3}`;
  };

  const fmt = (n: number) => Number(n.toFixed(2));

  // Update all edges connected to the given entity id (live during drag)
  const updateEdgesForEntity = (entityId: string) => {
    const links = linksRef.current;
    links.forEach((lnk) => {
      if (lnk.srcId !== entityId && lnk.dstId !== entityId) return;
      routeAndDrawLink(lnk);
    });
  };

  // Route and draw a single link using orthogonal polyline and oriented arrowhead
  const routeAndDrawLink = (lnk: LinkInfo) => {
    const a = entityMapRef.current.get(lnk.srcId);
    const b = entityMapRef.current.get(lnk.dstId);
    if (!a || !b) return;

    const { start, end, horizontal } = computeAnchors(a, b);
    const points = manhattanRoute(start, end, horizontal);
    lnk.path.setAttribute('d', buildPathD(points));

    if (lnk.polygon && points.length >= 2) {
      const last = points[points.length - 1] as XY;
      const prev = points[points.length - 2] as XY;
      lnk.polygon.setAttribute('points', computeArrowHeadPoints(last, prev, 6));
    }
  };

  // Recompute all links after global changes (e.g., after Dagre)
  const updateAllLinks = () => {
    linksRef.current.forEach((lnk) => routeAndDrawLink(lnk));
  };

  // Enhanced viewBox update to include entity rects, link paths, and arrow polygons
  const updateViewBoxEnhanced = (svgElement: SVGSVGElement) => {
    // Collect bounds from entity rects
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const entities = entityMapRef.current;
    entities.forEach((e) => {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + e.width);
      maxY = Math.max(maxY, e.y + e.height);
    });

    // Include link path bounding boxes
    linksRef.current.forEach((lnk) => {
      const bbox = lnk.path.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);

      if (lnk.polygon) {
        const pts = (lnk.polygon.getAttribute('points') || '')
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        for (let i = 0; i + 1 < pts.length; i += 2) {
          const px = pts[i];
          const py = pts[i + 1];
          if (Number.isFinite(px) && Number.isFinite(py)) {
            minX = Math.min(minX, px as number);
            minY = Math.min(minY, py as number);
            maxX = Math.max(maxX, px as number);
            maxY = Math.max(maxY, py as number);
          }
        }
      }
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return;
    }

    const padding = 50;
    const vbX = minX - padding;
    const vbY = minY - padding;
    const vbW = maxX - minX + 2 * padding;
    const vbH = maxY - minY + 2 * padding;

    // Update viewBox to fit all content
    svgElement.setAttribute('viewBox', `${fmt(vbX)} ${fmt(vbY)} ${fmt(vbW)} ${fmt(vbH)}`);

    // Ensure the rendered background area expands/shrinks with content without distortion:
    // 1) Keep preserveAspectRatio "none" so 1:1 mapping is maintained between viewBox and rendered pixels
    // 2) Explicitly set width/height (style + attributes) to match the viewBox extents
    const existingStyle = svgElement.getAttribute('style') || '';
    const bgMatch = existingStyle.match(/background:[^;]+;/i);
    const bg = bgMatch ? bgMatch[0] : '';

    const newStyle = `width:${fmt(vbW)}px;height:${fmt(vbH)}px;${bg}`.trim();
    svgElement.setAttribute('style', newStyle);
    svgElement.setAttribute('width', `${fmt(vbW)}px`);
    svgElement.setAttribute('height', `${fmt(vbH)}px`);
    svgElement.setAttribute('preserveAspectRatio', 'none');
  };

  const requestFrame = (svgElement: SVGSVGElement) => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      const moved = Array.from(movedEntitiesRef.current);
      movedEntitiesRef.current.clear();
      moved.forEach((id) => updateEdgesForEntity(id));
      updateViewBoxEnhanced(svgElement);
      rafIdRef.current = null;
    });
  };

  /**
   * Apply D3 drag behavior to PlantUML entity groups
   * - Anchors drag to rectangle top-left via pointer offset captured on start
   * - Moves all text elements by exact deltas to keep labels aligned
   * - Re-routes connected edges orthogonally live during drag
   */
  const applyDragBehavior = (entityGroups: SVGGElement[], svgElement: SVGSVGElement) => {
    const drag = d3
      .drag<SVGGElement, unknown>()
      .on('start', function (event) {
        setIsDragging(true);
        const group = this as SVGGElement;
        const rect = group.querySelector('rect') as SVGRectElement | null;
        if (!rect) return;

        const rectX = parseFloat(rect.getAttribute('x') || '0');
        const rectY = parseFloat(rect.getAttribute('y') || '0');

        // Anchor pointer offsets relative to rect top-left
        const dx = event.x - rectX;
        const dy = event.y - rectY;
        dragOffsetRef.current.set(group, { dx, dy });
        lastRectPosRef.current.set(group, { x: rectX, y: rectY });

        d3.select(group).style('cursor', 'grabbing');
      })
      .on('drag', function (event) {
        const group = this as SVGGElement;
        const rect = group.querySelector('rect') as SVGRectElement | null;
        if (!rect) return;

        const offset = dragOffsetRef.current.get(group) || { dx: 0, dy: 0 };

        const newX = event.x - offset.dx;
        const newY = event.y - offset.dy;

        const prev = lastRectPosRef.current.get(group) || {
          x: parseFloat(rect.getAttribute('x') || '0'),
          y: parseFloat(rect.getAttribute('y') || '0')
        };
        const deltaX = newX - prev.x;
        const deltaY = newY - prev.y;

        // Move rectangle
        rect.setAttribute('x', String(fmt(newX)));
        rect.setAttribute('y', String(fmt(newY)));

        // Move all text nodes by the same delta
        const texts = group.querySelectorAll('text') as NodeListOf<SVGTextElement>;
        texts.forEach((t) => {
          const cx = parseFloat(t.getAttribute('x') || '0');
          const cy = parseFloat(t.getAttribute('y') || '0');
          t.setAttribute('x', String(fmt(cx + deltaX)));
          t.setAttribute('y', String(fmt(cy + deltaY)));
        });

        lastRectPosRef.current.set(group, { x: newX, y: newY });

        // Update entity cache
        const entityId = group.getAttribute('data-entity') || group.getAttribute('id') || '';
        if (entityId) {
          const eb = entityMapRef.current.get(entityId);
          if (eb) {
            eb.x = newX;
            eb.y = newY;
            eb.cx = newX + eb.width / 2;
            eb.cy = newY + eb.height / 2;
            eb.rect = rect;
            eb.texts = Array.from(texts);
          }
          movedEntitiesRef.current.add(entityId);
          requestFrame(svgElement);
        }
      })
      .on('end', function () {
        setIsDragging(false);
        const group = this as SVGGElement;
        d3.select(group).style('cursor', 'grab');

        // After drag ends, recompute all edges orthogonally without moving node positions
        updateAllLinks();

        // Update viewBox after final placement
        updateViewBoxEnhanced(svgElement);

        // Notify parent of changes
        if (onSVGUpdate && containerRef.current) {
          const updatedSVG = containerRef.current.innerHTML;
          onSVGUpdate(updatedSVG);
        }
      });

    // Attach drag to each eligible entity group
    entityGroups.forEach((group) => {
      d3
        .select<SVGGElement, unknown>(group)
        .call(drag as d3.DragBehavior<SVGGElement, unknown, unknown>)
        .style('cursor', 'grab');
    });
  };


  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      />

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-medium">
        PlantUML Editor - Drag entities to rearrange; orthogonal edges auto-update
      </div>
    </div>
  );
};