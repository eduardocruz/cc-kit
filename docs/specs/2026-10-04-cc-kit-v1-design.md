# cc-kit v1 — Design

Date: 2026-10-04 · Status: draft, awaiting review

## Intent

**What Eduardo said:** a library of visual components for Claude Code Mods; public open source; consumed copy-in (shadcn model); v1 combines the data primitives and the agent-observability set; a kitchen-sink demo that shows many components together so the potential is visible and choices can be made from it.

**Assumptions (correct if wrong):**
- The audience is mod authors, not end users. End users meet the kit through the showcase mod.
- Success for v1 = strangers install `kit-observatory` and run `/kit add` at least once. Distribution, not feature count.
- English everywhere (public OSS).

## Platform facts this design rests on

Verified in the Claude Code 2.1.288 plugin-authoring types:

- Elements: `Box, Text, Button, Input, Select, Link, Markdown, Code, Svg, Raster, Image, Client`. `Svg` is desktop-only; `Raster`/`Image` are terminal-only; `mobile` lacks `Input`/`Select`/`Client`.
- Render slots: `Pane`, `AbovePrompt`, `ToolUse`, `ToolResult`, `ToolProgress`, `ToolGroup`, `Spinner`, `TurnDuration`, `SessionMode`, `PromptHint`, `InfoNotice`, `CommandOutput`, `AskUserQuestion`, `UserMessage`, `AssistantMessage`, `MessageDisplay`; plus `$.ui.status` and `$.ui.toast`.
- Data events: `tool.call`, `turn.start/step/complete` (with `usage`), `agent.spawn`, `$.session.usage`, `$.session.measure`.
- Plugins can share code at runtime only through a dependency plugin's noun on `$`. **Runtime relative imports inside one mod are unconfirmed**: the docs show only `import type` from relative paths.

## Component catalog (all candidates)

| Group | Components | v1 |
|---|---|---|
| 0 Foundations | tokens (semantic color → ANSI/CSS, glyph sets), fit (truncate/pad/scale to `bodyColumns`), test template | ✅ |
| 1 Data at a glance | Sparkline, Gauge/Meter, StatTile/KpiRow, BarList, Heatmap | ✅ |
| 2 Agent observability | ToolTimeline, TokenBurn, SubagentTree, ContextMap, FileTouchMap | ✅ |
| 3 Code & review | DiffCard, FindingList, TestRun, CommitComposer | sink only |
| 4 Decision & input | ChoiceCard, Checklist/TodoBoard, ConfirmBar, FormPane | sink only |
| 5 Engine-slot skins | ToolUse/ToolResult skins, Spinner packs, ToolGroup summarizer, PromptHint rotator | sink only |
| 6 Layout & chrome | Card, Section, Tabs, Table, KeyValue, Badge/Pill, EmptyState, Toast presets | as needed by 1–2 |

"Sink only" = drawn as a mock in the kitchen sink so the item can be judged before it is built properly.

## Phase 0 — Kitchen sink (first deliverable)

A mod `kit-sink`. `/kit sink` opens a Pane showing every catalog component, grouped by the table above. Each group is a tab, plus an **All** tab with everything stacked. Everything runs on mock data, with one switch for **live** data where a collector exists (group 2).

- Every component carries a label: its name, its group and its v1 status, so the sink is also the selection sheet.
- It renders on terminal and desktop; side-by-side screenshots of both go in the README.
- Mock components are allowed to be rough; the sink is for judging, not shipping. Code from the sink graduates into `registry/` only when it meets the v1 contract below.
- It **doubles as the spike**, answering three questions:
  1. Do runtime relative imports work inside a mod? This decides between multi-file and inlined `/kit add`.
  2. What does `$.session.measure` return? This decides whether ContextMap is feasible.
  3. Does a Pane redraw smoothly at about 4 Hz when `tool.call` writes to `$.state`? This decides how live ToolTimeline can be.

**Spike answers (2026-10-04, kit-sink 0.1.0):**
1. **Relative imports: yes.** The types header says "every file it imports from the plugin" loads via `import`. kit-sink's `register.tsx` imports `./kit/*.tsx`, and validate, `tsc` and 4/4 tests pass. `/kit add` can copy multiple files; no inlining is needed.
2. **ContextMap: feasible without `measure`.** `$.session.usage({ breakdown: 'summary' })` returns `context.breakdown.categories[]` (name, tokens, color, isDeferred), plus `cost.usd` and `rateLimits[]`. Collected on `turn.complete`.
3. **Redraw rate: not yet measured.** It needs a live session; check by opening `/kit sink` during a tool-heavy turn.

**Exit:** Eduardo picks from the sink. The v1 list in the catalog is confirmed or changed, and the spike answers are written into this spec.

## Phase 1 — Registry + showcase

### Component contract
- A component is a pure function `(el, props) => tree`. `el` is the table from `$.ui.resolve(e)`, and `props` includes `surface` and `columns`.
- Components never touch `$` and hold no state. They pick a surface strategy (Svg on desktop, glyphs/Raster on terminal) and are never terminal-only.
- Observability components take data (`calls[]`, `turns[]`, `agents[]`). **Collectors** are separate copy-in files: hooks that write `$.state` atoms, each declared in the mod's `types/index.d.ts` contract.

### Repo layout
```
cc-kit/
  registry/foundations/  tokens.ts fit.ts
  registry/data/         sparkline.tsx gauge.tsx stat-tile.tsx bar-list.tsx heatmap.tsx
  registry/observe/      tool-timeline.tsx token-burn.tsx subagent-tree.tsx context-map.tsx file-touch-map.tsx
  registry/collectors/   tool-calls.ts turns.ts agents.ts
  registry.json          name → files + deps
  mods/kit-sink/         Phase 0
  mods/kit-observatory/  showcase, built only from registry/
  site/                  gallery page
```

### `kit-observatory`
- `/observatory` opens a Pane with tabs Timeline · Tokens · Agents · Context · Files.
- **The Pane is never opened unasked.** A Pane opened from `session.start` or a timer only appears at ≥144 terminal columns, so a first-time installer on a laptop terminal would see nothing. Both Panes (`/observatory`, `/kit sink`) open only from a command. On the first session after install, a one-time `$.ui.toast` (tracked in `$.store`) says "Run /observatory". The install instructions in the README lead with that command.
- An `AbovePrompt` TokenBurn band appears only past a cost/context threshold.
- The status line shows `$0.42 · 61% ctx`.
- `/kit add <name>` fetches `registry.json` and files from GitHub raw, writes them into the current mod's `hooks/kit/`, and prints the import line. `/kit list` lists components. The fallback when relative imports fail is inlining dependencies into one file.

### Testing
- One `*.test.ts` per component: mount it through a harness mod and loop over `['terminal','desktop']`.
- CI runs `claude plugin validate` and `claude plugin test` on the harness and on both mods.

### Gallery
- One static page with terminal and desktop screenshots of each component and its `/kit add` line.

## Out of v1
- Building groups 3–5 for real.
- Theme packs.
- An npm package or dependency-plugin delivery.
- Mobile/vscode-specific variants beyond what the element table already forces.

## Risks
- **API churn:** the types file says "EARLY ACCESS: this surface may change between releases without notice", and engine-slot props may change. That is why group 5 stays sink-only. Copy-in means a fix in the registry doesn't reach copies authors already made. Mitigations:
  - Components touch only element props, never `$`. That keeps the breakable surface to about 6 elements.
  - Every `registry.json` entry carries `testedWith: "<claude-code version>"`. `/kit add` and `/kit list` warn when the running version is newer, and `/kit diff <name>` shows what changed upstream.
  - CI runs nightly against the latest Claude Code release (validate + test on the harness and both mods). A red run opens an issue before strangers hit the break.
  - The README states the supported version range and the early-access status up front.
- **Distribution:** a registry with no showcase gets no installs. That is why the observatory mod is the front door.
