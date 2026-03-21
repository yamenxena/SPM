/**
 * Argus FKG Viewer v3 — All fixes: zoom-to-node, filters, mermaid rendering, SRT source locator
 */

const NODE_COLORS = {
    PERSON: '#ef4444', FACILITY: '#3b82f6', ZONE: '#6366f1',
    EVENT: '#f59e0b', METHOD: '#ec4899', ORGANIZATION: '#8b5cf6',
    ROLE: '#06b6d4', DOCUMENT: '#84cc16', TIMEFRAME: '#64748b',
    SENSORY: '#14b8a6', SOURCE: '#a3e635',
};
const NODE_SIZES = { CONVERGENT: 20, CORROBORATED: 15, SUPPORTED: 11, UNCORROBORATED: 8 };
const EDGE_COLORS = {
    PERPETRATED: '#ef4444', ORDERED: '#ef4444', COMMANDED: '#ef4444',
    CROSS_REGIME_TRANSFER: '#f97316', WITNESSED: '#f59e0b',
    DETAINED_AT: '#3b82f6', OCCURRED_AT: '#3b82f6', OCCURRED_IN: '#6366f1',
    USED_METHOD: '#ec4899', CO_DETAINED: '#06b6d4', HOLDS_ROLE: '#8b5cf6',
    MEMBER_OF: '#8b5cf6', CORROBORATES: '#10b981', TRANSFERRED_TO: '#f59e0b',
    TEMPORAL: '#64748b', SENSORY_AT: '#14b8a6',
    CROSS_WITNESS: '#a855f7',
};

// SRT base path relative to web root
const SRT_BASE = '../docs/output/Zain Hajahjah/سجن الرميلة/SRT-En/طلال الشويمي/';

let fkg = null, atoms = [];
let nodes = [], edges = [];
let canvas, ctx;
let offsetX = 0, offsetY = 0, scale = 1;
let dragging = false, dragNode = null, panStart = null;
let hoveredNode = null, selectedNode = null;
let activeNodeTypes = new Set(), activeEdgeTypes = new Set(), activeTiers = new Set();
let currentView = 'graph';
let srtCache = {};

// --- Load ---
async function loadFKG() {
    try {
        const [fkgRes, atomsRes] = await Promise.all([
            fetch('fkg.json'), fetch('atoms.json').catch(() => null)
        ]);
        fkg = await fkgRes.json();
        if (atomsRes && atomsRes.ok) atoms = await atomsRes.json();

        nodes = fkg.nodes.map((n, i) => ({
            ...n, x: 500 + Math.cos(i * 0.4) * 250 + (Math.random() - 0.5) * 120,
            y: 350 + Math.sin(i * 0.4) * 250 + (Math.random() - 0.5) * 120,
            vx: 0, vy: 0,
            radius: NODE_SIZES[n.corroboration_tier] || 8,
            color: NODE_COLORS[n.type] || '#64748b',
        }));
        edges = fkg.edges.map(e => ({ ...e, color: EDGE_COLORS[e.type] || '#334155' }));

        initFilters();
        updateStats();
        buildLegend();
        simulate();
    } catch (err) { console.error('Load failed:', err); }
}

// --- Canvas ---
function initCanvas() {
    canvas = document.getElementById('graph-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
}

// --- Force ---
function simulate() {
    for (let i = 0; i < 350; i++) applyForces();
    render();
    requestAnimationFrame(animLoop);
}
function applyForces() {
    const rep = 2500, att = 0.004, damp = 0.85;
    const dpr = window.devicePixelRatio || 1;
    const cx = canvas.width / (2 * dpr), cy = canvas.height / (2 * dpr);
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const f = rep / (d * d);
            nodes[i].vx -= (dx / d) * f; nodes[i].vy -= (dy / d) * f;
            nodes[j].vx += (dx / d) * f; nodes[j].vy += (dy / d) * f;
        }
    }
    const nm = {}; nodes.forEach(n => nm[n.id] = n);
    for (const e of edges) {
        const a = nm[e.from_node], b = nm[e.to_node];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = d * att;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    for (const n of nodes) {
        n.vx += (cx - n.x) * 0.0004; n.vy += (cy - n.y) * 0.0004;
        n.vx *= damp; n.vy *= damp;
        if (n !== dragNode) { n.x += n.vx; n.y += n.vy; }
    }
}
function animLoop() { applyForces(); render(); requestAnimationFrame(animLoop); }

// --- Visibility ---
function isVisible(n) {
    return activeNodeTypes.has(n.type) && activeTiers.has(n.corroboration_tier || 'UNCORROBORATED');
}
function isEdgeVisible(e) {
    if (!activeEdgeTypes.has(e.type)) return false;
    const nm = {}; nodes.forEach(n => nm[n.id] = n);
    const a = nm[e.from_node], b = nm[e.to_node];
    return a && b && isVisible(a) && isVisible(b);
}

// --- Render ---
function render() {
    if (currentView !== 'graph') return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    const nm = {}; nodes.forEach(n => nm[n.id] = n);

    for (const e of edges) {
        if (!isEdgeVisible(e)) continue;
        const a = nm[e.from_node], b = nm[e.to_node];
        if (!a || !b) continue;
        const hl = selectedNode && (e.from_node === selectedNode.id || e.to_node === selectedNode.id);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = hl ? e.color : (e.color + '40');
        ctx.lineWidth = hl ? 2.5 : (e.requires_human_gate ? 1.5 : 0.8);
        ctx.setLineDash(e.requires_human_gate ? [5, 3] : []);
        ctx.stroke(); ctx.setLineDash([]);
        if (hl || scale > 0.8) {
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            ctx.font = '7px Inter'; ctx.fillStyle = hl ? e.color : (e.color + '70');
            ctx.textAlign = 'center'; ctx.fillText(e.type, mx, my - 3);
        }
    }

    for (const n of nodes) {
        if (!isVisible(n)) continue;
        const isSel = n === selectedNode, isHov = n === hoveredNode;
        const conn = selectedNode && edges.some(
            e => isEdgeVisible(e) && (e.from_node === selectedNode.id || e.to_node === selectedNode.id) &&
                 (e.from_node === n.id || e.to_node === n.id)
        );
        const dim = selectedNode && !isSel && !conn;
        const r = isSel ? n.radius * 1.5 : (isHov ? n.radius * 1.2 : n.radius);

        if (n.corroboration_tier === 'CONVERGENT' || n.corroboration_tier === 'CORROBORATED' || isSel) {
            ctx.beginPath(); ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2);
            ctx.fillStyle = isSel ? 'rgba(255,255,255,0.12)' : (n.color + '15'); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = dim ? (n.color + '30') : n.color; ctx.fill();
        if (isSel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
        else if (isHov) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.strokeStyle = dim ? (n.color + '20') : (n.color + '60'); ctx.lineWidth = 1; ctx.stroke(); }

        const label = (n.canonical_name || n.id).replace(/_/g, ' ');
        const short = label.length > 22 ? label.substring(0, 20) + '…' : label;
        ctx.font = `${r > 13 ? '11' : r > 10 ? '10' : '9'}px Inter`;
        ctx.fillStyle = dim ? '#475569' : '#e2e8f0';
        ctx.textAlign = 'center'; ctx.fillText(short, n.x, n.y + r + 13);
    }
    ctx.restore();
}

// --- Zoom to node (animated) ---
function zoomToNode(node) {
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / (2 * dpr), ch = canvas.height / (2 * dpr);
    const targetScale = 1.2;
    const targetOX = cw - node.x * targetScale;
    const targetOY = ch - node.y * targetScale;
    const startOX = offsetX, startOY = offsetY, startScale = scale;
    const duration = 400;
    const start = performance.now();
    function step(t) {
        const p = Math.min((t - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
        offsetX = startOX + (targetOX - startOX) * ease;
        offsetY = startOY + (targetOY - startOY) * ease;
        scale = startScale + (targetScale - startScale) * ease;
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// --- Interaction ---
function getNodeAt(mx, my) {
    const x = (mx - offsetX) / scale, y = (my - offsetY) / scale;
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (!isVisible(n)) continue;
        const dx = x - n.x, dy = y - n.y;
        if (dx * dx + dy * dy < (n.radius + 6) * (n.radius + 6)) return n;
    }
    return null;
}
function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const node = getNodeAt(mx, my);
    if (node) {
        dragNode = node; selectedNode = node;
        showInspector(node);
        zoomToNode(node);
    } else {
        panStart = { x: e.clientX - offsetX, y: e.clientY - offsetY };
        selectedNode = null;
        document.getElementById('inspector').classList.add('hidden');
    }
    dragging = true;
}
function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragNode) {
        dragNode.x = (mx - offsetX) / scale; dragNode.y = (my - offsetY) / scale;
        dragNode.vx = 0; dragNode.vy = 0;
    } else if (dragging && panStart) {
        offsetX = e.clientX - panStart.x; offsetY = e.clientY - panStart.y;
    }
    const hov = getNodeAt(mx, my);
    hoveredNode = hov;
    const tt = document.getElementById('tooltip');
    if (hov) {
        canvas.style.cursor = 'pointer';
        const tier = hov.corroboration_tier || 'UNCORROBORATED';
        tt.innerHTML = `<div class="tt-label">${(hov.canonical_name || hov.id).replace(/_/g, ' ')}</div>
            <div class="tt-type">${hov.type}</div>
            <div class="tt-score">Score: ${hov.corroboration_score || 0} · <span class="tier-badge tier-${tier}">${tier}</span></div>`;
        tt.style.left = (mx + 16) + 'px'; tt.style.top = (my + 16) + 'px';
        tt.classList.remove('hidden');
    } else {
        canvas.style.cursor = dragging ? 'grabbing' : 'grab';
        tt.classList.add('hidden');
    }
}
function onMouseUp() { dragging = false; dragNode = null; panStart = null; }
function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const z = e.deltaY < 0 ? 1.1 : 0.9;
    const ns = Math.min(Math.max(scale * z, 0.1), 5);
    offsetX = mx - (mx - offsetX) * (ns / scale);
    offsetY = my - (my - offsetY) * (ns / scale);
    scale = ns;
}

// --- Inspector ---
function showInspector(node) {
    const panel = document.getElementById('inspector');
    const title = document.getElementById('inspector-title');
    const content = document.getElementById('inspector-content');
    title.textContent = (node.canonical_name || node.id).replace(/_/g, ' ');
    panel.classList.remove('hidden');

    const tier = node.corroboration_tier || 'UNCORROBORATED';
    const conn = edges.filter(e => e.from_node === node.id || e.to_node === node.id);

    let html = `<h4>Properties</h4>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${node.type}</span></div>
        <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value" style="font-size:10px">${node.id}</span></div>
        <div class="detail-row"><span class="detail-label">Score</span><span class="detail-value">${node.corroboration_score || 0}</span></div>
        <div class="detail-row"><span class="detail-label">Tier</span><span class="tier-badge tier-${tier}">${tier}</span></div>`;

    // Source locator
    const rel = atoms.filter(a =>
        a.who_canonical === node.id || a.to_whom_canonical === node.id || a.where_canonical === node.id
    );
    if (rel.length > 0) {
        html += `<h4>📍 Source Locator (${rel.length})</h4><div class="source-list">`;
        for (const a of rel.slice(0, 10)) {
            const esc = a.source_file.replace(/'/g, "\\'");
            html += `<div class="source-item" onclick="openSourcePanel('${esc}', ${a.source_cue}, '${a.id}')">
                <div class="source-file">${a.source_file}</div>
                <div class="source-cue">Cue #${a.source_cue} · ${a.id}</div>
                <div class="source-action">${a.did_what.substring(0, 80)}${a.did_what.length > 80 ? '…' : ''}</div>
            </div>`;
        }
        html += `</div>`;
    }

    if (conn.length > 0) {
        html += `<h4>Connected Edges (${conn.length})</h4><ul class="edge-list">`;
        for (const e of conn) {
            const cls = e.requires_human_gate ? 'critical' : (e.type.includes('PERPETRATED') ? 'critical' : 'medium');
            const other = e.from_node === node.id ? e.to_node : e.from_node;
            const gated = e.requires_human_gate ? ' ⚠️' : '';
            html += `<li><span class="edge-tag ${cls}">${e.type}</span>${other.replace(/_/g, ' ')}${gated}</li>`;
        }
        html += `</ul>`;
    }
    content.innerHTML = html;
}

document.getElementById('inspector-close').addEventListener('click', () => {
    document.getElementById('inspector').classList.add('hidden');
    selectedNode = null;
});

// --- Source Panel: Load real SRT and highlight cue ---
async function loadSRT(filename) {
    if (srtCache[filename]) return srtCache[filename];
    // Determine path: داخلي or خارجي
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

async function openSourcePanel(filename, cueNum, atomId) {
    const atom = atoms.find(a => a.id === atomId);
    const panel = document.getElementById('source-panel');
    const panelContent = document.getElementById('source-panel-content');

    // Header
    let html = `<div class="sp-header">
        <h3>📍 ${filename}</h3>
        <button onclick="document.getElementById('source-panel').classList.add('hidden')" class="btn-close">✕</button>
    </div>`;

    // Atom breakdown
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

    // Load actual SRT
    html += `<div class="sp-srt-header">Source Transcript — scrolled to cue #${cueNum}</div>`;
    html += `<div class="sp-srt-body" id="srt-scroll-area">`;

    const cues = await loadSRT(filename);
    if (cues && cues.length > 0) {
        for (const c of cues) {
            const isTarget = c.num === cueNum;
            const nearTarget = Math.abs(c.num - cueNum) <= 2;
            html += `<div class="srt-cue ${isTarget ? 'srt-target' : ''} ${nearTarget && !isTarget ? 'srt-near' : ''}" id="srt-cue-${c.num}">
                <span class="srt-num">${c.num}</span>
                <span class="srt-time">${c.time}</span>
                <span class="srt-text">${c.text}</span>
            </div>`;
        }
    } else {
        html += `<div class="srt-no-data">⚠️ SRT file not accessible from browser.<br>
            <code>${filename}</code><br>
            To enable: serve the corpus from the web directory or configure CORS.</div>`;
    }
    html += `</div>`;

    panelContent.innerHTML = html;
    panel.classList.remove('hidden');

    // Auto-scroll to target cue
    requestAnimationFrame(() => {
        const target = document.getElementById(`srt-cue-${cueNum}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

// --- Panel System (split-panel, not view switch) ---
let activePanel = null; // 'flow' | 'timeline' | null
let flowZoom = 1, flowPanX = 0, flowPanY = 0, flowDragging = false, flowDragStart = null;

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    requestAnimationFrame(() => resizeCanvas());
}

function togglePanel(type) {
    const panel = document.getElementById('panel-right');
    const flowC = document.getElementById('flow-container');
    const tlC = document.getElementById('timeline-container');

    if (type === null || activePanel === type) {
        // Close panel
        panel.classList.add('hidden');
        panel.classList.remove('maximized');
        document.getElementById('btn-flow').classList.remove('active');
        document.getElementById('btn-timeline').classList.remove('active');
        activePanel = null;
    } else {
        // Open panel with requested view
        activePanel = type;
        panel.classList.remove('hidden');
        document.getElementById('btn-flow').classList.toggle('active', type === 'flow');
        document.getElementById('btn-timeline').classList.toggle('active', type === 'timeline');
        flowC.style.display = type === 'flow' ? 'block' : 'none';
        tlC.style.display = type === 'timeline' ? 'block' : 'none';
        document.getElementById('panel-title').textContent = type === 'flow' ? '◈ Evidence Flow' : '⟹ Timeline';
        if (type === 'flow') renderEvidenceFlow();
        if (type === 'timeline') renderTimeline();
    }
    requestAnimationFrame(() => resizeCanvas());
}

function maximizePanel() {
    const panel = document.getElementById('panel-right');
    panel.classList.toggle('maximized');
    requestAnimationFrame(() => resizeCanvas());
}

// Keep switchView as alias for backward compat (used nowhere now, but safe)
function switchView(view) { togglePanel(view === 'graph' ? null : view); }

// Navigate: zoom to node in graph, open inspector + source, keep panel open
function navigateToNode(nodeId, sourceFile, sourceCue, atomId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    selectedNode = node;
    showInspector(node);
    zoomToNode(node);
    if (sourceFile && sourceCue) {
        setTimeout(() => openSourcePanel(sourceFile, sourceCue, atomId), 600);
    }
}

// --- SVG Zoom & Pan for Evidence Flow ---
function initFlowZoomPan() {
    const container = document.getElementById('flow-container');
    const svg = container.querySelector('.flow-svg');
    if (!svg) return;

    function applyTransform() {
        svg.style.transform = `translate(${flowPanX}px,${flowPanY}px) scale(${flowZoom})`;
    }

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        flowZoom = Math.max(0.3, Math.min(3, flowZoom * delta));
        applyTransform();
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.flow-node')) return; // don't drag when clicking node
        flowDragging = true;
        flowDragStart = { x: e.clientX - flowPanX, y: e.clientY - flowPanY };
        container.style.cursor = 'grabbing';
    });
    container.addEventListener('mousemove', (e) => {
        if (!flowDragging) return;
        flowPanX = e.clientX - flowDragStart.x;
        flowPanY = e.clientY - flowDragStart.y;
        applyTransform();
    });
    container.addEventListener('mouseup', () => { flowDragging = false; container.style.cursor = 'grab'; });
    container.addEventListener('mouseleave', () => { flowDragging = false; container.style.cursor = 'grab'; });

    // Touch support
    let touchStart = null;
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStart = { x: e.touches[0].clientX - flowPanX, y: e.touches[0].clientY - flowPanY };
        }
    }, { passive: true });
    container.addEventListener('touchmove', (e) => {
        if (touchStart && e.touches.length === 1) {
            flowPanX = e.touches[0].clientX - touchStart.x;
            flowPanY = e.touches[0].clientY - touchStart.y;
            applyTransform();
        }
    }, { passive: true });
    container.addEventListener('touchend', () => { touchStart = null; });
}

function flowZoomIn() { flowZoom = Math.min(3, flowZoom * 1.2); applyFlowTransform(); }
function flowZoomOut() { flowZoom = Math.max(0.3, flowZoom * 0.8); applyFlowTransform(); }
function flowZoomReset() { flowZoom = 1; flowPanX = 0; flowPanY = 0; applyFlowTransform(); }
function applyFlowTransform() {
    const svg = document.querySelector('.flow-svg');
    if (svg) svg.style.transform = `translate(${flowPanX}px,${flowPanY}px) scale(${flowZoom})`;
}

// --- Evidence Flow — SVG Canvas Graph (Obsidian style) ---
function renderEvidenceFlow() {
    const container = document.getElementById('flow-container');
    // Validated cues from atoms.json
    const N = [
        { id:'n1', x:250, y:30, w:160, h:40, label:'Sednaya Prison', sub:'Brother 6 yrs · Assad', color:'#6366f1', node:'Abdul_Rahim_Shuweimi', atom:'ATOM_003', file:'01_تعريف-ملخص القصة_En.srt', cue:20 },
        { id:'n2', x:250, y:100, w:160, h:40, label:'Air Force Intel Raid', sub:'2012 · dismissed · "terrorist"', color:'#6366f1', node:'AIR_FORCE_INTELLIGENCE', atom:'ATOM_002', file:'01_تعريف-ملخص القصة_En.srt', cue:9 },
        { id:'n3', x:250, y:170, w:160, h:40, label:'Point 11 — 1st Arrest', sub:'1 week · charge: shabiha', color:'#ef4444', node:'POINT_11_GOVERNORS_PALACE', atom:'ATOM_004', file:'01_تعريف-ملخص القصة_En.srt', cue:28 },
        { id:'n4', x:250, y:240, w:180, h:40, label:'Military Judiciary 53d', sub:'Abu Yousuf · Abu Suhaib', color:'#ef4444', node:'MILITARY_JUDICIARY_BUILDING_RAQQA', atom:'ATOM_005', file:'01_تعريف-ملخص القصة_En.srt', cue:33 },
        { id:'n5', x:80, y:310, w:160, h:40, label:'Abu Hudhayfa Assault', sub:'CROSS-REGIME · ex-Sednaya', color:'#f97316', node:'Abu_Hudhayfa_Shahada', atom:'ATOM_008', file:'01_تعريف-ملخص القصة_En.srt', cue:84 },
        { id:'n6', x:420, y:310, w:160, h:40, label:'Hisba — Panorama', sub:'4 days · cigarettes', color:'#ef4444', node:'PANORAMA_HISBA_BASE', atom:'ATOM_010', file:'01_تعريف-ملخص القصة_En.srt', cue:116 },
        { id:'n7', x:250, y:380, w:180, h:46, label:'Abu Seif Maqs Torture', sub:'3d beating + 18d shabeh · ribs', color:'#dc2626', node:'Abu_Seif_Maqs', atom:'ATOM_012', file:'01_تعريف-ملخص القصة_En.srt', cue:143 },
        { id:'n8', x:250, y:456, w:180, h:46, label:'Lakhdar Brahimi Killing', sub:'🔊 hose · blindfolded · death', color:'#dc2626', node:'EVT_LAKHDAR_BRAHIMI_KILLING', atom:'ATOM_026', file:'04_التحقيق_En.srt', cue:73 },
        { id:'n9', x:80, y:532, w:160, h:40, label:'Escape Attempt', sub:'Wall dug · 7m drop · recaptured', color:'#f97316', node:'EVT_ESCAPE_ATTEMPT', atom:'ATOM_028', file:'07_محاولة الهروب من السجن_En.srt', cue:5 },
        { id:'n10', x:420, y:532, w:160, h:40, label:'Crucifixion', sub:'Escape punishment · 🔗 al-Burj', color:'#dc2626', node:'CRUCIFIXION', atom:'ATOM_032', file:'07_محاولة الهروب من السجن_En.srt', cue:73 },
        { id:'n11', x:250, y:602, w:180, h:40, label:'Sharia Court — Qisas', sub:'10 charges · judge hits head', color:'#f59e0b', node:'EVT_QISAS_SENTENCING', atom:'ATOM_020', file:'08_العملية القضائية-_En.srt', cue:54 },
        { id:'n12', x:250, y:672, w:180, h:40, label:'Judicial Police Vehicle', sub:'🔊 swords · Ibrahim choking', color:'#f59e0b', node:'EVT_JUDICIAL_POLICE_TRANSFER', atom:'ATOM_034', file:'09_الشرطة القضائية_En.srt', cue:3 },
        { id:'n13', x:250, y:742, w:180, h:40, label:'Jazira Junction Chained', sub:'3.5mo · 26 links · 7 padlocks', color:'#3b82f6', node:'JAZIRA_JUNCTION_PRISON', atom:'ATOM_037', file:'10_وصف سجن مفرق الجزرة_En.srt', cue:5 },
        { id:'n14', x:250, y:812, w:180, h:40, label:'✅ Site Visit Confirmed', sub:'Iron bars · positions · escape', color:'#10b981', node:'SITE_VISIT_PRISON_ROOM', atom:'ATOM_040', file:'خارجي/01_prison room_En.srt', cue:1 },
    ];
    // Edges: [fromIdx, toIdx]
    const E = [[0,1],[1,2],[2,3],[3,4],[3,5],[4,6],[5,6],[6,7],[7,8],[7,9],[8,10],[9,10],[10,11],[11,12],[12,13]];

    const svgW = 620, svgH = 880;
    let svg = `<svg class="flow-svg" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<defs><marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#475569"/></marker></defs>';

    // Draw edges as bezier curves
    for (const [fi, ti] of E) {
        const f = N[fi], t = N[ti];
        const fx = f.x + f.w/2, fy = f.y + f.h;
        const tx = t.x + t.w/2, ty = t.y;
        const my = (fy + ty) / 2;
        svg += `<path d="M${fx},${fy} C${fx},${my} ${tx},${my} ${tx},${ty}" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#ah)" opacity="0.6"/>`;
    }

    // Draw nodes
    for (const n of N) {
        const esc = (n.file||'').replace(/'/g,"\\'");
        svg += `<g class="flow-node" onclick="navigateToNode('${n.node}','${esc}',${n.cue},'${n.atom}')" style="cursor:pointer">`;
        svg += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6" fill="#0f172a" stroke="${n.color}" stroke-width="2"/>`;
        svg += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6" fill="${n.color}" opacity="0.12"/>`;
        svg += `<text x="${n.x+n.w/2}" y="${n.y+15}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="600" font-family="Inter,sans-serif">${n.label}</text>`;
        svg += `<text x="${n.x+n.w/2}" y="${n.y+30}" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="Inter,sans-serif">${n.sub}</text>`;
        if (n.h > 42) svg += `<text x="${n.x+n.w/2}" y="${n.y+42}" text-anchor="middle" fill="#64748b" font-size="7" font-family="JetBrains Mono,monospace">${n.atom}·#${n.cue}</text>`;
        svg += '</g>';
    }
    svg += '</svg>';
    container.innerHTML = svg + '<div class="flow-zoom-controls">' +
        '<button class="flow-zoom-btn" onclick="event.stopPropagation();flowZoomOut()" title="Zoom Out">−</button>' +
        '<button class="flow-zoom-btn" onclick="event.stopPropagation();flowZoomReset()" title="Reset">⊙</button>' +
        '<button class="flow-zoom-btn" onclick="event.stopPropagation();flowZoomIn()" title="Zoom In">+</button>' +
        '</div>';
    flowZoom = 1; flowPanX = 0; flowPanY = 0;
    initFlowZoomPan();
}

// --- Interactive Timeline (fixed layout) ---
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    const events = [
        { when: '2006–2012', what: "Brother Abdul Rahim — 6 yrs Sednaya", type: 'regime', node: 'Abdul_Rahim_Shuweimi', atom: 'ATOM_003', file: '01_تعريف-ملخص القصة_En.srt', cue: 20, detail: 'Assad regime. Abu Hudhayfa also in Sednaya.' },
        { when: '2012', what: 'Air Force Intel raids home', type: 'regime', node: 'AIR_FORCE_INTELLIGENCE', atom: 'ATOM_002', file: '01_تعريف-ملخص القصة_En.srt', cue: 9, detail: 'Dismissed, labeled terrorist.' },
        { when: '~2013', what: 'FSA → ISIS takes Raqqa', type: 'transition', detail: 'Power transition.' },
        { when: '2014 Q1', what: 'Point 11 — 1st arrest', type: 'isis', node: 'POINT_11_GOVERNORS_PALACE', atom: 'ATOM_004', file: '01_تعريف-ملخص القصة_En.srt', cue: 28, detail: 'Gov Palace. 1 week. Charge: shabiha.' },
        { when: '2014 Q1', what: 'Military Judiciary — 53 days', type: 'isis', node: 'MILITARY_JUDICIARY_BUILDING_RAQQA', atom: 'ATOM_005', file: '01_تعريف-ملخص القصة_En.srt', cue: 33 },
        { when: '2014', what: 'Abu Hudhayfa assault', type: 'crossregime', node: 'Abu_Hudhayfa_Shahada', atom: 'ATOM_008', file: '01_تعريف-ملخص القصة_En.srt', cue: 84, detail: 'CROSS-REGIME: ex-Sednaya → ISIS emir.' },
        { when: '2014', what: 'Hisba Panorama — 4 days', type: 'isis', node: 'PANORAMA_HISBA_BASE', atom: 'ATOM_010', file: '01_تعريف-ملخص القصة_En.srt', cue: 116 },
        { when: '2014', what: 'Abu Seif Maqs torture', type: 'torture', node: 'Abu_Seif_Maqs', atom: 'ATOM_012', file: '01_تعريف-ملخص القصة_En.srt', cue: 143, detail: '3d beating · 18d shabeh · ribs broken.' },
        { when: 'Sum 2014', what: 'Lakhdar Brahimi killing', type: 'torture', node: 'EVT_LAKHDAR_BRAHIMI_KILLING', atom: 'ATOM_026', file: '04_التحقيق_En.srt', cue: 73, detail: '🔊 Hose striking. Van driver killed.' },
        { when: '2014/15', what: 'Escape attempt', type: 'escape', node: 'EVT_ESCAPE_ATTEMPT', atom: 'ATOM_028', file: '07_محاولة الهروب من السجن_En.srt', cue: 5, detail: 'Wall dug. 7m drop. Recaptured.' },
        { when: '2014/15', what: 'Crucifixion punishment', type: 'torture', node: 'CRUCIFIXION', atom: 'ATOM_032', file: '07_محاولة الهروب من السجن_En.srt', cue: 73, detail: 'Also reported at al-Burj.' },
        { when: '2014/15', what: 'Qisas sentence', type: 'judicial', node: 'EVT_QISAS_SENTENCING', atom: 'ATOM_020', file: '08_العملية القضائية-_En.srt', cue: 54, detail: '10 charges. Judge strikes head.' },
        { when: 'Ramadan', what: 'Judicial Police · swords', type: 'judicial', node: 'EVT_JUDICIAL_POLICE_TRANSFER', atom: 'ATOM_034', file: '09_الشرطة القضائية_En.srt', cue: 3, detail: '🔊 Ibrahim choking from fear.' },
        { when: '3.5 mo', what: 'Jazira Junction chained', type: 'detention', node: 'JAZIRA_JUNCTION_PRISON', atom: 'ATOM_037', file: '10_وصف سجن مفرق الجزرة_En.srt', cue: 5, detail: '26 links · 7 padlocks · cameras.' },
        { when: '2014–17', what: '28 total imprisonments', type: 'isis', node: 'RAQQA_CITY', atom: 'ATOM_024', file: '01_تعريف-ملخص القصة_En.srt', cue: 176 },
        { when: 'Post-lib', what: 'Site visit confirmed', type: 'corroboration', node: 'SITE_VISIT_PRISON_ROOM', atom: 'ATOM_040', file: 'خارجي/01_prison room_En.srt', cue: 1, detail: 'Iron bars · positions · escape route.' },
    ];
    const colors = {
        regime: '#6366f1', transition: '#64748b', isis: '#ef4444', torture: '#dc2626',
        crossregime: '#f97316', escape: '#f97316', judicial: '#f59e0b', detention: '#3b82f6', corroboration: '#10b981',
    };
    const labels = {
        regime: 'REGIME', transition: 'TRANSITION', isis: 'ISIS', torture: 'TORTURE',
        crossregime: 'CROSS-REGIME', escape: 'ESCAPE', judicial: 'JUDICIAL', detention: 'DETENTION', corroboration: 'CORROBORATION',
    };

    let html = '<div class="timeline">';
    for (const e of events) {
        const color = colors[e.type] || '#64748b';
        const clickable = e.node && e.file;
        const esc = (e.file||'').replace(/'/g,"\\'");
        const onclick = clickable ? `onclick="navigateToNode('${e.node}','${esc}',${e.cue||0},'${e.atom}')"` : '';

        html += `<div class="tl-row ${clickable ? 'tl-clickable' : ''}" ${onclick}>
            <div class="tl-dot" style="background:${color}"></div>
            <div class="tl-when">${e.when}</div>
            <div class="tl-badge" style="background:${color}22;color:${color}">${labels[e.type]||''}</div>
            <div class="tl-what">${e.what}</div>
            ${e.detail ? `<div class="tl-detail">${e.detail}</div>` : ''}
            ${clickable ? `<div class="tl-ref">${e.atom} · Cue #${e.cue}</div>` : ''}
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// --- Filters (FIX: trigger render on change) ---
function initFilters() {
    const nt = [...new Set(nodes.map(n => n.type))].sort();
    const et = [...new Set(edges.map(e => e.type))].sort();
    const tiers = ['CONVERGENT', 'CORROBORATED', 'SUPPORTED', 'UNCORROBORATED'];
    activeNodeTypes = new Set(nt); activeEdgeTypes = new Set(et); activeTiers = new Set(tiers);
    buildCB('node-type-filters', nt, activeNodeTypes, NODE_COLORS);
    buildCB('edge-type-filters', et, activeEdgeTypes, EDGE_COLORS);
    buildCB('corr-filters', tiers, activeTiers);
}
function buildCB(id, items, set, cm) {
    const c = document.getElementById(id); c.innerHTML = '';
    for (const item of items) {
        const l = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = true;
        cb.addEventListener('change', () => {
            cb.checked ? set.add(item) : set.delete(item);
            render();
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
    const items = [
        { color: '#ef4444', label: 'Critical (perpetrator)' },
        { color: '#f59e0b', label: 'Event / witness' },
        { color: '#3b82f6', label: 'Facility / location' },
        { color: '#8b5cf6', label: 'Organization / role' },
        { color: '#14b8a6', label: 'Sensory evidence' },
        { color: '#10b981', label: 'Corroboration' },
    ];
    for (const i of items) {
        const d = document.createElement('div'); d.className = 'legend-item';
        d.innerHTML = `<span class="legend-dot" style="background:${i.color}"></span>${i.label}`;
        legend.appendChild(d);
    }
    const note = document.createElement('div'); note.className = 'legend-item';
    note.innerHTML = '<span style="border-bottom:2px dashed #ef4444;width:10px;display:inline-block"></span> Human gate required';
    legend.appendChild(note);
}
function updateStats() {
    document.getElementById('stat-nodes').textContent = nodes.length;
    document.getElementById('stat-edges').textContent = edges.length;
    document.getElementById('stat-gated').textContent = edges.filter(e => e.requires_human_gate).length;
}

initCanvas(); loadFKG();
