# cc-kit

Visual components for [Claude Code](https://claude.com/claude-code) mods: sparklines, gauges, KPI tiles, heatmaps, and live agent observability (tool timeline, token burn, subagent tree, context map). They draw in the terminal and the desktop app.

> **Early access.** Claude Code's mod API is marked "EARLY ACCESS: this surface may change between releases without notice." cc-kit is tested against **Claude Code 2.1.288**. Expect breakage on newer releases until CI against the latest release lands.

## Status

Phase 0: a **kitchen sink**. Every candidate component is on one pane, so you can see what's possible and judge each one. The registry and `/kit add` come next. See [the design spec](docs/specs/2026-10-04-cc-kit-v1-design.md).

## Try the kitchen sink

```sh
claude --plugin-dir /path/to/cc-kit/mods/kit-sink
```

Then, inside Claude Code:

```
/kit sink
```

The pane has a tab per group. Components tagged `[v1]` are planned for the first release; `[sink only]` ones are mocks shown to gather feedback. The observability components switch from `○ mock` to `● live` as soon as your session runs a tool.

## Develop

```sh
claude plugin validate mods/kit-sink
claude plugin test mods/kit-sink
```

## License

MIT
