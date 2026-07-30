import { useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { IMPORTANCE, PHASE_COLORS } from '../utils/mcu';

cytoscape.use(dagre);

const MOBILE_QUERY = '(max-width: 720px)';

const CHECK_BADGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' +
    '<circle cx="10" cy="10" r="9.5" fill="#22c55e" stroke="#0f1117" stroke-width="1"/>' +
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

function buildElements(entries, phases) {
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
    },
    classes: `movie ${entry.type}`,
  }));

  const edges = [];
  for (const entry of entries) {
    for (const dep of entry.dependencies) {
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

const THEME = { bg: '#0f1117', nodeFill: '#2b3040', nodeText: '#e9ebf2', nodeBorder: '#454b60' };

function buildStyle(theme) { return [
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
      'text-halign': 'left',
      'text-margin-x': 4,
      'text-margin-y': -4,
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
      width: 128,
      height: 52,
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': '114px',
      'font-size': 12.5,
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
      'background-image': SHOW_BADGE,
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
      'background-image': CHECK_BADGE,
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
      'background-image': [SHOW_BADGE, CHECK_BADGE],
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
      opacity: 0.8,
    },
  },
  {
    selector: 'edge.optional',
    style: { 'line-style': 'dashed' },
  },
  {
    selector: 'edge.dim',
    style: { opacity: 0.04 },
  },
  {
    selector: 'edge.highlight',
    style: { width: 3, opacity: 1, 'z-index': 10 },
  },
]; }

function layoutFor(isMobile) {
  return isMobile
    ? {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 6,
        rankSep: 46,
        edgeSep: 4,
        animate: false,
        fit: true,
        padding: 20,
      }
    : {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 8,
        rankSep: 60,
        edgeSep: 6,
        animate: false,
        fit: true,
        padding: 24,
      };
}

export default function GraphView({ entries, phases, watched, selectedId, onSelect }) {
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
    const mql = window.matchMedia(MOBILE_QUERY);

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(entries, phases),
      style: buildStyle(THEME),
      layout: layoutFor(mql.matches),
      wheelSensitivity: 0.25,
      minZoom: 0.15,
      maxZoom: 3,
    });

    cy.on('tap', 'node.movie', (evt) => onSelect(evt.target.id()));
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelect(null);
    });

    cyRef.current = cy;

    const resizeObserver = new ResizeObserver(() => cy.resize());
    resizeObserver.observe(containerRef.current);

    const onBreakpointChange = (evt) => {
      cy.layout(layoutFor(evt.matches)).run();
    };
    mql.addEventListener('change', onBreakpointChange);

    return () => {
      resizeObserver.disconnect();
      mql.removeEventListener('change', onBreakpointChange);
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, phases]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().removeClass('selected dep-highlight dependent-highlight dim highlight watched');

      cy.nodes('.movie').forEach((n) => {
        if (watched.has(n.id())) n.addClass('watched');
      });

      if (selectedId) {
        const depIds = new Set((dependenciesOf.get(selectedId) || []).map((d) => d.id));
        const dependentIds = new Set(dependentsOf.get(selectedId) || []);

        cy.$id(selectedId).addClass('selected');

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
          else e.addClass('dim');
        });

        const selNode = cy.$id(selectedId);
        cy.animate({ center: { eles: selNode } }, { duration: 200 });
      }
    });
  }, [selectedId, watched, dependenciesOf, dependentsOf]);

  useEffect(() => {
    function onKeyDown(evt) {
      if (evt.key === 'Escape') onSelect(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSelect]);

  return <div ref={containerRef} className="graph-canvas" />;
}
