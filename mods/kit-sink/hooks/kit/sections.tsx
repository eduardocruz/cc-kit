import type { RenderChildren } from 'claude-code'

import type { SinkCall, SinkUsage } from '../../types'
import { BarList, Gauge, Heatmap, KpiRow, Sparkline } from './data'
import { fmtUsd, tone, type El } from './foundations'
import * as mock from './mocks'
import { ContextMap, FileTouchMap, SubagentTree, TokenBurn, ToolTimeline, type AgentNode, type FileTouch } from './observe'

export type Live = { calls: SinkCall[]; usage: SinkUsage[]; now: number }
type Act = (what: string) => void
type Item = { name: string; status: 'v1' | 'sink'; isLive?: boolean; draw: () => RenderChildren }
export type Group = { id: string; title: string; items: Item[] }

// Deterministic mock series so screenshots are stable.
const wave = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => Math.round(50 + 30 * Math.sin((i + seed) / 3) + ((i * 37 + seed * 11) % 17)))

const MOCK_AGENTS: AgentNode = {
  name: 'session',
  type: 'opus',
  status: 'running',
  children: [
    { name: 'explore auth flow', type: 'Explore', status: 'done' },
    {
      name: 'implement plan',
      type: 'general-purpose',
      status: 'running',
      children: [
        { name: 'task 1 · tokens', type: 'sonnet', status: 'done' },
        { name: 'task 2 · charts', type: 'sonnet', status: 'running' },
        { name: 'review', type: 'sonnet', status: 'failed' },
      ],
    },
  ],
}

const MOCK_CONTEXT = {
  window: 200_000,
  categories: [
    { name: 'system', tokens: 14_000 },
    { name: 'tools', tokens: 22_000 },
    { name: 'memory', tokens: 9_000 },
    { name: 'messages', tokens: 61_000 },
  ],
}

function mockCalls(now: number): SinkCall[] {
  const plan: [string, string, number, number, boolean?][] = [
    ['Read', 'app/Models/User.php', 0, 300],
    ['Grep', 'InvoiceService', 200, 900],
    ['Read', 'app/Services/InvoiceService.php', 950, 1200],
    ['Agent', 'explore auth flow', 1200, 7800],
    ['Edit', 'app/Services/InvoiceService.php', 8000, 8300],
    ['Bash', 'php artisan test', 8400, 12600, true],
    ['Edit', 'app/Services/InvoiceService.php', 12800, 13000],
    ['Bash', 'php artisan test', 13100, 16900],
  ]
  const t0 = now - 18_000
  return plan.map(([tool, target, from, to, isError], i) => ({
    id: `mock-${i}`,
    tool,
    target,
    startedAt: t0 + from,
    endedAt: t0 + to,
    isError,
  }))
}

function touches(calls: SinkCall[]): FileTouch[] {
  const by = new Map<string, FileTouch>()
  for (const call of calls) {
    const isRead = call.tool === 'Read'
    const isEdit = call.tool === 'Edit' || call.tool === 'Write' || call.tool === 'NotebookEdit'
    if (!call.target || (!isRead && !isEdit)) continue
    const f = by.get(call.target) ?? { path: call.target, reads: 0, edits: 0 }
    if (isRead) f.reads++
    else f.edits++
    by.set(call.target, f)
  }
  return [...by.values()]
}

function agentTree(calls: SinkCall[]): AgentNode | null {
  const agents = calls.filter(c => c.tool === 'Agent' || c.tool === 'Task')
  if (agents.length === 0) return null
  return {
    name: 'session',
    type: 'main',
    status: 'running',
    children: agents.map(a => ({
      name: a.target || 'subagent',
      type: 'Agent',
      status: a.isError ? 'failed' : a.endedAt === undefined ? 'running' : 'done',
    })),
  }
}

export function groups(el: El, width: number, live: Live, act: Act): Group[] {
  const { Text } = el
  const hasCalls = live.calls.length > 0
  const calls = hasCalls ? live.calls : mockCalls(live.now)
  const lastUsage = live.usage.at(-1)
  const hasUsage = lastUsage !== undefined
  const files = touches(calls)
  const tree = agentTree(live.calls)

  return [
    {
      id: 'data',
      title: '1 · Data at a glance',
      items: [
        { name: 'Sparkline', status: 'v1', draw: () => Sparkline(el, { values: wave(40, 1), width, label: 'req/min', format: n => String(n) }) },
        {
          name: 'Gauge',
          status: 'v1',
          draw: () => [
            Gauge(el, { label: 'context', value: 0.42, width }),
            Gauge(el, { label: 'weekly quota', value: 0.78, width }),
            Gauge(el, { label: 'budget', value: 0.94, width, detail: '$4.70 / $5' }),
          ],
        },
        {
          name: 'StatTile · KpiRow',
          status: 'v1',
          draw: () =>
            KpiRow(el, {
              width,
              tiles: [
                { label: 'Cost today', value: '$3.12', delta: 12, isGoodUp: false, trend: wave(20, 2), width: 0 },
                { label: 'Turns', value: '48', delta: 8, trend: wave(20, 5), width: 0 },
                { label: 'Tests', value: '212', delta: 3, trend: wave(20, 9), width: 0 },
              ],
            }),
        },
        {
          name: 'BarList',
          status: 'v1',
          draw: () =>
            BarList(el, {
              width,
              items: [
                { label: 'Read', value: 41 },
                { label: 'Bash', value: 23 },
                { label: 'Edit', value: 17 },
                { label: 'Grep', value: 9 },
                { label: 'Agent', value: 3 },
              ],
              format: n => `${n}×`,
            }),
        },
        { name: 'Heatmap', status: 'v1', draw: () => Heatmap(el, { days: wave(7 * 26, 3).map(v => (v % 5 === 0 ? 0 : v)), width, label: 'sessions · last 26 weeks' }) },
      ],
    },
    {
      id: 'observe',
      title: '2 · Agent observability',
      items: [
        { name: 'ToolTimeline', status: 'v1', isLive: hasCalls, draw: () => ToolTimeline(el, { calls, now: live.now, width }) },
        {
          name: 'TokenBurn',
          status: 'v1',
          isLive: hasUsage,
          draw: () =>
            TokenBurn(el, {
              width,
              points: hasUsage
                ? live.usage.map(u => ({ usd: u.usd, tokens: u.tokens }))
                : wave(14, 4).map((v, i) => ({ usd: (i + 1) * 0.05 + v / 2000, tokens: (i + 1) * 6000 })),
            }),
        },
        { name: 'SubagentTree', status: 'v1', isLive: tree !== null, draw: () => SubagentTree(el, { root: tree ?? MOCK_AGENTS, width }) },
        {
          name: 'ContextMap',
          status: 'v1',
          isLive: (lastUsage?.categories.length ?? 0) > 0,
          draw: () =>
            lastUsage && lastUsage.categories.length > 0
              ? ContextMap(el, { categories: lastUsage.categories, window: lastUsage.window, width })
              : ContextMap(el, { ...MOCK_CONTEXT, width }),
        },
        { name: 'FileTouchMap', status: 'v1', isLive: hasCalls && files.length > 0, draw: () => FileTouchMap(el, { files, width }) },
        {
          name: 'Status line preset',
          status: 'v1',
          isLive: hasUsage,
          draw: () => (
            <Text dimColor>
              {lastUsage ? `${fmtUsd(lastUsage.usd)} · ${Math.round((lastUsage.tokens / lastUsage.window) * 100)}% ctx` : '$0.42 · 61% ctx'}
            </Text>
          ),
        },
      ],
    },
    {
      id: 'code',
      title: '3 · Code & review',
      items: [
        { name: 'DiffCard', status: 'sink', draw: () => mock.DiffCard(el, { width, act }) },
        { name: 'FindingList', status: 'sink', draw: () => mock.FindingList(el, { width }) },
        { name: 'TestRun', status: 'sink', draw: () => mock.TestRun(el, { width }) },
        { name: 'CommitComposer', status: 'sink', draw: () => mock.CommitComposer(el, { act }) },
      ],
    },
    {
      id: 'decide',
      title: '4 · Decision & input',
      items: [
        { name: 'ChoiceCard', status: 'sink', draw: () => mock.ChoiceCard(el, { width, act }) },
        { name: 'TodoBoard', status: 'sink', draw: () => mock.TodoBoard(el, { width }) },
        { name: 'ConfirmBar', status: 'sink', draw: () => mock.ConfirmBar(el, { act }) },
        { name: 'FormPane', status: 'sink', draw: () => mock.FormPane(el) },
      ],
    },
    {
      id: 'skins',
      title: '5 · Engine-slot skins',
      items: [
        { name: 'ToolUse skin', status: 'sink', draw: () => mock.ToolUseSkin(el, { width }) },
        { name: 'Spinner pack', status: 'sink', draw: () => mock.SpinnerPack(el) },
        { name: 'ToolGroup summary', status: 'sink', draw: () => mock.ToolGroupSummary(el) },
        { name: 'PromptHint', status: 'sink', draw: () => mock.PromptHint(el) },
      ],
    },
    {
      id: 'layout',
      title: '6 · Layout & chrome',
      items: [
        { name: 'Table', status: 'sink', draw: () => mock.TableMock(el, { width }) },
        { name: 'KeyValue', status: 'sink', draw: () => mock.KeyValue(el) },
        { name: 'Badge · Pill', status: 'sink', draw: () => mock.Pills(el) },
        { name: 'EmptyState', status: 'sink', draw: () => mock.EmptyState(el) },
        { name: 'Toast presets', status: 'sink', draw: () => mock.ToastPresets(el, { act }) },
      ],
    },
  ]
}

/** One labelled specimen: name, v1/sink badge, live/mock tag, then the component. */
export function Specimen(el: El, item: Item) {
  const { Box, Text } = el
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box columnGap={1}>
        <Text bold>{item.name}</Text>
        <Text color={item.status === 'v1' ? tone.ok : tone.muted}>{item.status === 'v1' ? '[v1]' : '[sink only]'}</Text>
        {item.isLive !== undefined && (
          <Text color={item.isLive ? tone.info : tone.muted}>{item.isLive ? '● live' : '○ mock'}</Text>
        )}
      </Box>
      {item.draw()}
    </Box>
  )
}
