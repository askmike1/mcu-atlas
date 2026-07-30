import { useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { IMPORTANCE, PHASE_COLORS } from '../utils/mcu';

cytoscape.use(dagre);

function buildElements(entries, phases) {
  const phaseNodes = phases.map((phase) => ({
    data: { id: `phase-${phase.number}`, label: `${phase.name}\n${phase.saga}` },
    classes: 'phase-parent',
    selectable: false,
  }));

  const movieNodes = entries.map((entry) => ({
    data: {
      id: entry.id,
      label: entry.title,
      parent: `phase-${entry.phase}`,
      color: PHASE_COLORS[entry.phase] ?? '#8b93a7',
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

const STYLE = [
  {
    selector: 'node.phase-parent',
    style: {
      shape: 'roundrectangle',
      'background-color': '#8b93a7',
      'background-opacity': 0.06,
      'border-width': 1,
      'border-color': '#8b93a7',
      'border-opacity': 0.35,
      label: 'data(label)',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -6,
      'font-size': 13,
      'font-weight': 700,
      color: 'var(--text-muted)',
      padding: '28px',
    },
  },
  {
    selector: 'node.movie',
    style: {
      shape: 'round-rectangle',
      'background-color': 'data(color)',
      width: 128,
      height: 56,
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': '112px',
      'font-size': 11,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      color: '#111319',
      'border-width': 2,
      'border-color': '#00000030',
      'transition-property': 'opacity, border-width, border-color',
      'transition-duration': 120,
    },
  },
  {
    selector: 'node.movie.show',
    style: { 'border-style': 'dashed', 'border-width': 3 },
  },
  {
    selector: 'node.movie.watched',
    style: {
      'background-opacity': 0.45,
      'border-color': '#2fb865',
      'border-width': 4,
    },
  },
  {
    selector: 'node.movie.selected',
    style: {
      'overlay-color': '#ffffff',
      'overlay-opacity': 0.25,
      'overlay-padding': 6,
      'border-color': '#ffffff',
      'border-width': 4,
      'z-index': 20,
    },
  },
  {
    selector: 'node.movie.dep-highlight',
    style: { 'border-color': '#ffffff', 'border-width': 4, 'z-index': 15 },
  },
  {
    selector: 'node.movie.dependent-highlight',
    style: { 'border-color': '#c9cfdc', 'border-width': 3, 'z-index': 12 },
  },
  {
    selector: 'node.movie.dim',
    style: { opacity: 0.18 },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1,
      width: 2,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      opacity: 0.85,
    },
  },
  {
    selector: 'edge.optional',
    style: { 'line-style': 'dashed' },
  },
  {
    selector: 'edge.dim',
    style: { opacity: 0.05 },
  },
  {
    selector: 'edge.highlight',
    style: { width: 3.5, opacity: 1, 'z-index': 10 },
  },
];

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
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(entries, phases),
      style: STYLE,
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 14,
        rankSep: 110,
        edgeSep: 8,
        animate: false,
        fit: true,
        padding: 30,
      },
      wheelSensitivity: 0.25,
      minZoom: 0.2,
      maxZoom: 2.5,
    });

    cy.on('tap', 'node.movie', (evt) => onSelect(evt.target.id()));
    cy.on('tap', (evt) => {
      if (evt.target === cy) onSelect(null);
    });

    cyRef.current = cy;

    const resizeObserver = new ResizeObserver(() => cy.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
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
