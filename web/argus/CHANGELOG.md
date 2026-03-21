# Argus Viewer Changelog

## v3.1 — 2026-03-21T16:00 (Status Quo Snapshot)

### Files
- `web/argus/index.html` — 74 lines
- `web/argus/assets/app.js` — 595 lines
- `web/argus/assets/style.css` — 347 lines

### State
- **Graph View**: Canvas-based force-directed graph, 69 nodes, 91 edges
- **Evidence Flow**: SVG canvas flow with 14 positioned nodes, bezier curve arrows, Obsidian-style
- **Timeline**: Vertical timeline with 16 events, clickable navigation to graph
- **Source Panel**: Slide-up SRT cue viewer with highlighted targets
- **Sidebar**: Fixed 220px left, filters + legend
- **Inspector**: Fixed 300px right, node details
- **View Switcher**: 3 buttons (Graph / Evidence Flow / Timeline) — switches between views
- **Layout**: Fixed, desktop-only, no responsive support

### Key Features Working
1. Click node → zoom + inspector + source panel
2. Evidence Flow → SVG with hover glow, clickable nodes
3. Timeline → clickable events → navigate to graph
4. Filters → checkbox-based, re-render on change
5. Source locator → SRT loading, cue highlighting, auto-scroll
6. All 46 source cues validated against atoms.json

### Known Issues Before This Overhaul
- Evidence Flow and Timeline **replace** graph (not side-by-side)
- No zoom/pan on Evidence Flow SVG
- Sidebar always visible (no toggle/retract)
- Inspector always visible when open (no toggle)
- No mobile support at all
- Source panel left offset hardcoded to 220px
