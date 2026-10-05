import { Sparkline } from './data'
import {
  bar,
  clamp,
  fmtMs,
  fmtTokens,
  fmtUsd,
  pad,
  pct,
  series,
  tone,
  truncateStart,
  type El,
} from './foundations'

export type TimelineCall = {
  id: string
  tool: string
  target: string
  startedAt: number
  endedAt?: number
  isError?: boolean
}

/** Gantt lanes: one row per tool call, placed on a shared time axis. */
export function ToolTimeline(el: El, p: { calls: TimelineCall[]; now: number; width: number; rows?: number }) {
  const { Box, Text } = el
  const calls = p.calls.slice(-(p.rows ?? 12))
  if (calls.length === 0) return <Text dimColor>No tool calls yet.</Text>

  const start = Math.min(...calls.map(call => call.startedAt))
  const end = Math.max(p.now, ...calls.map(call => call.endedAt ?? p.now))
  const span = Math.max(1, end - start)
  const nameWidth = 8
  const timeWidth = 6
  const lane = Math.max(8, p.width - nameWidth - timeWidth - 2)

  return (
    <Box flexDirection="column">
      {calls.map(call => {
        const from = Math.floor(((call.startedAt - start) / span) * lane)
        const to = Math.max(from + 1, Math.ceil((((call.endedAt ?? p.now) - start) / span) * lane))
        const isRunning = call.endedAt === undefined
        const color = call.isError ? tone.bad : isRunning ? tone.warn : tone.info
        const took = (call.endedAt ?? p.now) - call.startedAt

        return (
          <Box>
            <Text dimColor>{pad(call.tool, nameWidth)} </Text>
            <Text>{' '.repeat(clamp(from, 0, lane - 1))}</Text>
            <Text color={color}>{(isRunning ? '▸' : '█').repeat(clamp(to - from, 1, lane - from))}</Text>
            <Text>{' '.repeat(Math.max(0, lane - to))}</Text>
            <Text dimColor> {fmtMs(took).padStart(timeWidth - 1)}</Text>
          </Box>
        )
      })}
    </Box>
  )
}

export type UsagePoint = { usd: number; tokens: number }

/** Session spend, tokens and the per-turn burn trend. */
export function TokenBurn(el: El, p: { points: UsagePoint[]; width: number; budgetUsd?: number }) {
  const { Box, Text } = el
  const last = p.points[p.points.length - 1] ?? { usd: 0, tokens: 0 }
  const perTurn = p.points.map((point, i) => point.usd - (p.points[i - 1]?.usd ?? 0))
  const budget = p.budgetUsd ?? 5
  const level = last.usd / budget

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color={level > 0.9 ? tone.bad : level > 0.6 ? tone.warn : tone.ok}>
          {fmtUsd(last.usd)}
        </Text>
        <Text dimColor>
          {' '}
          of {fmtUsd(budget)} · {fmtTokens(last.tokens)} tok · {p.points.length} turns
        </Text>
      </Box>
      {Sparkline(el, { values: perTurn.length ? perTurn : [0], width: p.width, label: 'per turn', format: fmtUsd })}
    </Box>
  )
}

export type AgentNode = {
  name: string
  type: string
  status: 'running' | 'done' | 'failed'
  children?: AgentNode[]
}

/** Live tree of spawned subagents with status dots. */
export function SubagentTree(el: El, p: { root: AgentNode; width: number }) {
  const { Box, Text } = el
  const lines: { prefix: string; node: AgentNode }[] = []
  const walk = (node: AgentNode, prefix: string, isLast: boolean, depth: number) => {
    lines.push({ prefix: depth === 0 ? '' : prefix + (isLast ? '└─ ' : '├─ '), node })
    const kids = node.children ?? []
    kids.forEach((kid, i) =>
      walk(kid, depth === 0 ? '' : prefix + (isLast ? '   ' : '│  '), i === kids.length - 1, depth + 1),
    )
  }
  walk(p.root, '', true, 0)
  const dot = { running: tone.warn, done: tone.ok, failed: tone.bad }

  return (
    <Box flexDirection="column">
      {lines.map(({ prefix, node }) => (
        <Box>
          <Text dimColor>{prefix}</Text>
          <Text color={dot[node.status]}>● </Text>
          <Text>{node.name}</Text>
          <Text dimColor> {node.type}</Text>
        </Box>
      ))}
    </Box>
  )
}

/** What fills the context window: a stacked bar plus legend. */
export function ContextMap(
  el: El,
  p: { categories: { name: string; tokens: number }[]; window: number; width: number },
) {
  const { Box, Text } = el
  const categories = p.categories.filter(c => !/free space/i.test(c.name))
  const used = categories.filter(c => !isReserve(c.name)).reduce((sum, c) => sum + c.tokens, 0)
  const cells = Math.max(10, p.width)
  let placed = 0
  const segments = categories.map((c, i) => {
    const target = Math.round(((placed + c.tokens) / p.window) * cells)
    const from = Math.round((placed / p.window) * cells)
    placed += c.tokens
    return { text: '█'.repeat(Math.max(0, target - from)), color: series[i % series.length] }
  })
  const free = Math.max(0, cells - segments.reduce((sum, s) => sum + s.text.length, 0))

  return (
    <Box flexDirection="column">
      <Box>
        {segments.map(s => (
          <Text color={s.color}>{s.text}</Text>
        ))}
        <Text dimColor>{'░'.repeat(free)}</Text>
      </Box>
      <Text dimColor>
        {fmtTokens(used)} of {fmtTokens(p.window)} · {pct(used / p.window)} used
      </Text>
      <Box flexWrap="wrap" columnGap={2}>
        {categories.map((c, i) => (
          <Box>
            <Text color={series[i % series.length]}>■ </Text>
            <Text>
              {c.name} {fmtTokens(c.tokens)}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/** Free space and the autocompact buffer are room, not content. */
const isReserve = (name: string) => /free space|autocompact/i.test(name)

export type FileTouch = { path: string; reads: number; edits: number }

/** Files read and edited this session, hottest first. */
export function FileTouchMap(el: El, p: { files: FileTouch[]; width: number; rows?: number }) {
  const { Box, Text } = el
  const files = [...p.files].sort((a, b) => b.reads + b.edits * 3 - (a.reads + a.edits * 3)).slice(0, p.rows ?? 8)
  if (files.length === 0) return <Text dimColor>No files touched yet.</Text>

  const max = Math.max(1, ...files.map(f => f.reads + f.edits * 3))
  const heatWidth = 6
  const countWidth = 8
  const pathWidth = Math.max(10, p.width - heatWidth - countWidth - 2)

  return (
    <Box flexDirection="column">
      {files.map(f => (
        <Box>
          <Text color={f.edits ? tone.warn : tone.info}>
            {bar((f.reads + f.edits * 3) / max, heatWidth, ' ')}
          </Text>
          <Text> {truncateStart(f.path, pathWidth).padEnd(pathWidth)}</Text>
          <Text dimColor>
            {' '}
            {String(f.reads).padStart(2)}r {String(f.edits).padStart(2)}e
          </Text>
        </Box>
      ))}
    </Box>
  )
}
