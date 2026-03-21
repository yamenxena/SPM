# 🏛️ Infra-Structure: Agentic Operating System (AOS)

> **The command center for all AI-driven infrastructure within `D:\YO\`.**

This workspace is a fully autonomous, multi-model AI operating system designed to build, audit, and maintain infrastructure code without redundant looping or hallucination. It is governed by a strict Constitution, layered governance configs, and executable Python skills.

---

## 🧭 Quick Start (Re-Entry Path)

If you're returning after being away, follow these 3 steps:

1. **Read the Ledger** → [WORKSPACE_LEDGER.md](.agents/artifacts/WORKSPACE_LEDGER.md)  
   This tells you what phase we're in and what happened last.

2. **Read the Constitution** → [GEMINI.md](.agents/GEMINI.md)  
   This tells every AI agent how to behave. If you're onboarding a new model, point it here first.

3. **Check the Roster** → [AGENT_ROSTER.md](.agents/artifacts/AGENT_ROSTER.md)  
   This tells you which AI models are active, their roles, and the H/A/S operation taxonomy.

---

## 📂 Workspace Hierarchy (Complete)

```text
D:\YO\                                         # GLOBAL ROOT
├── .venv\                                     # Centralized Python 3.8 (shared by all workspaces)
│   └── Lib/site-packages/                     # pydantic, mypy, pyre2
│
└── Infra-Structure\                           # THIS WORKSPACE
    ├── README.md                              # ← You are here (human + agent orientation)
    ├── .editorconfig                          # Ghost Diff prevention (UTF-8, 4-space indent)
    ├── requirements.txt                       # Python dependency manifest
    ├── pyrightconfig.json                     # IDE type-checker → .venv resolution
    │
    ├── _Plans/                                # [DEPRECATED] Human planning archive
    │   ├── Audit/                             # Ouess's original audit prompts + findings
    │   │   ├── PROMPT A.md                    # Organisational audit prompt
    │   │   ├── PROMPT B.md                    # Infrastructure audit prompt
    │   │   ├── Infrastructure Friction Audit.md
    │   │   ├── Deep Audit and Proposal...md
    │   │   ├── methods.md                     # IDE/Env parity recommendations
    │   │   └── domain_specific_findings.md    # ✅ ACTIVE — future pipeline reference
    │   └── *.md                               # Legacy implementation plans (all deprecated)
    │
    └── .agents/                               # ═══ AUTONOMOUS DOMAIN ═══
        │
        ├── GEMINI.md                          # 🏛️ THE CONSTITUTION
        │                                      #    Every agent reads this FIRST.
        │                                      #    Defines: Identity, Model Stack, Comms Protocol,
        │                                      #    Pipeline Rules, Security, State Ledger.
        │
        ├── config/                            # ═══ GOVERNANCE LAYER ═══
        │   │                                  #     (What agents MUST and CANNOT do)
        │   │
        │   ├── guardrails.md                  # §1 Path Boundaries (Sandbox)
        │   │                                  # §2 Token Burn & Circuit Break policy
        │   │                                  # §3 Tool Overload Limit
        │   │                                  # §4 Concurrent File Writes & Locks
        │   │                                  # §5 Review Flags (Automation Bias)
        │   │                                  # §6 Domain-Bounded Skills & Personas
        │   │                                  # §7 Cognitive Load Management
        │   │                                  # §8 Context Handoff (Cross-Provider)
        │   │                                  # §9 Write Discipline (Translation Domain)
        │   │
        │   ├── policies.md                    # §1 Idempotency (replay-safe scripts)
        │   │                                  # §2 Mandatory Validation Gates
        │   │                                  # §3 Strict Handoff Protocol (Markdown Summaries)
        │   │                                  # §4 Shared State Freshness (24h TTL)
        │   │                                  # §5 Artifact Naming Conventions
        │   │                                  # §6 Provenance Stamps ([AUTH:] tags)
        │   │
        │   ├── model-routing.md               # 3-Tier Match Rule (which model for which task)
        │   │                                  # Cross-Validation Protocol (Gemini ↔ Claude)
        │   │                                  # Speed Layer Protocol (Flash for grunt work)
        │   │                                  # Context Packaging (Markdown Summaries)
        │   │
        │   ├── circuit-breakers.md            # Step Overload (50 steps → halt)
        │   │                                  # Recursion Depth (3 max inter-agent calls)
        │   │                                  # Error Cascade (3 same-tool failures → halt)
        │   │
        │   ├── quota-budget.md                # Ultra Tier daily limits & alert thresholds
        │   │
        │   ├── telemetry.md                   # Structured logging format
        │   │                                  # Workflow trace schemas
        │   │
        │   ├── dialogue-protocol.md          # Session Budget, PLAN/PROCEED, Drift Guard
        │   ├── editorial_guide.md            # SPM editorial rules (compact reference)
        │   ├── AP_catalog.md                 # 65 Audit Point codes
        │   ├── payment_rules.md              # Payment calculation rules
        │   └── personas/                      # Specialized AI identities
        │       └── auditor.md                 # Quality Auditor (read-only, Claude Opus)
        │
        ├── skills/                            # ═══ CAPABILITIES LAYER ═══
        │   │                                  #     (Deterministic, executable code)
        │   │                                  #     Each skill = .md (interface) + .py (code)
        │   │
        │   ├── schemas.py                     # 🔑 SSoT for typed contracts:
        │   │                                  #     - Sandbox Path Validator
        │   │
        │   ├── validation_gate.py             # Quality checks: TTL, Provenance, FileSize, Schema
        │   ├── validation_gate.md             # Interface contract for validation_gate.py
        │   │
        │   ├── workspace_scanner.py           # Read-only filesystem indexer → JSON manifest
        │   └── workspace_scanner.md           # Interface contract for workspace_scanner.py
        │
        ├── workflows/                         # ═══ ORCHESTRATION LAYER ═══
        │   │                                  #     (Step-by-step playbooks agents follow)
        │   │
        │   ├── audit.md                       # /audit  — Health check + UU scan
        │   ├── manage_memory.md               # /manage_memory — Two-Tier memory protocol
        │   ├── init_workspace.md              # /init_workspace — Fresh AOS setup
        │   ├── translate-article.md           # /translate-article — AR→EN article
        │   ├── translate-srt.md               # /translate-srt — AR→EN subtitles
        │   ├── extract.md                     # /extract — Robin instruction extraction
        │   ├── calculate-payment.md           # /calculate-payment — Invoice generation
        │   └── promote-glossary.md            # /promote-glossary — Term promotion
        │
        ├── artifacts/                         # ═══ PERSISTENT INTELLIGENCE ═══
        │   │                                  #     (Project-level memory, survives sessions)
        │   │
        │   ├── WORKSPACE_LEDGER.md            # Master state: phase, decisions, activity log
        │   ├── WORKSPACE_ONTOLOGY.md          # Asset dependency graph (which file needs which)
        │   ├── AGENT_ROSTER.md                # Agent roles, H/A/S taxonomy, status definitions
        │   └── *_Audit-Report.md              # Dated audit outputs
```

---

## 🔄 How the Workspace Works (Step by Step)

### Step 1: Agent Boot — Constitution Loading

When any AI agent (Gemini, Claude, or Flash) opens this workspace, the first thing it reads is **`.agents/GEMINI.md`** — the AOS Constitution. This document tells the agent:
- **What it is** — Its role within the 3-model fleet.
- **What it must never do** — The security sandbox (`D:\YO\Infra-Structure\` only), non-scope boundaries.
- **What files to read next** — The Workspace Ledger and Agent Roster.

> Without GEMINI.md, an agent has zero context and will hallucinate the workspace structure.

### Step 2: State Recovery — Reading the Ledger

After the Constitution, the agent reads **`WORKSPACE_LEDGER.md`**. This artifact answers three questions in under 10 seconds:
1. **What are we doing?** → Operating an AOS governed by GEMINI.md.
2. **What phase are we in?** → The current development phase (e.g., Phase 7 — System Validation).
3. **What is my next action?** → The Next Actions section. No chat history needed.

The Ledger also contains a **Chronological Activity Log** — an append-only record of every major action taken, by any agent, across any session. This prevents redundant work.

### Step 3: Governance Loading — The Config Layer

Before the agent can take any action, it loads the governance layer from **`config/`**. These files work together as a tiered permission system:

| Order | File | Question It Answers |
|---|---|---|
| 1st | `guardrails.md` | **What am I NOT allowed to do?** (Path boundaries, token limits, domain restrictions) |
| 2nd | `policies.md` | **HOW must I work?** (Idempotency, provenance stamps, handoff protocol, TTL freshness) |
| 3rd | `model-routing.md` | **Am I the RIGHT model for this task?** (3-Tier Match: complexity → model assignment) |
| 4th | `circuit-breakers.md` | **When must I STOP?** (Step overload, recursion depth, error cascade thresholds) |
| 5th | `quota-budget.md` | **How much resource am I allowed to consume?** (Daily token limits per model) |
| 7th | `telemetry.md` | **How must I LOG my actions?** (Structured logging format, trace schemas) |

### Step 4: Task Execution — Skills & Workflows

Once governance is loaded, the agent executes work via two mechanisms:

#### A) Workflows (High-Level Playbooks)
Workflows are step-by-step instructions in **`workflows/`**. They tell the agent *what to do* in sequence:

| Command | Workflow | What It Does |
|---|---|---|
| `/audit` | `audit.md` | Scans the workspace, checks for stale artifacts, validates schemas, generates a report |
| `/manage_memory` | `manage_memory.md` | Manages the Two-Tier Memory architecture (Project-level → Session-level) |
| `/init_workspace` | `init_workspace.md` | Creates a fresh AOS workspace from scratch with all directories and files |

#### B) Skills (Deterministic Executables)
Skills are the actual Python scripts in **`skills/`**. Every skill follows the **Hybrid Pattern**: a `.md` file (interface contract for Chat agents) + a `.py` file (deterministic executable code).

| Skill | What It Does | Example Usage |
|---|---|---|
| `schemas.py` | Defines typed Pydantic contracts and sandbox validators | `from schemas import validate_sandbox_path` |
| `validation_gate.py` | Checks artifacts for TTL freshness, provenance stamps, file size | `python validation_gate.py --all LEDGER.md` |
| `workspace_scanner.py` | Crawls the workspace and returns a JSON file manifest | `python workspace_scanner.py -t . -d 3` |

### Step 5: Cross-Provider Handoffs — Markdown Summaries

When a task passes from one AI model to another (e.g., Gemini → Claude), context is lost. To solve this, the sending agent creates a structured Markdown summary and prompts the user to switch models. 

The summary must include:
1. Context geometry (where we are, what phase)
2. The exact next steps required
3. The exact files that need to be read or modified.

**Naked handoffs (just saying "I'm done, switch models") are forbidden.**

### Step 6: Crash Recovery — Circuit Breakers

If something goes wrong (agent loops, tool keeps failing, token exhaustion), the **circuit breakers** are designed to halt the agent before quota is burned:

| Breaker | Threshold | What Happens |
|---|---|---|
| Step Overload | 50 reasoning steps | Agent halts and notifies operator |
| Recursion Depth | 3-level inter-agent chain | Chain is broken, operator alerted |
| Error Cascade | 3 consecutive same-tool failures | Workflow halts, manual intervention required |

### Step 7: Session End — Persistence Protocol

At the end of every session, the agent must:
1. **Update the Ledger** — Append a summary of all actions to the Chronological Activity Log.
2. **Update `task.md`** — Mark all completed items in the session checklist.
3. **Archive plans** — Move superseded plans to `_Plans/` with a `[DEPRECATED]` header.

This ensures the next agent (or the next session) can resume without redundant work.

---

## 🤖 The 3-Model Fleet

| Model | Role | When It's Used |
|---|---|---|
| **Gemini 3.1 Pro** | 🔴 Primary Engine | Complex logic, architecture, Deep Think sessions |
| **Claude Opus 4.6** | 🔴 Deep Validator | Code review, meticulous file ops, cross-verification |
| **Gemini 3 Flash** | 🟢 Speed Layer | Formatting, CSV parsing, bulk text processing |

Agent routing and handoff contracts are defined in [model-routing.md](.agents/config/model-routing.md).

> **Model Routing Mismatch Rule:** If an agent determines it is the wrong model for the task complexity (e.g., Flash being asked for a Security Audit), it must halt and state `[D5] Model Routing Mismatch`.

---

## 🐍 Python Environment

All scripts execute via the **centralized virtual environment** at `D:\YO\.venv\`.

```powershell
# Run any skill manually:
& "D:\YO\.venv\Scripts\python.exe" .agents\skills\workspace_scanner.py -t "D:\YO\Infra-Structure" -d 3

# Run schema self-test:
& "D:\YO\.venv\Scripts\python.exe" .agents\skills\schemas.py --test

# Validate an artifact:
& "D:\YO\.venv\Scripts\python.exe" .agents\skills\validation_gate.py --all ".agents\artifacts\WORKSPACE_LEDGER.md"
```

**Installed packages:** `pydantic`, `mypy`, `pyre2`

---

## 📝 The Two-Tier Memory Architecture

| Tier | Location | Survives Sessions? | Purpose |
|---|---|---|---|
| **Project Level** (Persistent) | `.agents/artifacts/` | ✅ Yes | Ledger, Ontology, Roster — permanent record |
| **Session Level** (Ephemeral) | `<appDataDir>/brain/<conversation-id>/` | ❌ No | `task.md`, `implementation_plan.md`, `walkthrough.md` — active work |

At session end, the key decisions from Session-level artifacts are committed to Project-level artifacts (the Ledger).

---

## 🛡️ Key Rules (The Non-Negotiables)

1. **Python Only** — All scripts are `.py`. No Powershell or Bash for complex logic.
2. **Hybrid Skills** — Every skill has a `.md` (context for Chat) + a `.py` (deterministic executable code).
3. **Sandbox** — Agents cannot read/write outside `D:\YO\Infra-Structure\` (exception: `D:\YO\.venv\`).
4. **Idempotency** — Every command must be safe to run twice (replay-safe).
5. **Provenance** — Every AI-generated artifact ends with `[AUTH: Model | Workspace | Version | Date]`.
6. **[DEFERRED] Protocol** — Agents must NOT attempt to fix anything tagged `[DEFERRED]`.
7. **Session Persistence** — The Ledger MUST be updated at the end of every session.
8. **SSoT Enforcement** — Data must never be duplicated across files. One canonical source, others reference it.

---

## 🧩 Recommended IDE Extensions

| Extension Name | Unique ID | Role in AOS Pipeline |
|---|---|---|
| **Python** | `ms-python.python` | Core Runtime & Debugger |
| **Pydantic** | `ms-python.vscode-pydantic` | Contract validation |
| **Mypy** | `ms-python.mypy-type-checker` | Static Logic Auditing |
| **Markdown All-in-One** | `yzhang.markdown-all-in-one` | Memory artifact integrity |
| **Python Debugger** | `ms-python.debugpy` | Troubleshooting workflow DAGs |


---

## 📚 Further Reading

| Document | Purpose |
|---|---|
| [GEMINI.md](.agents/GEMINI.md) | The AOS Constitution (agents read this first) |
| [WORKSPACE_LEDGER.md](.agents/artifacts/WORKSPACE_LEDGER.md) | Current phase, activity log, re-entry path |
| [AGENT_ROSTER.md](.agents/artifacts/AGENT_ROSTER.md) | Agent roles, H/A/S taxonomy, status definitions |
| [WORKSPACE_ONTOLOGY.md](.agents/artifacts/WORKSPACE_ONTOLOGY.md) | Asset dependency graph |
| [guardrails.md](.agents/config/guardrails.md) | Security boundaries and skill rules |
| [policies.md](.agents/config/policies.md) | Idempotency, validation, TTL, provenance |
| [schemas.py](.agents/skills/schemas.py) | Sandbox validation utilities |

---
*Last updated: 2026-03-09 | Phase 8 — SPM Domain Absorption Complete*

[AUTH: Gemini 3.1 Pro | Infra-Structure | policies:1.3.0 | 2026-03-09]
