import { useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';
import { IMPORTANCE, PHASE_COLORS } from '../utils/mcu';

// Ring color must match the page background so the badge reads as a cutout
// rather than a hard-edged circle sitting on top of the node — it has to be
// regenerated per theme rather than baked in as a static constant.
const checkBadge = (ringColor) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
      `<circle cx="10" cy="10" r="9.5" fill="#22c55e" stroke="${ringColor}" stroke-width="1"/>` +
      '<path d="M5.5 10.3l3 3 6-6.6" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
  )}`;

const SHOW_BADGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
    '<rect x="1.5" y="1.5" width="17" height="17" rx="4" fill="#334155" stroke="#94a3b8" stroke-width="1"/>' +
    '<rect x="4.5" y="5" width="11" height="7.5" rx="1" fill="none" stroke="#e2e8f0" stroke-width="1.4"/>' +
    '<path d="M7 15.5h6M10 12.5v3" stroke="#e2e8f0" stroke-width="1.4" stroke-linecap="round"/>' +
    '</svg>'
)}`;

const watchingBadge = (ringColor) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
      `<circle cx="10" cy="10" r="9.5" fill="#f59e0b" stroke="${ringColor}" stroke-width="1"/>` +
      '<path d="M10 5.2v5l3.3 3.3" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
  )}`;

// Grid tuning: phase bands always span the full container width. Movies
// pack 3-4 per row (fewer if the container is too narrow to keep them
// comfortably spaced), growing to fill the row rather than staying a fixed
// size, so phase boxes reach 100% width instead of hugging their content.
const NODE_H = 60;
const MIN_GAP = 18;
const ROW_GAP = 18;
const PHASE_GAP = 46;
const OUTER_PADDING = 24;
const TOP_PADDING = 40; // extra headroom so the first phase's label isn't clipped by the canvas edge
const PREFERRED_PER_ROW = 4;
const MIN_NODE_W = 150;
const MAX_NODE_W = 320;

function computeGrid(entries, phases, containerWidth) {
  const availableWidth = Math.max((containerWidth || 900) - OUTER_PADDING * 2, MIN_NODE_W);
  const itemsPerRow = Math.max(
    1,
    Math.min(PREFERRED_PER_ROW, Math.floor((availableWidth + MIN_GAP) / (MIN_NODE_W + MIN_GAP)))
  );
  const cellW = availableWidth / itemsPerRow;
  const nodeW = Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, cellW - MIN_GAP));
  const nodeTextW = Math.max(nodeW - 20, 60);

  const positions = new Map();
  let y = TOP_PADDING;

  for (const phase of phases) {
    const phaseEntries = entries
      .filter((e) => e.phase === phase.number)
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    if (phaseEntries.length === 0) continue;

    phaseEntries.forEach((entry, i) => {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const x = OUTER_PADDING + col * cellW + cellW / 2;
      const py = y + row * (NODE_H + ROW_GAP) + NODE_H / 2;
      positions.set(entry.id, { x, y: py });
    });

    const numRows = Math.ceil(phaseEntries.length / itemsPerRow);
    y += numRows * (NODE_H + ROW_GAP) + PHASE_GAP;
  }

  return { positions, nodeW, nodeTextW };
}

function buildElements(entries, phases, grid) {
  const phaseNodes = phases.map((phase) => ({
    data: { id: `phase-${phase.number}`, label: phase.name, phaseColor: PHASE_COLORS[phase.number] ?? '#8b93a7' },
    classes: 'phase-parent',
    selectable: false,
  }));

  const movieNodes = entries.map((entry) => ({
    data: {
      id: entry.id,
      label: entry.title,
      parent: `phase-${entry.phase}`,
      w: grid.nodeW,
      tw: grid.nodeTextW,
    },
    classes: `movie ${entry.type}`,
  }));

  const entryIds = new Set(entries.map((e) => e.id));
  const edges = [];
  for (const entry of entries) {
    for (const dep of entry.dependencies) {
      if (!entryIds.has(dep.id)) continue;
      edges.push({
        data: {
          id: `${dep.id}__${entry.id}`,
          source: dep.id,
          target: entry.id,
          color: IMPORTANCE[dep.importance]?.color ?? '#8b93a7',
        },
        classes: dep.importance,
      });
    }
  }

  return [...phaseNodes, ...movieNodes, ...edges];
}

// Cytoscape can't read CSS custom properties directly, so its palette is
// re-derived from the live computed values on <html> whenever the theme
// toggles — this keeps it in sync with index.css instead of duplicating hex
// values that could drift out of sync with the light/dark variable blocks.
function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#0f1117'),
    nodeFill: read('--node-fill', '#2b3040'),
    nodeText: read('--node-text', '#e9ebf2'),
    nodeBorder: read('--node-border', '#454b60'),
  };
}

function buildStyle(theme, badges) { return [
  {
    selector: 'node.phase-parent',
    style: {
      shape: 'roundrectangle',
      'background-color': 'data(phaseColor)',
      'background-opacity': 0.16,
      'border-width': 2,
      'border-color': 'data(phaseColor)',
      'border-opacity': 0.7,
      label: 'data(label)',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -6,
      'font-size': 15,
      'font-weight': 700,
      color: 'data(phaseColor)',
      'text-background-color': theme.bg,
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
      padding: '16px',
    },
  },
  {
    selector: 'node.movie',
    style: {
      shape: 'round-rectangle',
      'background-color': theme.nodeFill,
      width: 'data(w)',
      height: NODE_H,
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': 'data(tw)',
      'font-size': 13.5,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      color: theme.nodeText,
      'border-width': 1.5,
      'border-color': theme.nodeBorder,
      'transition-property': 'opacity, border-width, border-color, background-color',
      'transition-duration': 120,
    },
  },
  {
    selector: 'node.movie.show',
    style: {
      'border-style': 'dashed',
      'background-image': badges.show,
      'background-width': '16px',
      'background-height': '16px',
      'background-position-x': '0%',
      'background-position-y': '0%',
      'background-offset-x': -3,
      'background-offset-y': -3,
      'background-clip': 'none',
      'bounds-expansion': 6,
    },
  },
  {
    selector: 'node.movie.watched',
    style: {
      'background-image': badges.check,
      'background-width': '16px',
      'background-height': '16px',
      'background-position-x': '100%',
      'background-position-y': '0%',
      'background-offset-x': 3,
      'background-offset-y': -3,
      'background-clip': 'none',
      'bounds-expansion': 6,
      'background-opacity': 0.7,
      'border-color': '#22c55e',
      'border-width': 2.5,
    },
  },
  {
    selector: 'node.movie.show.watched',
    style: {
      'background-image': [badges.show, badges.check],
      'background-width': ['16px', '16px'],
      'background-height': ['16px', '16px'],
      'background-position-x': ['0%', '100%'],
      'background-position-y': ['0%', '0%'],
      'background-offset-x': [-3, 3],
      'background-offset-y': [-3, -3],
      'background-clip': ['none', 'none'],
    },
  },
  {
    selector: 'node.movie.watching',
    style: {
      'background-image': badges.watching,
      'background-width': '16px',
      'background-height': '16px',
      'background-position-x': '100%',
      'background-position-y': '0%',
      'background-offset-x': 3,
      'background-offset-y': -3,
      'background-clip': 'none',
      'bounds-expansion': 6,
      'background-opacity': 0.7,
      'border-color': '#f59e0b',
      'border-width': 2.5,
    },
  },
  {
    selector: 'node.movie.show.watching',
    style: {
      'background-image': [badges.show, badges.watching],
      'background-width': ['16px', '16px'],
      'background-height': ['16px', '16px'],
      'background-position-x': ['0%', '100%'],
      'background-position-y': ['0%', '0%'],
      'background-offset-x': [-3, 3],
      'background-offset-y': [-3, -3],
      'background-clip': ['none', 'none'],
    },
  },
  {
    selector: 'node.movie.selected',
    style: {
      'overlay-color': '#ffffff',
      'overlay-opacity': 0.25,
      'overlay-padding': 6,
      'border-color': '#ffffff',
      'border-width': 3,
      'z-index': 20,
    },
  },
  {
    selector: 'node.movie.dep-highlight',
    style: { 'border-color': '#ffffff', 'border-width': 3, 'z-index': 15 },
  },
  {
    selector: 'node.movie.dependent-highlight',
    style: { 'border-color': '#c9cfdc', 'border-width': 2, 'z-index': 12 },
  },
  {
    selector: 'node.movie.dim',
    style: { opacity: 0.16 },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.9,
      width: 1.6,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      opacity: 0,
    },
  },
  {
    selector: 'edge.optional',
    style: { 'line-style': 'dashed' },
  },
  {
    selector: 'edge.highlight',
    style: { width: 3, opacity: 1, 'z-index': 10 },
  },
]; }

function layoutFor(positions) {
  return {
    name: 'preset',
    positions: (node) => (node.hasClass('movie') ? positions.get(node.id()) : undefined),
    zoom: 1,
    pan: { x: 0, y: 0 },
    fit: false,
    animate: false,
  };
}

export default function GraphView({ entries, phases, watched, watching, selectedId, onSelect, themeName }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const { dependenciesOf, dependentsOf } = useMemo(() => {
    const dependenciesOf = new Map();
    const dependentsOf = new Map();
    for (const entry of entries) {
      dependenciesOf.set(entry.id, entry.dependencies);
      if (!dependentsOf.has(entry.id)) dependentsOf.set(entry.id, []);
    }
    for (const entry of entries) {
      for (const dep of entry.dependencies) {
        if (!dependentsOf.has(dep.id)) dependentsOf.set(dep.id, []);
        dependentsOf.get(dep.id).push(entry.id);
      }
    }
    return { dependenciesOf, dependentsOf };
  }, [entries]);

  useEffect(() => {
    const initialWidth = containerRef.current.getBoundingClientRect().width;
    const grid = computeGrid(entries, phases, initialWidth);

    const theme = readTheme();
    const badges = { show: SHOW_BADGE, check: checkBadge(theme.bg), watching: watchingBadge(theme.bg) };

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(entries, phases, grid),
      style: buildStyle(theme, badges),
      layout: layoutFor(grid.positions),
      minZoom: 0.15,
      maxZoom: 3,
      // Nodes are fixed grid cells, not draggable — without this, a
      // touch-drag on a box moves it instead of panning/scrolling.
      autoungrabify: true,
      // Cytoscape's built-in drag-to-pan only engages when the drag starts
      // on empty canvas, not on a node — and phase boxes now cover nearly
      // the whole width, leaving almost no empty space to grab on mobile.
      // We replace it with manual panning below that works from anywhere.
      userPanningEnabled: false,
      // Plain wheel/trackpad scroll should scroll the tree, not zoom it —
      // zoom is remapped to pinch/ctrl+wheel below.
      userZoomingEnabled: false,
    });

    cy.on('tap', 'node.movie', (evt) => onSelect(evt.target.id()));
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelect(null);
    });

    // Phase boxes always span the full container width, so there's nothing
    // to see by panning sideways — lock dragging to vertical-only.
    let panFrom = null;
    cy.on('tapstart', (evt) => {
      panFrom = { x: evt.renderedPosition.x, y: evt.renderedPosition.y };
    });
    cy.on('tapdrag', (evt) => {
      if (!panFrom) return;
      const pos = evt.renderedPosition;
      cy.panBy({ x: 0, y: pos.y - panFrom.y });
      panFrom = { x: pos.x, y: pos.y };
    });
    cy.on('tapend', () => {
      panFrom = null;
    });

    // Plain wheel / two-finger trackpad scroll pans the tree vertically,
    // matching normal page-scroll direction. Pinch-to-zoom (and ctrl+wheel)
    // still zoom, since both are delivered as wheel events with ctrlKey set.
    function normalizeDeltaY(evt) {
      if (evt.deltaMode === 1) return evt.deltaY * 20; // DOM_DELTA_LINE
      if (evt.deltaMode === 2) return evt.deltaY * containerRef.current.clientHeight; // DOM_DELTA_PAGE
      return evt.deltaY;
    }
    function onWheel(evt) {
      evt.preventDefault();
      if (evt.ctrlKey) {
        const factor = evt.deltaY < 0 ? 1.1 : 1 / 1.1;
        const level = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * factor));
        cy.zoom({ level, renderedPosition: { x: evt.offsetX, y: evt.offsetY } });
      } else {
        cy.panBy({ x: 0, y: -normalizeDeltaY(evt) });
      }
    }
    containerRef.current.addEventListener('wheel', onWheel, { passive: false });

    cyRef.current = cy;

    let lastWidth = initialWidth;
    const resizeObserver = new ResizeObserver((observed) => {
      const width = observed[0].contentRect.width;
      cy.resize();
      if (Math.abs(width - lastWidth) < 4) return;
      lastWidth = width;

      const newGrid = computeGrid(entries, phases, width);
      cy.batch(() => {
        cy.nodes('.movie').forEach((n) => {
          n.data('w', newGrid.nodeW);
          n.data('tw', newGrid.nodeTextW);
        });
      });
      cy.layout(layoutFor(newGrid.positions)).run();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener('wheel', onWheel);
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, phases]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().removeClass('selected dep-highlight dependent-highlight dim highlight watched watching');

      cy.nodes('.movie').forEach((n) => {
        const id = n.id();
        if (watched.has(id)) n.addClass('watched');
        else if (watching.has(id)) n.addClass('watching');
      });

      // Filters can hide the selected title's node entirely — guard against
      // an empty selection instead of highlighting/centering on nothing.
      const selNode = selectedId ? cy.$id(selectedId) : null;
      if (selNode && selNode.nonempty()) {
        const depIds = new Set((dependenciesOf.get(selectedId) || []).map((d) => d.id));
        const dependentIds = new Set(dependentsOf.get(selectedId) || []);

        selNode.addClass('selected');

        cy.nodes('.movie').forEach((n) => {
          const id = n.id();
          if (id === selectedId) return;
          if (depIds.has(id)) n.addClass('dep-highlight');
          else if (dependentIds.has(id)) n.addClass('dependent-highlight');
          else n.addClass('dim');
        });

        cy.edges().forEach((e) => {
          const source = e.data('source');
          const target = e.data('target');
          if (target === selectedId || source === selectedId) e.addClass('highlight');
        });

        // Center vertically only — panning is locked to vertical-only, so
        // leave the x pan untouched (always 0) rather than letting the
        // built-in `center` animation shift it sideways.
        const viewportH = containerRef.current.clientHeight;
        const targetY = viewportH / 2 - selNode.position('y') * cy.zoom();
        cy.animate({ pan: { x: cy.pan().x, y: targetY } }, { duration: 200 });
      }
    });
  }, [selectedId, watched, watching, dependenciesOf, dependentsOf]);

  // Cytoscape's style is plain JS, not CSS — when the theme toggles, re-read
  // the now-updated custom properties and push a fresh style rather than
  // rebuilding the whole graph (cheap: no layout/elements change involved).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const theme = readTheme();
    const badges = { show: SHOW_BADGE, check: checkBadge(theme.bg), watching: watchingBadge(theme.bg) };
    cy.style(buildStyle(theme, badges)).update();
  }, [themeName]);

  useEffect(() => {
    function onKeyDown(evt) {
      if (evt.key === 'Escape') onSelect(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSelect]);

  return <div ref={containerRef} className="graph-canvas" />;
}
