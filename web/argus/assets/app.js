/**
 * Argus FKG Viewer v5.0 — Cytoscape.js engine
 * Phase 1 migration: directed arrows, dashed human-gate edges, cose-bilkent layout
 */

const NODE_COLORS = {
    PERSON: '#ef4444', FACILITY: '#3b82f6', ZONE: '#6366f1',
    EVENT: '#f59e0b', METHOD: '#ec4899', ORGANIZATION: '#8b5cf6',
    ROLE: '#06b6d4', DOCUMENT: '#84cc16', TIMEFRAME: '#64748b',
    SENSORY: '#14b8a6', SOURCE: '#a3e635',
};
const SUB_TYPE_COLORS = {
    WITNESS: '#22c55e',
    PERPETRATOR: '#ef4444',
    CO_DETAINEE: '#06b6d4',
    VICTIM: '#f59e0b',
    BYSTANDER: '#94a3b8',
};
const NODE_SIZES = { CONVERGENT: 40, CORROBORATED: 30, SUPPORTED: 22, UNCORROBORATED: 16 };
const EDGE_COLORS = {
    PERPETRATED: '#ef4444', ORDERED: '#ef4444', COMMANDED: '#ef4444',
    CROSS_REGIME_TRANSFER: '#f97316', WITNESSED: '#f59e0b',
    DETAINED_AT: '#3b82f6', OCCURRED_AT: '#3b82f6', OCCURRED_IN: '#6366f1',
    LOCATED_IN: '#6366f1',
    USED_METHOD: '#ec4899', CO_DETAINED: '#06b6d4', HOLDS_ROLE: '#8b5cf6',
    MEMBER_OF: '#8b5cf6', CORROBORATES: '#10b981', TRANSFERRED_TO: '#f59e0b',
    TEMPORAL: '#64748b', SENSORY_AT: '#14b8a6',
    CROSS_WITNESS: '#a855f7',
};

const SRT_BASE = 'srt/';

let fkg = null, atoms = [];
let cy = null;
let activeNodeTypes = new Set(), activeEdgeTypes = new Set(), activeTiers = new Set();
let activeWitness = 'ALL';
let selectedNode = null;
let srtCache = {};
let activePanel = null;

// --- Centralized atom resolution (3-tier) ---
function findRelatedAtoms(nodeId) {
    const direct = atoms.filter(a =>
        a.who_canonical === nodeId || a.to_whom_canonical === nodeId || a.where_canonical === nodeId
    );
    if (direct.length > 0) return { atoms: direct, isDirect: true };

    const connEdges = fkg ? fkg.edges.filter(e => e.from_node === nodeId || e.to_node === nodeId) : [];
    const edgeAtomIds = new Set();
    for (const e of connEdges) {
        if (e.source_atoms) e.source_atoms.forEach(id => edgeAtomIds.add(id));
    }
    const edgeAtoms = atoms.filter(a => edgeAtomIds.has(a.id));
    return { atoms: edgeAtoms, isDirect: false };
}

// --- Node color resolver ---
function getNodeColor(n) {
    if (n.type === 'PERSON' && n.sub_type && SUB_TYPE_COLORS[n.sub_type]) {
        return SUB_TYPE_COLORS[n.sub_type];
    }
    return NODE_COLORS[n.type] || '#64748b';
}

// --- Load & Init ---
async function loadFKG() {
    try {
        const [fkgRes, atomsRes] = await Promise.all([
            fetch('fkg.json'), fetch('atoms.json').catch(() => null)
        ]);
        fkg = await fkgRes.json();
        if (atomsRes && atomsRes.ok) atoms = await atomsRes.json();

        initFilters();
        updateStats();
        buildLegend();
        initCytoscape();

        // Footer: data hash + counts
        const hash = await computeDataHash();
        const fh = document.getElementById('footer-hash');
        if (fh) fh.textContent = 'SHA-256: ' + hash;
        const fc = document.getElementById('footer-counts');
        if (fc) fc.textContent = 'N: ' + fkg.nodes.length + ' · E: ' + fkg.edges.length + ' · A: ' + atoms.length;
    } catch (err) { console.error('Load failed:', err); }
}

// --- Cytoscape Init ---
function initCytoscape() {
    // cose-bilkent auto-registers via UMD when loaded after cytoscape + cose-base globals
    const elements = [];

    // Build node elements
    for (const n of fkg.nodes) {
        const color = getNodeColor(n);
        const size = NODE_SIZES[n.corroboration_tier] || 16;
        const label = (n.canonical_name || n.id).replace(/_/g, ' ');
        const shortLabel = label.length > 20 ? label.substring(0, 18) + '…' : label;

        elements.push({
            group: 'nodes',
            data: {
                id: n.id,
                label: shortLabel,
                fullLabel: label,
                type: n.type,
                sub_type: n.sub_type || '',
                corroboration_tier: n.corroboration_tier || 'UNCORROBORATED',
                corroboration_score: n.corroboration_score || 0,
                witness_source: n.witness_source || 'W1',
                canonical_name: n.canonical_name || '',
                arabic_name: n.arabic_name || '',
                glossary_match: n.glossary_match || false,
                color: color,
                size: size,
                nodeData: n,
            },
        });
    }

    // Build node ID index for edge validation
    const nodeIds = new Set(fkg.nodes.map(n => n.id));

    // Build edge elements (skip edges with missing source/target)
    let skippedEdges = 0;
    for (const e of fkg.edges) {
        if (!nodeIds.has(e.from_node) || !nodeIds.has(e.to_node)) {
            skippedEdges++;
            console.warn('Skipped edge', e.id, '— missing node:', !nodeIds.has(e.from_node) ? e.from_node : e.to_node);
            continue;
        }
        const color = EDGE_COLORS[e.type] || '#334155';
        elements.push({
            group: 'edges',
            data: {
                id: e.id,
                source: e.from_node,
                target: e.to_node,
                type: e.type,
                color: color,
                human_gate: e.requires_human_gate || false,
                human_approved: e.human_approved,
                source_atoms: e.source_atoms || [],
                corroboration_score: e.corroboration_score || 1,
                corroboration_tier: e.corroboration_tier || 'UNCORROBORATED',
                witness_source: e.witness_source || 'W1',
                cross_witness: e.cross_witness || false,
                edgeData: e,
            },
        });
    }
    if (skippedEdges > 0) console.warn('Total skipped edges (missing nodes):', skippedEdges);

    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
            // Node base style
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'width': 'data(size)',
                    'height': 'data(size)',
                    'label': 'data(label)',
                    'font-size': '9px',
                    'font-family': 'Inter, sans-serif',
                    'color': '#e2e8f0',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 6,
                    'text-outline-width': 2,
                    'text-outline-color': '#0a0e17',
                    'border-width': 1,
                    'border-color': 'data(color)',
                    'border-opacity': 0.6,
                    'overlay-padding': 4,
                    'min-zoomed-font-size': 7,
                },
            },
            // Corroborated/Convergent nodes get emphasis
            {
                selector: 'node[corroboration_tier = "CORROBORATED"], node[corroboration_tier = "CONVERGENT"]',
                style: {
                    'border-width': 3,
                    'border-opacity': 1,
                },
            },
            // Edge base style — directed arrows
            {
                selector: 'edge',
                style: {
                    'width': 1.5,
                    'line-color': 'data(color)',
                    'target-arrow-color': 'data(color)',
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 0.8,
                    'curve-style': 'bezier',
                    'opacity': 0.5,
                    'label': 'data(type)',
                    'font-size': '7px',
                    'font-family': 'JetBrains Mono, monospace',
                    'color': 'data(color)',
                    'text-opacity': 0,
                    'text-rotation': 'autorotate',
                    'text-outline-width': 1.5,
                    'text-outline-color': '#0a0e17',
                    'min-zoomed-font-size': 8,
                },
            },
            // Human-gated edges — dashed
            {
                selector: 'edge[?human_gate]',
                style: {
                    'line-style': 'dashed',
                    'line-dash-pattern': [6, 3],
                    'width': 2,
                },
            },
            // CROSS_WITNESS edges — distinctive
            {
                selector: 'edge[type = "CROSS_WITNESS"]',
                style: {
                    'width': 2.5,
                    'line-style': 'dashed',
                    'line-dash-pattern': [8, 4],
                    'opacity': 0.8,
                },
            },
            // Selected node
            {
                selector: 'node:selected',
                style: {
                    'border-width': 4,
                    'border-color': '#ffffff',
                    'background-color': 'data(color)',
                    'z-index': 999,
                },
            },

            // Faded nodes (de-emphasized when selection active)
            {
                selector: '.faded',
                style: {
                    'opacity': 0.15,
                },
            },
            // Taxonomy — dimmed (non-matching types)
            {
                selector: '.tax-dimmed',
                style: {
                    'opacity': 0.1,
                },
            },
            // Taxonomy — highlighted edges
            {
                selector: '.tax-highlight',
                style: {
                    'opacity': 1,
                    'width': 2.5,
                    'text-opacity': 0.8,
                },
            },
            // Path analysis — highlighted path
            {
                selector: '.path-highlight',
                style: {
                    'opacity': 1,
                    'z-index': 999,
                },
            },
            {
                selector: 'node.path-highlight',
                style: {
                    'border-width': 4,
                    'border-color': '#fbbf24',
                    'background-color': 'data(color)',
                },
            },
            {
                selector: 'edge.path-highlight',
                style: {
                    'line-color': '#fbbf24',
                    'target-arrow-color': '#fbbf24',
                    'width': 3,
                    'text-opacity': 1,
                },
            },
            // Hidden elements
            {
                selector: '.hidden',
                style: {
                    'display': 'none',
                },
            },
        ],
        layout: {
            name: 'cose-bilkent',
            animate: false, 
            randomize: true,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 120,
            nodeRepulsion: 8000,
            edgeElasticity: 0.45,
            nestingFactor: 0.1,
            gravity: 0.25,
            numIter: 2500,
            tile: true,
            fit: true,
            padding: 30,
        },
        // Performance
        textureOnViewport: false,
        hideEdgesOnViewport: false,
        hideLabelsOnViewport: false,
        wheelSensitivity: 0.7,
        minZoom: 0.1,
        maxZoom: 5,
    });

    // --- Events ---
    // Node tap → inspector (Shift+click = path analysis)
    let pathSource = null;
    cy.on('tap', 'node', function (evt) {
        const node = evt.target;
        const evtObj = evt.originalEvent;

        // Shift+click → Path Analysis
        if (evtObj && evtObj.shiftKey && pathSource && pathSource.id() !== node.id()) {
            runPathAnalysis(pathSource, node);
            return;
        }

        selectedNode = node;
        pathSource = node; // Set as potential path start
        // Zoom to clicked node
        cy.animate({
            fit: { eles: node.neighborhood().add(node), padding: 60 },
        }, { duration: 300 });
        showInspector(node.data('nodeData'));
        highlightNeighbors(node);
    });

    // Tap background → deselect
    cy.on('tap', function (evt) {
        if (evt.target === cy) {
            selectedNode = null;
            pathSource = null;
            document.getElementById('inspector').classList.add('hidden');
            clearHighlight();
        }
    });

    // Node hover → tooltip
    cy.on('mouseover', 'node', function (evt) {
        const node = evt.target;
        const nd = node.data('nodeData');
        showTooltip(evt.originalEvent || evt.renderedPosition, nd);
    });

    cy.on('mouseout', 'node', function () {
        document.getElementById('tooltip').classList.add('hidden');
    });

    // Edge hover → show label
    cy.on('mouseover', 'edge', function (evt) {
        evt.target.style('text-opacity', 0.9);
        evt.target.style('opacity', 0.9);
    });
    cy.on('mouseout', 'edge', function (evt) {
        evt.target.style('text-opacity', 0);
        evt.target.style('opacity', 0.5);
    });

    // Apply initial filters
    applyFilters();

    // P5.1: Try to restore saved layout after initial render
    setTimeout(() => {
        if (restoreLayout()) {
            console.log('Restored saved layout from localStorage');
        }
    }, 500);
}

// --- Highlight neighbors ---
function highlightNeighbors(node) {
    clearHighlight();
    const neighborhood = node.neighborhood().add(node);
    cy.elements().not(neighborhood).addClass('faded');
    neighborhood.edges().style({ 'opacity': 0.9, 'width': 2.5, 'text-opacity': 0.9 });
}

function clearHighlight() {
    if (!cy) return;
    cy.elements().removeClass('faded tax-dimmed tax-highlight path-highlight');
    cy.edges().style({ 'opacity': 0.5, 'width': 1.5, 'text-opacity': 0 });
    // Restore human-gate and cross-witness edge widths
    cy.edges('[?human_gate]').style({ 'width': 2 });
    cy.edges('[type = "CROSS_WITNESS"]').style({ 'width': 2.5, 'opacity': 0.8 });
    taxonomyFilterActive = null;
}

// --- Path Analysis (Shift+click two nodes) ---
function runPathAnalysis(source, target) {
    if (!cy) return;
    clearHighlight();

    try {
        const result = cy.elements().not('.hidden').aStar({
            root: source,
            goal: target,
            directed: false,
        });

        if (result.found) {
            // Dim everything, highlight path
            cy.elements().addClass('faded');
            result.path.removeClass('faded').addClass('path-highlight');

            // Fit to path
            cy.animate({ fit: { eles: result.path, padding: 50 } }, { duration: 400 });

            // Build inspector content for path
            const pathNodes = result.path.nodes();
            const pathEdges = result.path.edges();
            const hops = pathEdges.length;

            let html = `<h4>🛤️ PATH ANALYSIS</h4>`;
            html += `<div class="detail-row"><span class="detail-label">From</span><span class="detail-value">${source.data('fullLabel')}</span></div>`;
            html += `<div class="detail-row"><span class="detail-label">To</span><span class="detail-value">${target.data('fullLabel')}</span></div>`;
            html += `<div class="detail-row"><span class="detail-label">Hops</span><span class="detail-value">${hops}</span></div>`;
            html += `<div class="detail-row"><span class="detail-label">Distance</span><span class="detail-value">${result.distance.toFixed(1)}</span></div>`;

            html += `<h4>🔗 PATH</h4><ul class="edge-list">`;
            pathNodes.forEach((node, i) => {
                const color = node.data('color');
                const name = node.data('fullLabel');
                const type = node.data('type');
                html += `<li class="edge-list-item" onclick="selectSearchResult('${node.id()}')">
                    <span style="color:${color};font-weight:700">●</span>
                    ${i + 1}. ${name} <span class="edge-tag medium">${type}</span>
                </li>`;
                if (i < pathEdges.length) {
                    const edge = pathEdges[i];
                    const eType = edge.data('type');
                    const eColor = edge.data('color');
                    html += `<li style="padding-left:20px;color:var(--text-muted)">
                        ↓ <span class="edge-tag" style="background:${eColor}33;color:${eColor}">${eType}</span>
                    </li>`;
                }
            });
            html += '</ul>';

            document.getElementById('inspector-content').innerHTML = html;
            document.getElementById('inspector').classList.remove('hidden');
            document.querySelector('.inspector-header h3').textContent = '🛤️ Path Analysis';
        } else {
            // No path found
            document.getElementById('inspector-content').innerHTML = `
                <h4>🛤️ PATH ANALYSIS</h4>
                <div class="srt-no-data">No path found between<br>
                <strong>${source.data('fullLabel')}</strong> and<br>
                <strong>${target.data('fullLabel')}</strong></div>`;
            document.getElementById('inspector').classList.remove('hidden');
            document.querySelector('.inspector-header h3').textContent = '🛤️ Path Analysis';
        }
    } catch (e) {
        console.warn('Path analysis failed:', e);
    }
}

// --- Export Functions ---
function exportPNG() {
    if (!cy) return;
    const png = cy.png({ full: true, bg: '#0a0e17', scale: 2, maxWidth: 4096, maxHeight: 4096 });
    const link = document.createElement('a');
    link.href = png;
    link.download = 'argus_fkg_' + new Date().toISOString().slice(0, 10) + '.png';
    link.click();
}

function exportJSON() {
    if (!cy || !fkg) return;
    // Export only visible nodes/edges
    const visibleNodes = [];
    const visibleEdges = [];
    cy.nodes().not('.hidden').forEach(n => {
        visibleNodes.push(n.data('nodeData'));
    });
    cy.edges().not('.hidden').forEach(e => {
        visibleEdges.push(e.data('edgeData'));
    });
    const exported = {
        meta: {
            exported: new Date().toISOString(),
            viewer_version: 'v5.0',
            total_nodes: visibleNodes.length,
            total_edges: visibleEdges.length,
            filter: activeWitness,
        },
        nodes: visibleNodes,
        edges: visibleEdges,
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'argus_fkg_export_' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
}

// --- Data Hash (SHA-256) ---
async function computeDataHash() {
    try {
        const text = JSON.stringify(fkg);
        const buf = new TextEncoder().encode(text);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        return hex.substring(0, 12); // Short hash
    } catch (e) { return 'n/a'; }
}

// --- SVG Export (via cytoscape-svg extension) ---
function exportSVG() {
    if (!cy) return;
    try {
        const svgContent = cy.svg({ full: true, bg: '#0a0e17', scale: 1.5 });
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'argus_fkg_' + new Date().toISOString().slice(0, 10) + '.svg';
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (e) {
        console.error('SVG export failed:', e);
        alert('SVG export failed. Check console for details.');
    }
}

// --- Dossier View (inline, same page) ---
async function exportDossier() {
    if (!cy || !fkg) return;

    const hash = await computeDataHash();
    const now = new Date().toISOString();
    const visNodes = [];
    const visEdges = [];
    cy.nodes().not('.hidden').forEach(n => visNodes.push(n.data('nodeData')));
    cy.edges().not('.hidden').forEach(e => visEdges.push(e.data('edgeData')));

    // Group nodes by type
    const byType = {};
    for (const n of visNodes) {
        if (!byType[n.type]) byType[n.type] = [];
        byType[n.type].push(n);
    }

    // Evidence strength counts
    const tierCounts = { CONVERGENT: 0, CORROBORATED: 0, SUPPORTED: 0, UNCORROBORATED: 0 };
    for (const n of visNodes) {
        const t = n.corroboration_tier || 'UNCORROBORATED';
        tierCounts[t] = (tierCounts[t] || 0) + 1;
    }

    // Flagged connections
    const flaggedEdges = visEdges.filter(e => e.requires_human_gate);

    // Human-readable mappings
    const TIER_LABELS = {
        CONVERGENT: 'Confirmed by Multiple Sources',
        CORROBORATED: 'Cross-Referenced',
        SUPPORTED: 'Single Source',
        UNCORROBORATED: 'Unconfirmed',
    };
    const WITNESS_NAMES = {
        W1: 'Talal al-Shuweimi (Rumaila)',
        W2: 'Faraj Salamah (Al-Burj)',
        SHARED: 'Both Witnesses',
    };
    const EDGE_LABELS = {
        PERPETRATED: 'committed', ORDERED: 'ordered', COMMANDED: 'commanded',
        CROSS_REGIME_TRANSFER: 'transferred across regimes', WITNESSED: 'witnessed by',
        DETAINED_AT: 'detained at', OCCURRED_AT: 'occurred at', OCCURRED_IN: 'occurred in',
        LOCATED_IN: 'located in', USED_METHOD: 'used method', CO_DETAINED: 'co-detained with',
        HOLDS_ROLE: 'holds role', MEMBER_OF: 'member of', CORROBORATES: 'corroborates',
        TRANSFERRED_TO: 'transferred to', TEMPORAL: 'temporal link', SENSORY_AT: 'sensory at',
        CROSS_WITNESS: 'cross-witness link',
    };

    // Type icons & colors
    const TYPE_META = {
        PERSON:       { icon: '👤', color: '#ef4444', label: 'Persons' },
        FACILITY:     { icon: '🏛️', color: '#3b82f6', label: 'Facilities & Prisons' },
        ZONE:         { icon: '📍', color: '#6366f1', label: 'Zones & Locations' },
        EVENT:        { icon: '⚡', color: '#f59e0b', label: 'Events & Incidents' },
        METHOD:       { icon: '🔧', color: '#ec4899', label: 'Methods of Abuse' },
        ORGANIZATION: { icon: '🏢', color: '#8b5cf6', label: 'Organizations' },
        ROLE:         { icon: '🎖️', color: '#06b6d4', label: 'Roles & Positions' },
        DOCUMENT:     { icon: '📄', color: '#84cc16', label: 'Documents' },
        TIMEFRAME:    { icon: '🕐', color: '#64748b', label: 'Timeframes' },
        SENSORY:      { icon: '🔊', color: '#14b8a6', label: 'Sensory Details' },
        SOURCE:       { icon: '📹', color: '#a3e635', label: 'Testimony Sources' },
    };
    const TIER_COLORS = {
        CONVERGENT: '#10b981', CORROBORATED: '#8b5cf6',
        SUPPORTED: '#06b6d4', UNCORROBORATED: '#64748b',
    };

    // Build HTML
    let html = '';

    // ─── HEADER ───
    html += `<div class="dos-header">
<div class="dos-eye">👁</div>
<div class="dos-title">FORENSIC KNOWLEDGE<br>GRAPH DOSSIER</div>
<div class="dos-subtitle">SYRIA PRISONS MUSEUM</div>
<div class="dos-meta">
    <span>${now.slice(0, 10)}</span><span class="sep">│</span>
    <span>WITNESS: ${WITNESS_NAMES[activeWitness] || 'All Witnesses'}</span><span class="sep">│</span>
    <span>FKG v5.0</span>
</div>
<div class="dos-classified">CLASSIFIED</div>
</div>`;

    // ─── BODY ───
    html += '<div class="dos-body">';

    // ─── STATS ───
    html += `<div class="dos-stats">
<div class="dos-stat"><div class="dos-stat-num" style="color:var(--accent)">${visNodes.length}</div><div class="dos-stat-lbl">Entities</div></div>
<div class="dos-stat"><div class="dos-stat-num" style="color:#8b5cf6">${visEdges.length}</div><div class="dos-stat-lbl">Connections</div></div>
<div class="dos-stat"><div class="dos-stat-num" style="color:var(--amber)">${flaggedEdges.length}</div><div class="dos-stat-lbl">Flagged</div></div>
<div class="dos-stat"><div class="dos-stat-num" style="color:#10b981">${atoms.length}</div><div class="dos-stat-lbl">Testimonial Excerpts</div></div>
</div>`;

    // ─── EVIDENCE STRENGTH ───
    html += `<div class="dos-section"><span class="dos-section-icon">🎯</span><span class="dos-section-title">Evidence Strength</span></div>`;
    html += '<div class="dos-tier-bar"><div class="dos-stacked-bar">';
    for (const [tier, count] of Object.entries(tierCounts)) {
        if (count === 0) continue;
        const pct = ((count / visNodes.length) * 100).toFixed(1);
        const color = TIER_COLORS[tier] || '#64748b';
        const label = TIER_LABELS[tier] || tier;
        html += `<div class="dos-tier-seg" style="width:${pct}%;background:${color}" title="${label}: ${count} (${pct}%)"></div>`;
    }
    html += '</div><div class="dos-tier-legend">';
    for (const [tier, count] of Object.entries(tierCounts)) {
        if (count === 0) continue;
        const color = TIER_COLORS[tier] || '#64748b';
        const label = TIER_LABELS[tier] || tier;
        const pct = ((count / visNodes.length) * 100).toFixed(1);
        html += `<div class="dos-tier-item"><div class="dos-tier-dot" style="background:${color}"></div>${label} <span class="dos-tier-count">${count}</span> (${pct}%)</div>`;
    }
    html += '</div></div>';

    // ─── FLAGGED CONNECTIONS ───
    if (flaggedEdges.length > 0) {
        html += `<div class="dos-section"><span class="dos-section-icon">🔍</span><span class="dos-section-title">Flagged Connections — Requires Independent Verification</span><span class="dos-section-count">${flaggedEdges.length}</span></div>`;
        html += `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5;">The following connections have been flagged for independent verification. These links were extracted from testimony but involve claims that require additional evidence or cross-referencing before they can be considered established.</div>`;
        for (const e of flaggedEdges) {
            const relLabel = EDGE_LABELS[e.type] || e.type.toLowerCase().replace(/_/g, ' ');
            const fromName = e.from_node.replace(/_/g, ' ');
            const toName = e.to_node.replace(/_/g, ' ');
            const edgeAtoms = e.source_atoms ? atoms.filter(a => e.source_atoms.includes(a.id)) : [];
            const fid = 'flag-srt-' + (e.id || '').replace(/[^a-zA-Z0-9]/g, '');
            html += `<div class="dos-flag">
<div class="dos-flag-row">
    <span class="dos-flag-from">${fromName}</span>
    <span class="dos-flag-arrow">→</span>
    <span class="dos-flag-rel">${relLabel}</span>
    <span class="dos-flag-arrow">→</span>
    <span class="dos-flag-to">${toName}</span>
</div>
<div class="dos-flag-desc">"${fromName}" is reported to have ${relLabel} "${toName}". This connection was extracted from witness testimony and has been flagged because it contains sensitive claims requiring corroboration.</div>`;
            if (edgeAtoms.length > 0) {
                const ea = edgeAtoms[0];
                const safeFile = (ea.source_file || '').replace(/"/g, '&quot;');
                html += `<button class="dos-srt-toggle" data-file="${safeFile}" data-cue="${ea.source_cue}" data-target="${fid}" onclick="toggleDossierSRT(this)">
    <span class="chevron">▶</span> 📹 ${ea.source_file} · Cue #${ea.source_cue} — Click to expand transcript
</button>
<div class="dos-srt-body" id="${fid}"></div>`;
            }
            html += '</div>';
        }
    }

    // ─── ENTITY REGISTRY ───
    html += `<div class="dos-section"><span class="dos-section-icon">📋</span><span class="dos-section-title">Entity Registry</span><span class="dos-section-count">${visNodes.length} entities</span></div>`;

    const typeOrder = ['PERSON', 'FACILITY', 'EVENT', 'METHOD', 'ORGANIZATION', 'ROLE', 'TIMEFRAME', 'SENSORY', 'SOURCE', 'DOCUMENT', 'ZONE'];
    for (const type of typeOrder) {
        const nodes = byType[type];
        if (!nodes || nodes.length === 0) continue;
        nodes.sort((a, b) => (b.corroboration_score || 0) - (a.corroboration_score || 0));

        const meta = TYPE_META[type] || { icon: '●', color: '#64748b', label: type };
        html += `<div class="dos-type-group">
<div class="dos-type-header" style="border-left-color:${meta.color}">
    <span class="dos-type-icon">${meta.icon}</span>
    <span class="dos-type-name">${meta.label}</span>
    <span class="dos-type-count">${nodes.length}</span>
</div>`;

        for (const n of nodes) {
            const { atoms: relAtoms } = findRelatedAtoms(n.id);
            const tier = n.corroboration_tier || 'UNCORROBORATED';
            const tierLabel = TIER_LABELS[tier] || tier;
            const name = (n.canonical_name || n.id).replace(/_/g, ' ');
            const ws = n.witness_source || 'W1';
            const wsCls = ws === 'W1' ? 'w1' : ws === 'W2' ? 'w2' : 'shared';
            const wsName = WITNESS_NAMES[ws] || ws;

            html += `<div class="dos-entity">
<div class="dos-entity-main">
    <div class="dos-entity-dot" style="color:${meta.color};background:${meta.color}"></div>
    <div class="dos-entity-info">
        <div class="dos-entity-name">${name}</div>
        <div class="dos-entity-meta">
            ${n.sub_type ? `<span class="dos-entity-sub">${n.sub_type.replace(/_/g, ' ').toLowerCase()}</span>` : ''}
            <span class="dos-entity-witness ${wsCls}">${wsName}</span>
            <span class="dos-tier-badge dos-tier-${tier}">${tierLabel}</span>
        </div>
    </div>
</div>`;

            // Provenance chain with arrows
            if (relAtoms.length > 0) {
                html += '<div class="dos-prov"><div class="dos-prov-label">📍 Testimony Source</div>';
                const showAtoms = relAtoms.slice(0, 3);
                for (const a of showAtoms) {
                    const srtId = 'srt-' + (a.id || '').replace(/[^a-zA-Z0-9]/g, '');
                    const safeFile = (a.source_file || '').replace(/"/g, '&quot;');
                    html += `<div class="dos-prov-item">
<div class="dos-prov-arrow-col">
    <div class="dos-prov-dot"></div>
    <div class="dos-prov-line"></div>
    <div class="dos-prov-end"></div>
</div>
<div class="dos-prov-content">
    <div class="dos-prov-atom">
        <div class="dos-prov-atom-id">${a.id}</div>
        <div class="dos-prov-atom-text">
            <span class="dos-prov-who">Subject:</span> ${a.who || '—'}
            <span class="dos-prov-did"> → Action:</span> ${(a.did_what || '').substring(0, 120)}${(a.did_what || '').length > 120 ? '…' : ''}
            ${a.to_whom ? `<br><span class="dos-prov-whom">Victim/Target:</span> ${a.to_whom}` : ''}
            <br><span class="dos-prov-where">Location:</span> ${a.where || '—'}
            <span class="dos-prov-when"> · Time:</span> ${a.when || a.when_iso || '—'}
        </div>
    </div>
    <button class="dos-srt-toggle" data-file="${safeFile}" data-cue="${a.source_cue}" data-target="${srtId}" onclick="toggleDossierSRT(this)">
        <span class="chevron">▶</span> 📹 ${a.source_file || '—'} · Cue #${a.source_cue || '—'} — Click to expand transcript
    </button>
    <div class="dos-srt-body" id="${srtId}"></div>
</div>
</div>`;
                }
                if (relAtoms.length > 3) {
                    html += `<div class="dos-prov-more">+ ${relAtoms.length - 3} more testimonial excerpts…</div>`;
                }
                html += '</div>';
            }

            html += '</div>'; // dos-entity
        }
        html += '</div>'; // dos-type-group
    }

    html += '</div>'; // dos-body

    // ─── FOOTER ───
    html += `<div class="dos-footer">
<div>
    <div class="dos-footer-seal">FORENSIC KNOWLEDGE GRAPH · DOSSIER</div>
    <div class="dos-footer-hash">Data Integrity: ${hash}</div>
    <div>Entities: ${visNodes.length} · Connections: ${visEdges.length} · Excerpts: ${atoms.length}</div>
</div>
<div style="text-align:right">
    <div>Syria Prisons Museum · ${now.slice(0, 10)}</div>
    <div>Witness Filter: ${WITNESS_NAMES[activeWitness] || activeWitness}</div>
    <div>Generated from forensic knowledge graph</div>
</div>
</div>`;

    html += `<div class="dos-print">
<button class="dos-print-btn" onclick="window.print()">🖨️ PRINT DOSSIER</button>
</div>`;

    // Show inline dossier
    const container = document.getElementById('dossier-container');
    container.innerHTML = html;
    container.classList.remove('hidden');

    // Hide graph UI
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('graph-container').style.display = 'none';
    const panelRight = document.getElementById('panel-right');
    if (panelRight) panelRight.style.display = 'none';
    const inspector = document.getElementById('inspector');
    if (inspector) inspector.style.display = 'none';
    const sourcePanel = document.getElementById('source-panel');
    if (sourcePanel) sourcePanel.style.display = 'none';
    const footer = document.getElementById('data-footer');
    if (footer) footer.style.display = 'none';

    // Simplify navbar
    document.getElementById('btn-sidebar').style.display = 'none';
    document.getElementById('btn-back').style.display = '';
    const searchBox = document.querySelector('.search-box');
    if (searchBox) searchBox.style.display = 'none';
    const headerRight = document.querySelector('.header-right');
    if (headerRight) headerRight.style.display = 'none';

    // Scroll to top
    container.scrollTop = 0;
}

function closeDossier() {
    const container = document.getElementById('dossier-container');
    container.classList.add('hidden');
    container.innerHTML = '';

    // Restore graph UI
    document.getElementById('sidebar').style.display = '';
    document.getElementById('graph-container').style.display = '';
    const footer = document.getElementById('data-footer');
    if (footer) footer.style.display = '';

    // Restore panel system
    const panelRight = document.getElementById('panel-right');
    if (panelRight) panelRight.style.display = '';
    const inspector = document.getElementById('inspector');
    if (inspector) inspector.style.display = '';
    const sourcePanel = document.getElementById('source-panel');
    if (sourcePanel) sourcePanel.style.display = '';

    // Reset panel state so togglePanel works correctly
    activePanel = null;
    const containers = ['flow', 'timeline', 'taxonomy', 'analysis'];
    containers.forEach(c => {
        const btn = document.getElementById('btn-' + c);
        if (btn) btn.classList.remove('active');
    });
    const pr = document.getElementById('panel-right');
    if (pr) pr.classList.add('hidden');

    // Restore navbar
    document.getElementById('btn-sidebar').style.display = '';
    document.getElementById('btn-back').style.display = 'none';
    const searchBox = document.querySelector('.search-box');
    if (searchBox) searchBox.style.display = '';
    const headerRight = document.querySelector('.header-right');
    if (headerRight) headerRight.style.display = '';
}

// SRT toggle for dossier (using data attributes, no escaping issues)
const dossierSrtCache = {};

async function toggleDossierSRT(btn) {
    const filename = btn.dataset.file;
    const cueNum = parseInt(btn.dataset.cue);
    const containerId = btn.dataset.target;
    const body = document.getElementById(containerId);
    if (!body) return;

    if (body.classList.contains('open')) {
        body.classList.remove('open');
        btn.classList.remove('open');
        return;
    }
    // Close any other open SRTs
    document.querySelectorAll('.dos-srt-body.open').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.dos-srt-toggle.open').forEach(el => el.classList.remove('open'));

    btn.classList.add('open');
    body.innerHTML = '<div class="dos-srt-loading">Loading transcript…</div>';
    body.classList.add('open');

    const cues = await loadDossierSRT(filename);
    if (!cues || cues.length === 0) {
        body.innerHTML = '<div class="dos-srt-error">⚠ Transcript not found: ' + filename + '</div>';
        return;
    }

    let h = '';
    for (const c of cues) {
        const isTarget = c.num === cueNum;
        const nearTarget = Math.abs(c.num - cueNum) <= 2;
        const cls = 'dos-srt-cue' + (isTarget ? ' dos-srt-target' : '') + (nearTarget && !isTarget ? ' dos-srt-near' : '');
        h += `<div class="${cls}" id="${containerId}-cue-${c.num}">`;
        h += `<span class="dos-srt-num">${c.num}</span>`;
        h += `<span class="dos-srt-time">${c.time}</span>`;
        h += `<span class="dos-srt-text">${c.text}</span>`;
        h += '</div>';
    }
    body.innerHTML = h;
    requestAnimationFrame(() => {
        const target = document.getElementById(containerId + '-cue-' + cueNum);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

async function loadDossierSRT(filename) {
    if (dossierSrtCache[filename]) return dossierSrtCache[filename];
    const paths = [
        'srt/\u062f\u0627\u062e\u0644\u064a/' + filename,
        'srt/\u062e\u0627\u0631\u062c\u064a/' + filename,
        'srt/' + filename,
    ];
    for (const p of paths) {
        try {
            const res = await fetch(p);
            if (res.ok) {
                const text = await res.text();
                const cues = parseDossierSRT(text);
                dossierSrtCache[filename] = cues;
                return cues;
            }
        } catch (e) { /* try next path */ }
    }
    return null;
}

function parseDossierSRT(text) {
    const cues = [];
    const blocks = text.trim().split(/\n\s*\n/);
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) continue;
        const num = parseInt(lines[0].trim());
        if (isNaN(num)) continue;
        const timeLine = lines[1] || '';
        const content = lines.slice(2).join(' ').trim();
        cues.push({ num, time: timeLine.trim(), text: content });
    }
    return cues;
}

// --- Tooltip ---
function showTooltip(evtInfo, nd) {
    const tt = document.getElementById('tooltip');
    const tier = nd.corroboration_tier || 'UNCORROBORATED';
    const { atoms: relAtoms, isDirect } = findRelatedAtoms(nd.id);
    const viaLabel = isDirect ? '' : ' <span style="color:#64748b;font-size:9px">(via edges)</span>';

    let ttHtml = `<div class="tt-label">${(nd.canonical_name || nd.id).replace(/_/g, ' ')}</div>
        <div class="tt-type">${nd.type}${nd.sub_type ? ' · ' + nd.sub_type : ''}</div>
        <div class="tt-score">Score: ${nd.corroboration_score || 0} · <span class="tier-badge tier-${tier}">${tier}</span></div>`;

    if (relAtoms.length > 0) {
        const a = relAtoms[0];
        ttHtml += `<div class="tt-atom">
            <span class="atom-who">[WHO]</span> ${a.who}<br>
            <span class="atom-did">[DID]</span> ${a.did_what}<br>
            ${a.to_whom ? `<span class="atom-whom">[TO]</span> ${a.to_whom}<br>` : ''}
            <span class="atom-where">[WHERE]</span> ${a.where}<br>
            <span class="atom-when">[WHEN]</span> ${a.when || a.when_iso || '—'}
        </div>`;
        if (relAtoms.length > 1) {
            ttHtml += `<div class="tt-more">+${relAtoms.length - 1} more atoms${viaLabel}</div>`;
        }
    }

    tt.innerHTML = ttHtml;

    // Position tooltip near mouse
    const container = document.getElementById('graph-container');
    const rect = container.getBoundingClientRect();
    let x, y;
    if (evtInfo.clientX !== undefined) {
        x = evtInfo.clientX - rect.left + 16;
        y = evtInfo.clientY - rect.top + 16;
    } else {
        // Fallback for rendered position
        x = (evtInfo.x || 100) + 16;
        y = (evtInfo.y || 100) + 16;
    }
    // Keep tooltip within container bounds
    if (x + 300 > rect.width) x = x - 320;
    if (y + 200 > rect.height) y = y - 220;

    tt.style.left = Math.max(0, x) + 'px';
    tt.style.top = Math.max(0, y) + 'px';
    tt.classList.remove('hidden');
}

// --- Inspector ---
function showInspector(node) {
    const panel = document.getElementById('inspector');
    const title = document.getElementById('inspector-title');
    const content = document.getElementById('inspector-content');
    title.textContent = (node.canonical_name || node.id).replace(/_/g, ' ');
    panel.classList.remove('hidden');

    const tier = node.corroboration_tier || 'UNCORROBORATED';
    const conn = fkg.edges.filter(e => e.from_node === node.id || e.to_node === node.id);

    let html = `<h4>Properties</h4>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${node.type}</span></div>
        <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value" style="font-size:10px">${node.id}</span></div>
        ${node.sub_type ? `<div class="detail-row"><span class="detail-label">Sub-type</span><span class="detail-value">${node.sub_type}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">Score</span><span class="detail-value">${node.corroboration_score || 0}</span></div>
        <div class="detail-row"><span class="detail-label">Tier</span><span class="tier-badge tier-${tier}">${tier}</span></div>
        ${node.witness_source ? `<div class="detail-row"><span class="detail-label">Witness</span><span class="detail-value">${node.witness_source}</span></div>` : ''}
        ${node.glossary_match ? `<div class="detail-row"><span class="detail-label">Glossary</span><span class="detail-value" style="color:#10b981">✓ ${node.glossary_source || ''}</span></div>` : ''}`;

    // Source locator — centralized 3-tier strategy
    const { atoms: rel, isDirect: isDirectMatch } = findRelatedAtoms(node.id);
    const locatorLabel = isDirectMatch ? '📍 Source Locator' : '📍 Source Locator (via edges)';

    if (rel.length > 0) {
        html += `<h4>${locatorLabel} (${rel.length})</h4><div class="source-list">`;
        for (const a of rel.slice(0, 10)) {
            const esc = a.source_file.replace(/'/g, "\\'");
            const containerId = `srt-inline-${a.id}`;
            html += `<div class="source-item" onclick="toggleInlineSRT('${esc}', ${a.source_cue}, '${a.id}', '${containerId}')">
                <div class="source-file">${a.source_file}</div>
                <div class="source-cue">Cue #${a.source_cue} · ${a.id}</div>
                <div class="source-action">${a.did_what.substring(0, 80)}${a.did_what.length > 80 ? '…' : ''}</div>
            </div>
            <div id="${containerId}" class="inline-srt-container" style="display:none"></div>`;
        }
        html += `</div>`;
    }

    if (conn.length > 0) {
        html += `<h4>Connected Edges (${conn.length})</h4><ul class="edge-list">`;
        for (const e of conn) {
            const cls = e.requires_human_gate ? 'critical' : (e.type.includes('PERPETRATED') ? 'critical' : 'medium');
            const other = e.from_node === node.id ? e.to_node : e.from_node;
            const gated = e.requires_human_gate ? ' ⚠️' : '';
            const cw = e.cross_witness ? ' ⚡' : '';
            html += `<li class="edge-list-item" onclick="navigateToNode('${other}')">
                <span class="edge-tag ${cls}">${e.type}</span>${other.replace(/_/g, ' ')}${gated}${cw}
            </li>`;
        }
        html += `</ul>`;
    }
    content.innerHTML = html;
}

document.getElementById('inspector-close').addEventListener('click', () => {
    document.getElementById('inspector').classList.add('hidden');
    selectedNode = null;
    clearHighlight();
});

// --- Inspector drag-resize from left edge ---
(function initInspectorResize() {
    const insp = document.getElementById('inspector');
    let resizing = false, startX = 0, startW = 0;

    insp.addEventListener('mousedown', function(e) {
        const rect = insp.getBoundingClientRect();
        if (e.clientX - rect.left > 6) return;
        resizing = true;
        startX = e.clientX;
        startW = insp.offsetWidth;
        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!resizing) return;
        const delta = startX - e.clientX;
        const newW = Math.max(280, Math.min(startW + delta, window.innerWidth * 0.7));
        insp.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (resizing) {
            resizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
})();

// --- Panel-right drag-resize ---
(function initPanelResize() {
    const panel = document.getElementById('panel-right');
    let resizing = false, startX = 0, startW = 0;

    panel.addEventListener('mousedown', function(e) {
        const rect = panel.getBoundingClientRect();
        if (e.clientX - rect.left > 6) return;
        if (panel.classList.contains('hidden') || panel.classList.contains('maximized')) return;
        resizing = true;
        startX = e.clientX;
        startW = panel.offsetWidth;
        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!resizing) return;
        const delta = startX - e.clientX;
        const newW = Math.max(280, Math.min(startW + delta, window.innerWidth * 0.7));
        panel.style.width = newW + 'px';
        if (cy) cy.resize();
    });

    document.addEventListener('mouseup', function() {
        if (resizing) {
            resizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (cy) cy.resize();
        }
    });
})();

// --- SRT loader ---
async function loadSRT(filename) {
    if (srtCache[filename]) return srtCache[filename];
    const paths = [
        SRT_BASE + 'داخلي/' + filename,
        SRT_BASE + 'خارجي/' + filename,
        SRT_BASE + filename,
    ];
    for (const p of paths) {
        try {
            const res = await fetch(p);
            if (res.ok) {
                const text = await res.text();
                srtCache[filename] = parseSRT(text);
                return srtCache[filename];
            }
        } catch (e) { /* try next */ }
    }
    return null;
}

function parseSRT(text) {
    const cues = [];
    const blocks = text.trim().split(/\n\s*\n/);
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) continue;
        const num = parseInt(lines[0].trim());
        if (isNaN(num)) continue;
        const timeLine = lines.length > 1 ? lines[1] : '';
        const content = lines.slice(2).join(' ').trim();
        cues.push({ num, time: timeLine.trim(), text: content });
    }
    return cues;
}

// --- Inline SRT expansion ---
let activeInlineSRT = null;

async function toggleInlineSRT(filename, cueNum, atomId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.style.display !== 'none') {
        container.style.display = 'none';
        container.innerHTML = '';
        if (activeInlineSRT === containerId) activeInlineSRT = null;
        return;
    }

    if (activeInlineSRT && activeInlineSRT !== containerId) {
        const prev = document.getElementById(activeInlineSRT);
        if (prev) { prev.style.display = 'none'; prev.innerHTML = ''; }
    }
    activeInlineSRT = containerId;

    const atom = atoms.find(a => a.id === atomId);

    let html = '';
    if (atom) {
        html += `<div class="sp-atom">
            <span class="atom-who">[WHO]</span> ${atom.who}<br>
            <span class="atom-did">[DID]</span> ${atom.did_what}<br>
            ${atom.to_whom ? `<span class="atom-whom">[TO]</span> ${atom.to_whom}<br>` : ''}
            <span class="atom-where">[WHERE]</span> ${atom.where}<br>
            <span class="atom-when">[WHEN]</span> ${atom.when || atom.when_iso || '—'}
        </div>`;
        if (atom.sensory && atom.sensory.length > 0) {
            html += `<div class="sp-sensory">🔊 ${atom.sensory.join(', ')}</div>`;
        }
    }

    html += `<div class="sp-srt-header">Source Transcript — cue #${cueNum}</div>`;
    html += `<div class="sp-srt-body" id="srt-scroll-${containerId}">`;

    const cues = await loadSRT(filename);
    if (cues && cues.length > 0) {
        for (const c of cues) {
            const isTarget = c.num === cueNum;
            const nearTarget = Math.abs(c.num - cueNum) <= 2;
            html += `<div class="srt-cue ${isTarget ? 'srt-target' : ''} ${nearTarget && !isTarget ? 'srt-near' : ''}" id="srt-${containerId}-cue-${c.num}">
                <span class="srt-num">${c.num}</span>
                <span class="srt-time">${c.time}</span>
                <span class="srt-text">${c.text}</span>
            </div>`;
        }
    } else {
        html += `<div class="srt-no-data">⚠️ SRT file not accessible.<br>
            <code>${filename}</code></div>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    container.style.display = 'block';

    requestAnimationFrame(() => {
        const target = document.getElementById(`srt-${containerId}-cue-${cueNum}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

// Legacy compat
async function openSourcePanel(filename, cueNum, atomId) {
    console.log('openSourcePanel deprecated — use toggleInlineSRT');
}

// --- Search ---
function searchNodes(query) {
    const results = document.getElementById('search-results');
    if (!query || query.length < 2) {
        results.classList.add('hidden');
        results.innerHTML = '';
        return;
    }
    const q = query.toLowerCase();
    const matches = fkg.nodes.filter(n => {
        const name = (n.canonical_name || n.id || '').toLowerCase();
        const id = (n.id || '').toLowerCase();
        const type = (n.type || '').toLowerCase();
        return name.includes(q) || id.includes(q) || type.includes(q);
    }).slice(0, 15);

    if (matches.length === 0) {
        results.innerHTML = '<div style="padding:10px;font-size:11px;color:#64748b;text-align:center">No nodes found</div>';
    } else {
        results.innerHTML = matches.map(n => {
            const color = getNodeColor(n);
            const name = (n.canonical_name || n.id).replace(/_/g, ' ');
            return `<div class="search-result-item" onclick="selectSearchResult('${n.id}')">
                <div class="sr-dot" style="background:${color}"></div>
                <span class="sr-name">${name}</span>
                <span class="sr-type">${n.type}</span>
            </div>`;
        }).join('');
    }
    results.classList.remove('hidden');
}

function selectSearchResult(nodeId) {
    if (!cy) return;
    const node = cy.$('#' + nodeId);
    if (node.length === 0) return;
    cy.animate({ fit: { eles: node, padding: 100 } }, { duration: 400 });
    setTimeout(() => {
        node.select();
        showInspector(node.data('nodeData'));
        highlightNeighbors(node);
    }, 420);
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('search-input').value = '';
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box')) {
        document.getElementById('search-results').classList.add('hidden');
    }
});

// --- Navigate to node (from flow/timeline/inspector) ---
function navigateToNode(nodeId, sourceFile, sourceCue, atomId) {
    if (!cy) return;
    const node = cy.$('#' + nodeId);
    if (node.length === 0) return;
    cy.animate({ fit: { eles: node, padding: 100 } }, { duration: 400 });
    setTimeout(() => {
        node.select();
        // Only show inspector when no side panel is open (avoids visual clutter)
        if (!activePanel) {
            showInspector(node.data('nodeData'));
        }
        highlightNeighbors(node);
    }, 420);
}

// --- Witness Filter ---
function setWitnessFilter(val) {
    activeWitness = val;
    applyFilters();
}

// --- Filters ---
function applyFilters() {
    if (!cy) return;

    cy.batch(() => {
        // Show all first
        cy.elements().removeClass('hidden');

        // Node type filter
        cy.nodes().forEach(node => {
            const type = node.data('type');
            const tier = node.data('corroboration_tier') || 'UNCORROBORATED';
            const ws = node.data('witness_source') || 'W1';

            let hide = false;
            if (!activeNodeTypes.has(type)) hide = true;
            if (!activeTiers.has(tier)) hide = true;
            if (!witnessMatch(ws)) hide = true;

            if (hide) node.addClass('hidden');
        });

        // Edge filtering
        cy.edges().forEach(edge => {
            const type = edge.data('type');
            const ws = edge.data('witness_source') || 'W1';

            let hide = false;
            if (!activeEdgeTypes.has(type)) hide = true;

            // Witness-based edge filtering
            if (activeWitness === 'CW') {
                if (type !== 'CROSS_WITNESS' && !edge.data('cross_witness')) {
                    const src = edge.source();
                    const tgt = edge.target();
                    if (!(src.data('witness_source') === 'SHARED' && tgt.data('witness_source') === 'SHARED')) {
                        hide = true;
                    }
                }
            } else {
                if (type === 'CROSS_WITNESS' && activeWitness !== 'ALL') hide = true;
                if (!witnessMatch(ws)) hide = true;
            }

            // Hide edges whose endpoints are hidden
            if (edge.source().hasClass('hidden') || edge.target().hasClass('hidden')) hide = true;

            if (hide) edge.addClass('hidden');
        });
    });
}

function witnessMatch(ws) {
    if (activeWitness === 'ALL') return true;
    if (activeWitness === 'CW') return ws === 'SHARED';
    if (ws === 'SHARED') return true;
    return ws === activeWitness;
}

// --- Sidebar ---
function toggleSidebarSection(section) {
    const el = document.getElementById(section + '-section');
    if (!el) return;
    const btn = document.getElementById('nav-' + section);
    if (el.style.display === 'none') {
        el.style.display = '';
        if (btn) btn.classList.add('active');
    } else {
        el.style.display = 'none';
        if (btn) btn.classList.remove('active');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    requestAnimationFrame(() => { if (cy) cy.resize(); });
}

// --- Reset Graph ---
let temporalMode = false;
let physicsRunning = false;
function resetGraph() {
    if (!cy) return;
    selectedNode = null;
    temporalMode = false;
    physicsRunning = false;
    clearSavedLayout();
    document.getElementById('inspector').classList.add('hidden');
    clearHighlight();
    togglePanel(null);
    cy.layout({
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 800,
        randomize: true,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 120,
        nodeRepulsion: 8000,
        edgeElasticity: 0.45,
        gravity: 0.25,
        numIter: 2500,
        fit: true,
        padding: 30,
    }).run();
    updatePhysicsBtn();
}

// --- Gentle Physics Toggle ---
function togglePhysics() {
    if (!cy) return;
    physicsRunning = !physicsRunning;
    updatePhysicsBtn();

    if (physicsRunning) {
        // Run gentle physics — soft forces, from current positions (no randomize)
        cy.layout({
            name: 'cose-bilkent',
            animate: true,
            animationDuration: 1500,
            randomize: false,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 180,
            nodeRepulsion: 3000,
            edgeElasticity: 0.15,
            gravity: 0.08,
            gravityRange: 2.0,
            numIter: 1500,
            fit: true,
            padding: 40,
            tile: false,
        }).run();
    }
    // When toggled off, nodes just stay where they are
}

function updatePhysicsBtn() {
    const btn = document.getElementById('btn-physics');
    if (btn) {
        btn.classList.toggle('active', physicsRunning);
        btn.title = physicsRunning ? 'Physics: ON (click to stop)' : 'Physics: OFF (click to start)';
    }
}

// --- Panel System ---
function togglePanel(type) {
    const panel = document.getElementById('panel-right');
    const containers = ['flow', 'timeline', 'taxonomy', 'analysis'];
    const titles = {
        flow: '📊 Evidence Flow', timeline: '📅 Timeline',
        taxonomy: '🌳 Taxonomy', analysis: '📈 Forensic Analysis',
    };

    if (type === null || activePanel === type) {
        panel.classList.add('hidden');
        panel.classList.remove('maximized');
        containers.forEach(c => {
            const btn = document.getElementById('btn-' + c);
            if (btn) btn.classList.remove('active');
        });
        activePanel = null;
    } else {
        activePanel = type;
        panel.classList.remove('hidden');
        containers.forEach(c => {
            const btn = document.getElementById('btn-' + c);
            if (btn) btn.classList.toggle('active', c === type);
            const el = document.getElementById(c + '-container');
            if (el) el.style.display = c === type ? 'block' : 'none';
        });
        document.getElementById('panel-title').textContent = titles[type] || type;
        if (type === 'flow') renderEvidenceFlow();
        if (type === 'timeline') renderTimeline();
        if (type === 'taxonomy') renderTaxonomy();
        if (type === 'analysis') renderAnalysis();
    }
    requestAnimationFrame(() => { if (cy) cy.resize(); });
}

function maximizePanel() {
    const panel = document.getElementById('panel-right');
    panel.classList.toggle('maximized');
    requestAnimationFrame(() => { if (cy) cy.resize(); });
}

function switchView(view) { togglePanel(view === 'graph' ? null : view); }

// --- Taxonomy Tree ---
function renderTaxonomy() {
    const container = document.getElementById('taxonomy-container');
    if (!fkg) return;

    // Collect type counts + sub-type breakdowns
    const typeCounts = {};
    const subTypes = {};
    for (const n of fkg.nodes) {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
        if (n.type === 'PERSON' && n.sub_type) {
            if (!subTypes[n.type]) subTypes[n.type] = {};
            subTypes[n.type][n.sub_type] = (subTypes[n.type][n.sub_type] || 0) + 1;
        }
    }

    // Edge type counts
    const edgeCounts = {};
    for (const e of fkg.edges) {
        edgeCounts[e.type] = (edgeCounts[e.type] || 0) + 1;
    }

    // Corroboration by type
    const tiersByType = {};
    for (const n of fkg.nodes) {
        if (!tiersByType[n.type]) tiersByType[n.type] = { CORROBORATED: 0, SUPPORTED: 0, UNCORROBORATED: 0, CONVERGENT: 0 };
        const tier = n.corroboration_tier || 'UNCORROBORATED';
        tiersByType[n.type][tier] = (tiersByType[n.type][tier] || 0) + 1;
    }

    const typeLabels = {
        PERSON: 'Person', FACILITY: 'Facility', EVENT: 'Event',
        METHOD: 'Method', ORGANIZATION: 'Organization', ROLE: 'Role',
        TIMEFRAME: 'Timeframe', SENSORY: 'Sensory', SOURCE: 'Source',
        DOCUMENT: 'Document', ZONE: 'Zone',
    };
    const subLabels = {
        WITNESS: 'Witness', PERPETRATOR: 'Perpetrator',
        CO_DETAINEE: 'Co-detainee', VICTIM: 'Victim', BYSTANDER: 'Bystander'
    };

    // Sort by count descending
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const total = fkg.nodes.length;

    let html = '<div class="tax-tree">';
    html += `<div class="tax-root">
        <div class="tax-root-label">🔴 FKG Root</div>
        <div class="tax-root-stats">${total} nodes · ${fkg.edges.length} edges</div>
    </div>`;

    for (const [type, count] of sorted) {
        const color = NODE_COLORS[type] || '#64748b';
        const pct = ((count / total) * 100).toFixed(0);
        const tiers = tiersByType[type] || {};
        const corrCount = (tiers.CORROBORATED || 0) + (tiers.CONVERGENT || 0);
        const suppCount = tiers.SUPPORTED || 0;

        html += `<div class="tax-branch" onclick="filterByType('${type}')">
            <div class="tax-connector"></div>
            <div class="tax-node" style="border-color:${color}">
                <div class="tax-header">
                    <span class="tax-dot" style="background:${color}"></span>
                    <span class="tax-name">${typeLabels[type] || type}</span>
                    <span class="tax-count">${count}</span>
                    <span class="tax-pct">${pct}%</span>
                </div>
                <div class="tax-bar-bg">
                    <div class="tax-bar" style="width:${pct}%;background:${color}"></div>
                </div>`;

        // Corroboration mini-bar
        if (corrCount > 0 || suppCount > 0) {
            const corrPct = ((corrCount / count) * 100).toFixed(0);
            const suppPct = ((suppCount / count) * 100).toFixed(0);
            html += `<div class="tax-tiers">
                <span style="color:#10b981">✓ ${corrCount}</span>
                <span style="color:#06b6d4">◐ ${suppCount}</span>
                <span style="color:#64748b">○ ${count - corrCount - suppCount}</span>
            </div>`;
        }

        // Audit annotations — source locator coverage
        const typeNodes = fkg.nodes.filter(n => n.type === type);
        let withAtoms = 0;
        for (const n of typeNodes) {
            const { atoms: ra } = findRelatedAtoms(n.id);
            if (ra.length > 0) withAtoms++;
        }
        const orphans = count - withAtoms;
        const covPct = count > 0 ? ((withAtoms / count) * 100).toFixed(0) : '0';
        const auditColor = orphans === 0 ? '#10b981' : orphans > count * 0.5 ? '#ef4444' : '#f59e0b';
        const auditIcon = orphans === 0 ? '✅' : orphans > count * 0.5 ? '🔴' : '⚠️';
        html += `<div class="tax-tiers" style="margin-top:3px">
            <span style="color:${auditColor}">${auditIcon} ${covPct}% sourced</span>
            ${orphans > 0 ? `<span style="color:#ef4444">${orphans} orphan${orphans > 1 ? 's' : ''}</span>` : ''}
        </div>`;

        // Sub-type breakdown for PERSON
        if (subTypes[type]) {
            html += '<div class="tax-subtypes">';
            for (const [st, sc] of Object.entries(subTypes[type]).sort((a, b) => b[1] - a[1])) {
                const stColor = SUB_TYPE_COLORS[st] || '#64748b';
                html += `<div class="tax-subtype">
                    <span class="tax-dot" style="background:${stColor};width:6px;height:6px"></span>
                    ${subLabels[st] || st} <span class="tax-sub-count">${sc}</span>
                </div>`;
            }
            html += '</div>';
        }

        html += `</div></div>`;
    }

    // Edge type section
    html += '<div class="tax-section-header">Edge Types</div>';
    const sortedEdges = Object.entries(edgeCounts).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedEdges) {
        const color = EDGE_COLORS[type] || '#334155';
        const pct = ((count / fkg.edges.length) * 100).toFixed(0);
        html += `<div class="tax-edge-row">
            <span class="tax-dot" style="background:${color}"></span>
            <span class="tax-edge-name">${type.replace(/_/g, ' ')}</span>
            <span class="tax-edge-count">${count}</span>
            <div class="tax-bar-bg tax-bar-sm">
                <div class="tax-bar" style="width:${pct}%;background:${color}"></div>
            </div>
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// --- Filter helpers for Analysis panel click-to-highlight ---
function filterByTier(tier) {
    if (!cy) return;
    clearHighlight();
    cy.batch(() => {
        cy.elements().addClass('tax-dimmed');
        const matchNodes = cy.nodes().filter(n => (n.data('corroboration_tier') || 'UNCORROBORATED') === tier);
        matchNodes.removeClass('tax-dimmed');
        matchNodes.connectedEdges().removeClass('tax-dimmed').addClass('tax-highlight');
        matchNodes.neighborhood().nodes().removeClass('tax-dimmed');
    });
    const matchNodes = cy.nodes().filter(n => (n.data('corroboration_tier') || 'UNCORROBORATED') === tier);
    if (matchNodes.length > 0) cy.animate({ fit: { eles: matchNodes, padding: 40 } }, { duration: 400 });
}

function filterByEdgeType(edgeType) {
    if (!cy) return;
    clearHighlight();
    cy.batch(() => {
        cy.elements().addClass('tax-dimmed');
        const matchEdges = cy.edges().filter(e => e.data('type') === edgeType);
        matchEdges.removeClass('tax-dimmed').addClass('tax-highlight');
        matchEdges.connectedNodes().removeClass('tax-dimmed');
    });
    const matchEdges = cy.edges().filter(e => e.data('type') === edgeType);
    if (matchEdges.length > 0) cy.animate({ fit: { eles: matchEdges.connectedNodes(), padding: 40 } }, { duration: 400 });
}

// Filter main graph by type (from taxonomy click) — highlight, don't hide
let taxonomyFilterActive = null;
function filterByType(type) {
    if (!cy) return;

    // Toggle off if same type clicked again
    if (taxonomyFilterActive === type) {
        taxonomyFilterActive = null;
        cy.batch(() => {
            cy.elements().removeClass('tax-dimmed tax-highlight');
        });
        return;
    }

    taxonomyFilterActive = type;
    cy.batch(() => {
        cy.elements().removeClass('tax-dimmed tax-highlight');
        // Dim everything first
        cy.elements().addClass('tax-dimmed');
        // Highlight matching nodes + their edges
        const matchingNodes = cy.nodes().filter(n => n.data('type') === type);
        matchingNodes.removeClass('tax-dimmed');
        matchingNodes.connectedEdges().removeClass('tax-dimmed').addClass('tax-highlight');
        // Also un-dim the neighbors connected by highlighted edges
        matchingNodes.neighborhood().nodes().removeClass('tax-dimmed');
    });
    // Fit to highlighted nodes
    const visible = cy.nodes().filter(n => n.data('type') === type);
    if (visible.length > 0) {
        cy.animate({ fit: { eles: visible, padding: 40 } }, { duration: 400 });
    }
}

// --- Forensic Analysis ---
function renderAnalysis() {
    const container = document.getElementById('analysis-container');
    if (!cy || !fkg) return;

    let html = '<div class="analysis-panel">';

    // 1. Top 10 by Degree
    const degreeData = [];
    cy.nodes().forEach(node => {
        if (!node.hasClass('hidden')) {
            degreeData.push({ id: node.id(), label: node.data('fullLabel'), degree: node.degree(), color: node.data('color') });
        }
    });
    degreeData.sort((a, b) => b.degree - a.degree);

    html += '<div class="analysis-section"><h4>🔗 Top 10 by Degree</h4>';
    html += '<div class="analysis-list">';
    for (const d of degreeData.slice(0, 10)) {
        const barW = ((d.degree / (degreeData[0]?.degree || 1)) * 100).toFixed(0);
        html += `<div class="analysis-row" onclick="selectSearchResult('${d.id}')">
            <span class="analysis-dot" style="background:${d.color}"></span>
            <span class="analysis-name">${d.label}</span>
            <span class="analysis-val">${d.degree}</span>
            <div class="analysis-bar-bg"><div class="analysis-bar" style="width:${barW}%;background:${d.color}"></div></div>
        </div>`;
    }
    html += '</div></div>';

    // 2. Top 10 by Betweenness Centrality
    try {
        const bc = cy.elements().not('.hidden').betweennessCentrality({ directed: false });
        const bcData = [];
        cy.nodes().not('.hidden').forEach(node => {
            bcData.push({ id: node.id(), label: node.data('fullLabel'), bc: bc.betweenness(node), color: node.data('color') });
        });
        bcData.sort((a, b) => b.bc - a.bc);

        html += '<div class="analysis-section"><h4>🌉 Top 10 by Betweenness</h4>';
        html += '<div class="analysis-list">';
        for (const d of bcData.slice(0, 10)) {
            const barW = ((d.bc / (bcData[0]?.bc || 1)) * 100).toFixed(0);
            html += `<div class="analysis-row" onclick="selectSearchResult('${d.id}')">
                <span class="analysis-dot" style="background:${d.color}"></span>
                <span class="analysis-name">${d.label}</span>
                <span class="analysis-val">${d.bc.toFixed(3)}</span>
                <div class="analysis-bar-bg"><div class="analysis-bar" style="width:${barW}%;background:${d.color}"></div></div>
            </div>`;
        }
        html += '</div></div>';
    } catch (e) { console.warn('Betweenness calc failed:', e); }

    // 3. Corroboration Breakdown
    const tierCounts = { CONVERGENT: 0, CORROBORATED: 0, SUPPORTED: 0, UNCORROBORATED: 0 };
    for (const n of fkg.nodes) {
        const t = n.corroboration_tier || 'UNCORROBORATED';
        tierCounts[t] = (tierCounts[t] || 0) + 1;
    }
    const tierColors = { CONVERGENT: '#10b981', CORROBORATED: '#8b5cf6', SUPPORTED: '#06b6d4', UNCORROBORATED: '#64748b' };

    html += '<div class="analysis-section"><h4>🎯 Corroboration</h4>';
    html += '<div class="analysis-stacked-bar">';
    for (const [tier, count] of Object.entries(tierCounts)) {
        if (count === 0) continue;
        const pct = ((count / fkg.nodes.length) * 100).toFixed(1);
        html += `<div class="analysis-seg" style="width:${pct}%;background:${tierColors[tier]}" title="${tier}: ${count} (${pct}%)"></div>`;
    }
    html += '</div><div class="analysis-legend">';
    for (const [tier, count] of Object.entries(tierCounts)) {
        if (count === 0) continue;
        html += `<span class="analysis-leg-item" style="cursor:pointer" onclick="filterByTier('${tier}')" title="Click to highlight ${tier} nodes"><span class="analysis-dot" style="background:${tierColors[tier]}"></span>${tier} ${count}</span>`;
    }
    html += '</div></div>';

    // 4. Witness Coverage
    const witCounts = {};
    for (const n of fkg.nodes) {
        const w = n.witness_source || 'W1';
        witCounts[w] = (witCounts[w] || 0) + 1;
    }
    const witColors = { W1: '#22c55e', W2: '#3b82f6', SHARED: '#a855f7' };
    const witLabels = { W1: 'W1 (Talal)', W2: 'W2 (Faraj)', SHARED: 'Shared' };

    html += '<div class="analysis-section"><h4>👥 Witness Coverage</h4>';
    html += '<div class="analysis-stacked-bar">';
    for (const [w, count] of Object.entries(witCounts)) {
        const pct = ((count / fkg.nodes.length) * 100).toFixed(1);
        html += `<div class="analysis-seg" style="width:${pct}%;background:${witColors[w] || '#64748b'}" title="${witLabels[w] || w}: ${count} (${pct}%)"></div>`;
    }
    html += '</div><div class="analysis-legend">';
    for (const [w, count] of Object.entries(witCounts)) {
        html += `<span class="analysis-leg-item"><span class="analysis-dot" style="background:${witColors[w] || '#64748b'}"></span>${witLabels[w] || w} ${count}</span>`;
    }
    html += '</div></div>';

    // 5. Edge Type Distribution
    const edgeCounts = {};
    for (const e of fkg.edges) edgeCounts[e.type] = (edgeCounts[e.type] || 0) + 1;
    const sortedEdges = Object.entries(edgeCounts).sort((a, b) => b[1] - a[1]);

    // Edge types grouped by legal weight
    const legalWeightGroups = {
        'Critical': ['PERPETRATED', 'ORDERED', 'COMMANDED'],
        'High': ['WITNESSED', 'DETAINED_AT', 'OCCURRED_AT', 'OCCURRED_IN'],
        'Medium': ['USED_METHOD', 'CO_DETAINED', 'HOLDS_ROLE', 'MEMBER_OF', 'LOCATED_IN', 'TRANSFERRED_TO', 'TEMPORAL', 'SENSORY_AT'],
        'Cross-regime': ['CROSS_REGIME_TRANSFER', 'CROSS_WITNESS'],
        'Verification': ['CORROBORATES'],
    };
    const weightColors = { 'Critical': '#ef4444', 'High': '#f59e0b', 'Medium': '#3b82f6', 'Cross-regime': '#f97316', 'Verification': '#10b981' };
    html += '<div class="analysis-section"><h4>🔀 Edge Types (by Legal Weight)</h4>';
    for (const [weight, types] of Object.entries(legalWeightGroups)) {
        const wEdges = types.filter(t => edgeCounts[t]).map(t => [t, edgeCounts[t]]);
        if (wEdges.length === 0) continue;
        const wTotal = wEdges.reduce((s, e) => s + e[1], 0);
        html += `<div style="font-size:9px;font-weight:700;color:${weightColors[weight]};margin:8px 0 3px;text-transform:uppercase;letter-spacing:1px">${weight} (${wTotal})</div><div class="analysis-list">`;
        for (const [type, count] of wEdges) {
            const color = EDGE_COLORS[type] || '#334155';
            const barW = ((count / (sortedEdges[0]?.[1] || 1)) * 100).toFixed(0);
            html += `<div class="analysis-row" style="cursor:pointer" onclick="filterByEdgeType('${type}')" title="Click to highlight ${type} edges">
                <span class="analysis-dot" style="background:${color}"></span>
                <span class="analysis-name">${type.replace(/_/g, ' ')}</span>
                <span class="analysis-val">${count}</span>
                <div class="analysis-bar-bg"><div class="analysis-bar" style="width:${barW}%;background:${color}"></div></div>
            </div>`;
        }
        html += '</div>';
    }
    // Any ungrouped edge types
    const allGrouped = new Set(Object.values(legalWeightGroups).flat());
    const ungrouped = sortedEdges.filter(([t]) => !allGrouped.has(t));
    if (ungrouped.length > 0) {
        html += '<div style="font-size:9px;font-weight:700;color:#64748b;margin:8px 0 3px;text-transform:uppercase;letter-spacing:1px">Other</div><div class="analysis-list">';
        for (const [type, count] of ungrouped) {
            const color = EDGE_COLORS[type] || '#334155';
            const barW = ((count / (sortedEdges[0]?.[1] || 1)) * 100).toFixed(0);
            html += `<div class="analysis-row" style="cursor:pointer" onclick="filterByEdgeType('${type}')">
                <span class="analysis-dot" style="background:${color}"></span>
                <span class="analysis-name">${type.replace(/_/g, ' ')}</span>
                <span class="analysis-val">${count}</span>
                <div class="analysis-bar-bg"><div class="analysis-bar" style="width:${barW}%;background:${color}"></div></div>
            </div>`;
        }
        html += '</div>';
    }
    html += '</div>';

    // 6. Human Gate Status
    const gateTotal = fkg.edges.filter(e => e.requires_human_gate).length;
    const gateApproved = fkg.edges.filter(e => e.requires_human_gate && e.human_approved).length;
    const gatePending = gateTotal - gateApproved;

    html += '<div class="analysis-section"><h4>⚠️ Human Gates</h4>';
    html += `<div class="analysis-gate-grid">
        <div class="analysis-gate-card gate-total"><div class="gate-num">${gateTotal}</div><div class="gate-label">Total</div></div>
        <div class="analysis-gate-card gate-approved"><div class="gate-num">${gateApproved}</div><div class="gate-label">Approved</div></div>
        <div class="analysis-gate-card gate-pending"><div class="gate-num">${gatePending}</div><div class="gate-label">Pending</div></div>
    </div></div>`;

    html += '</div>';
    container.innerHTML = html;
}

// ═══ FORENSIC FLOW — DUAL-LANE ENGINE ═══

// Phase classification by keyword matching
const FLOW_PHASES = {
    ARREST:    { color: '#22c55e', icon: '🟢', keywords: ['arrest', 'capture', 'seize', 'apprehend', 'checkpoint', 'raid', 'abduct', 'kidnap', 'take', 'brought in'] },
    DETENTION: { color: '#3b82f6', icon: '🔵', keywords: ['detain', 'prison', 'cell', 'held', 'imprison', 'confine', 'solitary', 'jail', 'locked', 'custody', 'transfer', 'moved'] },
    TORTURE:   { color: '#dc2626', icon: '🔴', keywords: ['torture', 'beat', 'shabeh', 'hung', 'whip', 'lash', 'electric', 'burn', 'tire', 'hose', 'strike', 'crucif', 'hit', 'punch', 'kick', 'water', 'starv', 'deprive', 'stick', 'flog', 'club'] },
    LEGAL:     { color: '#f59e0b', icon: '🟡', keywords: ['court', 'judge', 'sentence', 'trial', 'sharia', 'qisas', 'ruling', 'verdict', 'law', 'charge'] },
    TRANSFER:  { color: '#f97316', icon: '🟠', keywords: ['transfer', 'escape', 'release', 'freed', 'ransom', 'exchanged', 'smuggle', 'flee', 'deported'] },
    WITNESS:   { color: '#8b5cf6', icon: '🟣', keywords: ['witness', 'saw', 'confirm', 'corroborate', 'verified', 'heard', 'told', 'report', 'describe', 'observ'] },
};

function classifyPhase(atom) {
    const text = ((atom.did_what || '') + ' ' + (atom.where || '')).toLowerCase();
    let bestPhase = 'DETENTION';
    let bestScore = 0;
    for (const [phase, cfg] of Object.entries(FLOW_PHASES)) {
        let score = 0;
        for (const kw of cfg.keywords) {
            if (text.includes(kw)) score++;
        }
        if (score > bestScore) { bestScore = score; bestPhase = phase; }
    }
    return bestPhase;
}

// Group consecutive same-phase atoms into phase blocks
function groupIntoPhases(atomList) {
    const groups = [];
    let current = null;
    for (const a of atomList) {
        const phase = classifyPhase(a);
        if (current && current.phase === phase) {
            current.atoms.push(a);
        } else {
            current = { phase, atoms: [a] };
            groups.push(current);
        }
    }
    return groups;
}

// Find corroboration tier for an atom's canonical refs
function getAtomTier(atom) {
    if (!fkg) return 'UNCORROBORATED';
    const refs = [atom.who_canonical, atom.to_whom_canonical, atom.where_canonical].filter(Boolean);
    const tiers = ['CONVERGENT', 'CORROBORATED', 'SUPPORTED'];
    for (const ref of refs) {
        const node = fkg.nodes.find(n => n.id === ref);
        if (node && tiers.includes(node.corroboration_tier)) return node.corroboration_tier;
    }
    return 'UNCORROBORATED';
}

const TIER_BADGES = {
    CONVERGENT: { icon: '🟢', label: 'CONVERGENT' },
    CORROBORATED: { icon: '🟡', label: 'CORROBORATED' },
    SUPPORTED: { icon: '🔵', label: 'SUPPORTED' },
    UNCORROBORATED: { icon: '⚪', label: 'UNCORROBRTD' },
};

// Best tier from a group of atoms
function groupTier(atoms) {
    const rank = { CONVERGENT: 3, CORROBORATED: 2, SUPPORTED: 1, UNCORROBORATED: 0 };
    let best = 'UNCORROBORATED';
    for (const a of atoms) {
        const t = getAtomTier(a);
        if (rank[t] > rank[best]) best = t;
    }
    return best;
}

// Build the title for a phase group (first atom's did_what, full text)
function phaseTitle(group) {
    const first = group.atoms[0];
    return first.did_what || first.who || 'Unknown action';
}

// Render a single phase card
function renderPhaseCard(group, idx) {
    const cfg = FLOW_PHASES[group.phase] || FLOW_PHASES.DETENTION;
    const tier = groupTier(group.atoms);
    const tb = TIER_BADGES[tier] || TIER_BADGES.UNCORROBORATED;
    const title = phaseTitle(group);
    const when = group.atoms[0].when || group.atoms[0].when_iso || '';
    const where = group.atoms[0].where || '';
    const atomCount = group.atoms.length;
    const cardId = `flow-phase-${idx}`;

    let html = `<div class="flow-phase" style="border-left-color:${cfg.color}" id="${cardId}">`;
    html += `<div class="flow-phase-label"><span class="flow-phase-dot" style="background:${cfg.color}"></span><span style="color:${cfg.color}">${group.phase}</span></div>`;
    html += `<div class="flow-phase-title">${escHtml(title)}</div>`;
    html += `<div class="flow-phase-meta">`;
    if (when) html += `<span>📅 ${escHtml(when)}</span>`;
    if (where) html += `<span>📍 ${escHtml(where)}</span>`;
    html += `<span>${tb.icon} ${tb.label}</span>`;
    html += `</div>`;

    // Expandable atom section
    if (atomCount > 0) {
        html += `<div class="flow-phase-count" onclick="event.stopPropagation(); toggleFlowAtoms('${cardId}')">${atomCount} atom${atomCount > 1 ? 's' : ''} ▸</div>`;
        html += `<div class="flow-atoms" id="${cardId}-atoms">`;
        for (const a of group.atoms) {
            const nodeId = a.who_canonical || a.where_canonical || '';
            const esc = (a.source_file || '').replace(/'/g, "\\'");
            html += `<div class="flow-atom" onclick="event.stopPropagation(); navigateToNode('${nodeId}','${esc}',${a.source_cue || 0},'${a.id}')">`;
            html += `<div class="flow-atom-id">${a.id}</div>`;
            html += `<div class="flow-atom-text">${escHtml(a.did_what || '')}</div>`;
            html += `<div class="flow-atom-detail">`;
            if (a.who) html += `👤 ${escHtml(a.who)}<br>`;
            if (a.source_file) html += `📄 ${escHtml(a.source_file)}<br>`;
            if (a.source_cue) html += `⏱ ${formatCue(a.source_cue)}<br>`;
            html += `🔒 ${a.confidence || 'unknown'}`;
            html += `</div></div>`;
        }
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}

function formatCue(cue) {
    if (!cue) return '';
    const s = Math.round(cue);
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    const h = Math.floor(m / 60);
    const mm = (m % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toggleFlowAtoms(cardId) {
    const el = document.getElementById(cardId + '-atoms');
    if (el) el.classList.toggle('open');
    // Update the count label
    const countEl = el?.previousElementSibling;
    if (countEl && el) {
        const n = el.querySelectorAll('.flow-atom').length;
        countEl.textContent = el.classList.contains('open') ? `${n} atom${n > 1 ? 's' : ''} ▾` : `${n} atom${n > 1 ? 's' : ''} ▸`;
    }
}

// Find cross-witness convergence nodes
function findConvergenceNodes() {
    if (!fkg || !atoms) return [];
    const w1Atoms = atoms.filter(a => (a.witness || 'W1') === 'W1');
    const w2Atoms = atoms.filter(a => (a.witness || 'W1') === 'W2');
    const w1Refs = new Set();
    const w2Refs = new Set();
    w1Atoms.forEach(a => { [a.who_canonical, a.to_whom_canonical, a.where_canonical].filter(Boolean).forEach(r => w1Refs.add(r)); });
    w2Atoms.forEach(a => { [a.who_canonical, a.to_whom_canonical, a.where_canonical].filter(Boolean).forEach(r => w2Refs.add(r)); });

    // Nodes referenced by both + FKG SHARED nodes
    const convIds = new Set();
    w1Refs.forEach(r => { if (w2Refs.has(r)) convIds.add(r); });
    fkg.nodes.filter(n => n.witness_source === 'SHARED').forEach(n => convIds.add(n.id));

    return [...convIds].map(id => {
        const node = fkg.nodes.find(n => n.id === id);
        return node || { id, type: 'UNKNOWN', canonical_name: id, corroboration_tier: 'UNCORROBORATED' };
    });
}

// --- Main Render ---
function renderEvidenceFlow() {
    const container = document.getElementById('flow-container');
    if (!atoms || atoms.length === 0) {
        container.innerHTML = '<div class="srt-no-data">No atom data available for Forensic Flow.</div>';
        return;
    }

    const w1Atoms = atoms.filter(a => (a.witness || 'W1') === 'W1').sort((a, b) => {
        const aw = a.when_iso || a.when || 'ZZZZ';
        const bw = b.when_iso || b.when || 'ZZZZ';
        return aw !== bw ? aw.localeCompare(bw) : (a.source_cue || 0) - (b.source_cue || 0);
    });
    const w2Atoms = atoms.filter(a => (a.witness || 'W1') === 'W2').sort((a, b) => {
        const aw = a.when_iso || a.when || 'ZZZZ';
        const bw = b.when_iso || b.when || 'ZZZZ';
        return aw !== bw ? aw.localeCompare(bw) : (a.source_cue || 0) - (b.source_cue || 0);
    });

    const w1Phases = groupIntoPhases(w1Atoms);
    const w2Phases = groupIntoPhases(w2Atoms);
    const convNodes = findConvergenceNodes();

    // Cross-witness edge count
    const cwEdges = fkg ? fkg.edges.filter(e => e.type === 'CROSS_WITNESS').length : 0;

    let html = '';

    // Search bar
    html += `<div class="flow-search-wrap"><span class="flow-search-icon">🔍</span><input type="text" class="flow-search" placeholder="Search atoms..." oninput="filterFlowCards(this.value)"></div>`;

    // Stats
    html += `<div class="flow-stats">
        <span style="color:#22c55e">● W1: ${w1Atoms.length}</span>
        <span style="color:#3b82f6">● W2: ${w2Atoms.length}</span>
        <span style="color:#a855f7">⚡ ${cwEdges} CW</span>
        <span style="color:var(--text-muted)">${atoms.length} atoms</span>
    </div>`;

    // Resolve witness names from FKG
    const getWitnessName = (ws) => {
        if (!fkg) return 'Witness';
        const p = fkg.nodes.find(n => n.type === 'PERSON' && n.sub_type === 'WITNESS' && n.witness_source === ws);
        return p ? (p.canonical_name || p.id).replace(/_/g, ' ') : 'Witness';
    };
    const w1Name = getWitnessName('W1');
    const w2Name = getWitnessName('W2');

    // Dual layout
    html += '<div class="flow-dual">';

    // W1 lane
    html += '<div class="flow-lane flow-lane-w1">';
    html += `<div class="flow-lane-header">W1 — ${escHtml(w1Name)}</div>`;
    for (let i = 0; i < w1Phases.length; i++) {
        html += renderPhaseCard(w1Phases[i], `w1-${i}`);
        if (i < w1Phases.length - 1) {
            html += '<div class="flow-connector">↓</div>';
        }
    }
    if (w1Phases.length === 0) html += '<div class="srt-no-data">No W1 atoms</div>';
    html += '</div>';

    // Center convergence column
    html += '<div class="flow-center">';
    html += '<div class="flow-lane-header" style="color:#a855f7; font-size:9px; border:1px solid #a855f733; background:#a855f70a;">⚡ CW</div>';
    if (convNodes.length > 0) {
        for (const node of convNodes) {
            const tier = node.corroboration_tier || 'UNCORROBORATED';
            const tb = TIER_BADGES[tier] || TIER_BADGES.UNCORROBORATED;
            const name = (node.canonical_name || node.id || '').replace(/_/g, ' ');
            html += `<div class="flow-conv" onclick="navigateToNode('${node.id}','','0','')">`;
            html += `<div class="flow-conv-name">${escHtml(name)}</div>`;
            html += `<div class="flow-conv-type">${node.type || ''}</div>`;
            html += `<div class="flow-conv-tier">${tb.icon}</div>`;
            html += `</div>`;
        }
    } else {
        html += '<div style="font-size:9px; color:var(--text-muted); text-align:center; margin-top:40px;">No shared<br>entities</div>';
    }
    html += '</div>';

    // W2 lane
    html += '<div class="flow-lane flow-lane-w2">';
    html += `<div class="flow-lane-header">W2 — ${escHtml(w2Name)}</div>`;
    for (let i = 0; i < w2Phases.length; i++) {
        html += renderPhaseCard(w2Phases[i], `w2-${i}`);
        if (i < w2Phases.length - 1) {
            html += '<div class="flow-connector">↓</div>';
        }
    }
    if (w2Phases.length === 0) html += '<div class="srt-no-data">No W2 atoms</div>';
    html += '</div>';

    html += '</div>'; // .flow-dual
    container.innerHTML = html;
    initFlowZoomPan();
}

// --- Flow Zoom & Pan ---
let _fzoom = 1, _fpanX = 0, _fpanY = 0;
function initFlowZoomPan() {
    const container = document.getElementById('flow-container');
    const dual = container.querySelector('.flow-dual');
    if (!dual) return;

    _fzoom = 1; _fpanX = 0; _fpanY = 0;
    dual.style.transformOrigin = '0 0';

    function applyFT() {
        dual.style.transform = `translate(${_fpanX}px,${_fpanY}px) scale(${_fzoom})`;
    }

    // Wheel zoom
    container.addEventListener('wheel', (e) => {
        // Don't hijack scroll when not zoomed
        if (_fzoom === 1 && e.deltaY > 0) return;
        if (_fzoom <= 0.35 && e.deltaY > 0) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(0.3, Math.min(3, _fzoom * delta));
        // Zoom toward cursor
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        _fpanX = mx - (mx - _fpanX) * (newZoom / _fzoom);
        _fpanY = my - (my - _fpanY) * (newZoom / _fzoom);
        _fzoom = newZoom;
        applyFT();
    }, { passive: false });

    // Drag pan
    let dragging = false, dragStart = null;
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.flow-phase, .flow-conv, .flow-atom, .flow-search, .flow-zoom-btn')) return;
        dragging = true;
        dragStart = { x: e.clientX - _fpanX, y: e.clientY - _fpanY };
        container.style.cursor = 'grabbing';
        e.preventDefault();
    });
    container.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        _fpanX = e.clientX - dragStart.x;
        _fpanY = e.clientY - dragStart.y;
        applyFT();
    });
    container.addEventListener('mouseup', () => { dragging = false; container.style.cursor = ''; });
    container.addEventListener('mouseleave', () => { dragging = false; container.style.cursor = ''; });

    // Add zoom controls
    const controls = document.createElement('div');
    controls.className = 'flow-zoom-controls';
    controls.innerHTML = `
        <button class="flow-zoom-btn" onclick="flowZoomIn()" title="Zoom In">+</button>
        <button class="flow-zoom-btn" onclick="flowZoomOut()" title="Zoom Out">−</button>
        <button class="flow-zoom-btn" onclick="flowZoomReset()" title="Reset">⟳</button>
    `;
    container.appendChild(controls);
}

function flowZoomIn() {
    _fzoom = Math.min(3, _fzoom * 1.2);
    const dual = document.querySelector('.flow-dual');
    if (dual) dual.style.transform = `translate(${_fpanX}px,${_fpanY}px) scale(${_fzoom})`;
}
function flowZoomOut() {
    _fzoom = Math.max(0.3, _fzoom * 0.8);
    const dual = document.querySelector('.flow-dual');
    if (dual) dual.style.transform = `translate(${_fpanX}px,${_fpanY}px) scale(${_fzoom})`;
}
function flowZoomReset() {
    _fzoom = 1; _fpanX = 0; _fpanY = 0;
    const dual = document.querySelector('.flow-dual');
    if (dual) dual.style.transform = '';
}

// Search filter for flow cards
function filterFlowCards(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.flow-phase');
    cards.forEach(card => {
        if (!q) { card.style.display = ''; return; }
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
    });
}

// --- Cross-witness atom detection (used by Timeline CW filter) ---
function isCrossWitnessAtom(atom) {
    if (!fkg) return false;
    const sharedNodes = new Set(fkg.nodes.filter(n => n.witness_source === 'SHARED').map(n => n.id));
    const refs = [atom.who_canonical, atom.to_whom_canonical, atom.where_canonical].filter(Boolean);
    return refs.some(r => sharedNodes.has(r));
}

function escHtml(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escSvg(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// --- Timeline — Data-Driven Cards ---
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!atoms || atoms.length === 0) {
        container.innerHTML = '<div class="srt-no-data">No atom data available for Timeline.</div>';
        return;
    }

    let filtered = atoms.filter(a => {
        const w = a.witness || 'W1';
        if (activeWitness === 'ALL') return true;
        if (activeWitness === 'CW') return isCrossWitnessAtom(a);
        return w === activeWitness;
    });

    filtered.sort((a, b) => {
        const aWhen = a.when_iso || a.when || 'ZZZZ';
        const bWhen = b.when_iso || b.when || 'ZZZZ';
        if (aWhen !== bWhen) return aWhen.localeCompare(bWhen);
        return (a.source_cue || 0) - (b.source_cue || 0);
    });

    function getEventType(atom) {
        const did = (atom.did_what || '').toLowerCase();
        const where = (atom.where || '').toLowerCase();
        if (did.includes('torture') || did.includes('beat') || did.includes('shabeh') || did.includes('crucif') || did.includes('hung') || did.includes('kill') || did.includes('lash') || did.includes('struck') || did.includes('hose')) return 'torture';
        if (did.includes('escape')) return 'escape';
        if (did.includes('court') || did.includes('judge') || did.includes('sentence') || did.includes('qisas') || did.includes('police') || did.includes('sharia')) return 'judicial';
        if (did.includes('arrest') || did.includes('detain') || did.includes('prison') || did.includes('cell') || did.includes('chain') || where.includes('prison') || where.includes('jail')) return 'detention';
        if (did.includes('raid') || did.includes('regime') || did.includes('air force') || did.includes('sednaya')) return 'regime';
        if (did.includes('confirm') || did.includes('visit') || did.includes('verified') || did.includes('corroborate')) return 'corroboration';
        if (did.includes('transfer') || did.includes('moved')) return 'transfer';
        return 'isis';
    }

    const colors = { regime:'#6366f1', isis:'#ef4444', torture:'#dc2626', escape:'#f97316', judicial:'#f59e0b', detention:'#3b82f6', corroboration:'#10b981', transfer:'#f97316' };
    const labels = { regime:'REGIME', isis:'ISIS', torture:'TORTURE', escape:'ESCAPE', judicial:'JUDICIAL', detention:'DETENTION', corroboration:'VERIFIED', transfer:'TRANSFER' };

    let html = '<div class="timeline-v2">';
    for (const a of filtered) {
        const evtType = getEventType(a);
        const color = colors[evtType] || '#64748b';
        const witness = a.witness || 'W1';
        const wColor = witness === 'W2' ? '#3b82f6' : '#22c55e';
        const wLabel = witness === 'W2' ? 'W2' : 'W1';
        const nodeId = a.who_canonical || a.where_canonical || '';
        const esc = (a.source_file || '').replace(/'/g, "\\'");
        const hasNode = nodeId && a.source_file;
        const what = escHtml((a.did_what || '').substring(0, 80) + ((a.did_what || '').length > 80 ? '…' : ''));
        const where = a.where || '';
        const when = a.when || a.when_iso || '';

        html += `<div class="tl2-card ${hasNode ? 'tl2-clickable' : ''}" ${hasNode ? `onclick="navigateToNode('${nodeId}','${esc}',${a.source_cue || 0},'${a.id}')"` : ''} style="border-left-color:${color}">
            <div class="tl2-spine-dot" style="background:${color}"></div>
            <div class="tl2-top">
                <span class="tl2-when">${escHtml(when)}</span>
                <span class="tl2-badge" style="background:${color}22;color:${color}">${labels[evtType] || 'EVENT'}</span>
                <span class="tl2-w" style="background:${wColor}">${wLabel}</span>
            </div>
            <div class="tl2-what">${what}</div>
            ${where ? `<div class="tl2-where">📍 ${escHtml(where)}</div>` : ''}
            ${hasNode ? `<div class="tl2-ref">${a.id} · #${a.source_cue || 0}</div>` : ''}
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// --- Filters ---
function initFilters() {
    const nt = [...new Set(fkg.nodes.map(n => n.type))].sort();
    const et = [...new Set(fkg.edges.map(e => e.type))].sort();
    const tiers = ['CONVERGENT', 'CORROBORATED', 'SUPPORTED', 'UNCORROBORATED'];
    activeNodeTypes = new Set(nt); activeEdgeTypes = new Set(et); activeTiers = new Set(tiers);
    buildCB('node-type-filters', nt, activeNodeTypes, NODE_COLORS);
    buildCB('corr-filters', tiers, activeTiers);
}

function buildCB(id, items, set, cm) {
    const c = document.getElementById(id); if (!c) return; c.innerHTML = '';
    for (const item of items) {
        const l = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = true; cb.dataset.type = item;
        cb.addEventListener('change', () => {
            cb.checked ? set.add(item) : set.delete(item);
            applyFilters();
        });
        l.appendChild(cb);
        if (cm && cm[item]) {
            const dot = document.createElement('span');
            dot.className = 'legend-dot';
            dot.style.background = cm[item];
            l.appendChild(dot);
        }
        l.appendChild(document.createTextNode(' ' + item));
        c.appendChild(l);
    }
}

function buildLegend() {
    const legend = document.getElementById('legend'); legend.innerHTML = '';

    const typeCounts = {};
    const subTypeCounts = {};
    for (const n of fkg.nodes) {
        if (n.type === 'PERSON' && n.sub_type) {
            subTypeCounts[n.sub_type] = (subTypeCounts[n.sub_type] || 0) + 1;
        } else {
            typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
        }
    }

    const subLabels = {
        WITNESS: 'Witness', PERPETRATOR: 'Perpetrator',
        CO_DETAINEE: 'Co-detainee', VICTIM: 'Victim', BYSTANDER: 'Bystander'
    };
    const typeLabels = {
        FACILITY: 'Facility', ZONE: 'Zone', EVENT: 'Event',
        METHOD: 'Method', ORGANIZATION: 'Organization', ROLE: 'Role',
        DOCUMENT: 'Document', TIMEFRAME: 'Timeframe',
        SENSORY: 'Sensory', SOURCE: 'Source'
    };

    // Node legend — sub-types first, then types
    for (const [st, count] of Object.entries(subTypeCounts)) {
        const d = document.createElement('div'); d.className = 'legend-item';
        const color = SUB_TYPE_COLORS[st] || '#64748b';
        d.innerHTML = `<span class="legend-dot" style="background:${color}"></span>${subLabels[st] || st} (${count})`;
        legend.appendChild(d);
    }
    for (const [t, count] of Object.entries(typeCounts)) {
        const d = document.createElement('div'); d.className = 'legend-item';
        const color = NODE_COLORS[t] || '#64748b';
        d.innerHTML = `<span class="legend-dot" style="background:${color}"></span>${typeLabels[t] || t} (${count})`;
        legend.appendChild(d);
    }

    // Edge legend — grouped by legal weight (§4.2)
    const edgeWeightGroups = [
        { label: 'Critical', types: ['PERPETRATED','ORDERED','COMMANDED'], style: 'border-bottom:2px solid #ef4444' },
        { label: 'High', types: ['WITNESSED','DETAINED_AT','OCCURRED_AT','OCCURRED_IN'], style: 'border-bottom:2px solid #f59e0b' },
        { label: 'Medium', types: ['USED_METHOD','CO_DETAINED','HOLDS_ROLE','MEMBER_OF','LOCATED_IN','TRANSFERRED_TO','TEMPORAL','SENSORY_AT'], style: 'border-bottom:2px solid #3b82f6' },
        { label: 'Cross-regime', types: ['CROSS_REGIME_TRANSFER','CROSS_WITNESS'], style: 'border-bottom:2px dashed #a855f7' },
        { label: 'Verification', types: ['CORROBORATES'], style: 'border-bottom:2px dotted #10b981' },
    ];
    const edgeSep = document.createElement('div');
    edgeSep.style.cssText = 'font-size:9px;color:#64748b;margin-top:6px;text-transform:uppercase;letter-spacing:1px;font-weight:600';
    edgeSep.textContent = 'Edges';
    legend.appendChild(edgeSep);

    for (const group of edgeWeightGroups) {
        const edgeTypesPresent = group.types.filter(t => fkg.edges.some(e => e.type === t));
        if (edgeTypesPresent.length === 0) continue;
        const d = document.createElement('div'); d.className = 'legend-item';
        d.innerHTML = `<span style="${group.style};width:10px;display:inline-block"></span> ${group.label}`;
        legend.appendChild(d);
    }

    // Human gate indicator
    const note = document.createElement('div'); note.className = 'legend-item';
    note.innerHTML = '<span style="border-bottom:2px dashed #ef4444;width:10px;display:inline-block"></span> Human gate';
    legend.appendChild(note);
}

// --- P5.1: Layout Persistence (localStorage) ---
const LAYOUT_KEY = 'argus_layout_v1';

function saveLayout() {
    if (!cy) return;
    const positions = {};
    cy.nodes().forEach(n => {
        const pos = n.position();
        positions[n.id()] = { x: Math.round(pos.x), y: Math.round(pos.y) };
    });
    const payload = {
        timestamp: new Date().toISOString(),
        nodeCount: Object.keys(positions).length,
        positions
    };
    try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(payload));
        const btn = document.querySelector('[onclick="saveLayout()"]');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<span class="nav-icon">✅</span><span class="nav-label">Saved!</span>';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
    } catch (e) {
        console.error('Layout save failed:', e);
    }
}

function restoreLayout() {
    if (!cy) return false;
    try {
        const raw = localStorage.getItem(LAYOUT_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.positions) return false;

        // Invalidate stale layout: if saved node count differs from current graph
        const currentNodeCount = cy.nodes().length;
        const savedNodeCount = data.nodeCount || 0;
        if (savedNodeCount !== currentNodeCount) {
            console.warn('Layout invalidated: saved ' + savedNodeCount + ' nodes vs current ' + currentNodeCount + ' — clearing stale data');
            localStorage.removeItem(LAYOUT_KEY);
            return false;
        }

        // Also verify ALL current nodes have saved positions
        const missingPos = cy.nodes().filter(n => !data.positions[n.id()]);
        if (missingPos.length > 0) {
            console.warn('Layout invalidated: ' + missingPos.length + ' nodes missing positions — clearing stale data');
            localStorage.removeItem(LAYOUT_KEY);
            return false;
        }

        cy.layout({
            name: 'preset',
            positions: node => data.positions[node.id()],
            fit: true,
            padding: 30,
            animate: true,
            animationDuration: 500,
        }).run();
        return true;
    } catch (e) {
        console.warn('Layout restore failed:', e);
        return false;
    }
}

function clearSavedLayout() {
    localStorage.removeItem(LAYOUT_KEY);
}

// --- P5.2: Temporal Layout Mode ---
function toggleTemporalLayout() {
    if (!cy || !fkg) return;
    temporalMode = !temporalMode;

    if (!temporalMode) {
        // Switch back to force-directed
        cy.layout({
            name: 'cose-bilkent',
            animate: true,
            animationDuration: 800,
            randomize: false,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 120,
            nodeRepulsion: 8000,
            edgeElasticity: 0.45,
            gravity: 0.25,
            numIter: 2500,
            fit: true,
            padding: 30,
        }).run();
        return;
    }

    // Collect all dates from nodes and atoms
    const dateMap = {}; // nodeId -> ISO date
    for (const node of fkg.nodes) {
        // Check if node has temporal data
        if (node.type === 'TIMEFRAME' && node.canonical_name) {
            dateMap[node.id] = node.canonical_name;
        }
    }
    // Map atoms' dates to their referenced nodes
    if (atoms) {
        for (const a of atoms) {
            const d = a.when_iso || a.when || '';
            if (!d) continue;
            for (const ref of [a.who_canonical, a.to_whom_canonical, a.where_canonical].filter(Boolean)) {
                if (!dateMap[ref]) dateMap[ref] = d;
            }
        }
    }
    // Map connected nodes via edges to their earliest date
    for (const edge of fkg.edges) {
        if (dateMap[edge.from_node] && !dateMap[edge.to_node]) dateMap[edge.to_node] = dateMap[edge.from_node];
        if (dateMap[edge.to_node] && !dateMap[edge.from_node]) dateMap[edge.from_node] = dateMap[edge.to_node];
    }

    // Get all unique dates, sorted
    const allDates = [...new Set(Object.values(dateMap))].sort();
    const dateIndex = {};
    allDates.forEach((d, i) => { dateIndex[d] = i; });
    const totalDates = allDates.length || 1;

    // Witness Y-bands (spread further apart)
    const witBand = { W1: 0.25, W2: 0.75, SHARED: 0.5 };

    // Type-based Y offset within witness band to separate by category
    const typeYOffset = {
        PERSON: -80, FACILITY: -50, ZONE: -30, EVENT: 0,
        METHOD: 30, ORGANIZATION: 50, ROLE: 60,
        DOCUMENT: 70, TIMEFRAME: -60, SENSORY: 80, SOURCE: 90,
    };

    const graphW = Math.max(2400, totalDates * 200);
    const graphH = 1200;

    const positions = {};
    const noDateNodes = [];

    // Track occupied cells to avoid overlap: key = "dateIdx_witBand" -> count
    const cellOccupancy = {};

    cy.nodes().forEach(node => {
        const nid = node.id();
        const d = dateMap[nid];
        const ws = node.data('witness_source') || 'W1';
        const yBand = witBand[ws] || 0.5;
        const nodeType = node.data('nodeData')?.type || 'EVENT';

        if (d && dateIndex[d] !== undefined) {
            const xPct = (dateIndex[d] + 0.5) / totalDates;
            const baseX = xPct * graphW;
            const baseY = yBand * graphH + (typeYOffset[nodeType] || 0);

            // Collision avoidance: offset nodes sharing same date+band
            const cellKey = dateIndex[d] + '_' + ws;
            const count = cellOccupancy[cellKey] || 0;
            cellOccupancy[cellKey] = count + 1;

            // Spread colliding nodes in a spiral pattern
            const angle = count * 0.8;
            const radius = count * 18;
            positions[nid] = {
                x: baseX + Math.cos(angle) * radius,
                y: baseY + Math.sin(angle) * radius,
            };
        } else {
            noDateNodes.push(nid);
        }
    });

    // Stack undated nodes at the right margin with more spacing
    noDateNodes.forEach((nid, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        positions[nid] = {
            x: graphW + 80 + col * 80,
            y: 60 + row * 70,
        };
    });

    cy.layout({
        name: 'preset',
        positions: node => positions[node.id()] || { x: graphW + 100, y: 300 },
        fit: true,
        padding: 50,
        animate: true,
        animationDuration: 600,
    }).run();
}

function updateStats() {
    document.getElementById('stat-nodes').textContent = fkg.nodes.length;
    document.getElementById('stat-edges').textContent = fkg.edges.length;
    document.getElementById('stat-gated').textContent = fkg.edges.filter(e => e.requires_human_gate).length;
}

// --- Init ---
loadFKG();
