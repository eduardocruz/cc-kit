import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { SinkCall, SinkUsage } from '../types'
import { groups, Specimen } from './kit/sections'

const PANE = 'kit-sink'
const SEEN_KEY = 'kit-sink.hinted'
const GROUPS = ['all', 'data', 'observe', 'code', 'decide', 'skins', 'layout']

const tab = atom({ plugin: 'kit-sink', key: 'tab' } as const, 'all')
const calls = atom({ plugin: 'kit-sink', key: 'calls' } as const, [])
const usage = atom({ plugin: 'kit-sink', key: 'usage' } as const, [])

/** The argument a tool call acts on, for timeline labels and file touches. */
function targetOf(e: object): string {
  const args = e as Record<string, unknown>
  for (const field of ['file_path', 'notebook_path', 'pattern', 'description', 'command', 'url', 'query']) {
    if (typeof args[field] === 'string') return args[field] as string
  }
  return ''
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'kit',
      description: 'cc-kit: `/kit sink` opens the kitchen sink of every candidate component',
      argumentHint: 'sink [all|data|observe|code|decide|skins|layout]',
    })

    // The Pane never opens unasked (it would wait below 144 columns); hint once instead.
    if (!(await $.store.get(SEEN_KEY))) {
      $.ui.toast('cc-kit installed: run /kit sink to see every component')
      await $.store.set(SEEN_KEY, true)
    }

    return next(e)
  })

  on('command.run', { command: 'kit' }, async ($, e) => {
    const [sub = 'sink', group] = e.args.trim().split(/\s+/).filter(Boolean)
    if (sub !== 'sink') return { text: `Unknown /kit command "${sub}". Try /kit sink.` }
    if (group && !GROUPS.includes(group)) return { text: `Unknown group "${group}". One of: ${GROUPS.join(', ')}.` }

    if (group) await update($, tab, () => group)
    await $.ui.open({ id: PANE, title: 'cc-kit · kitchen sink' })

    return { text: 'Kitchen sink opened.' }
  })

  // Live collector: every tool call, with its timing and outcome.
  on('tool.call', async ($, e, next) => {
    const call: SinkCall = {
      id: e.tool_use_id ?? `${e.tool}-${await $.clock.now()}`,
      tool: e.tool,
      target: targetOf(e),
      startedAt: await $.clock.now(),
    }
    await update($, calls, list => [...list, call].slice(-200))
    const ran = await next(e)
    const endedAt = await $.clock.now()
    const isError = 'deny' in ran || ran.isError === true
    await update($, calls, list => list.map(one => (one.id === call.id ? { ...one, endedAt, isError } : one)))

    return ran
  })

  // Live collector: session usage after every turn.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage({ breakdown: 'summary' })
    const point: SinkUsage = {
      at: await $.clock.now(),
      tokens: u.context.tokens ?? 0,
      window: u.context.window,
      usd: u.cost?.usd ?? 0,
      categories: (u.context.breakdown?.categories ?? [])
        .filter(c => !c.isDeferred && c.tokens > 0 && !/free space/i.test(c.name))
        .map(c => ({ name: c.name, tokens: c.tokens })),
    }
    await update($, usage, list => [...list, point].slice(-100))

    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const el = $.ui.resolve(e)
    const { Box, Text, Button } = el
    const width = Math.max(30, e.props.bodyColumns - 2)
    const current = await read($, tab)
    const live = { calls: await read($, calls), usage: await read($, usage), now: await $.clock.now() }
    const act = (what: string) => $.ui.toast(what)
    const all = groups(el, width, live, act)
    const shown = current === 'all' ? all : all.filter(g => g.id === current)
    const tabs = [{ id: 'all', label: 'All' }, ...all.map(g => ({ id: g.id, label: g.title.split(' · ')[1] }))]
    const v1 = all.flatMap(g => g.items).filter(i => i.status === 'v1').length
    const total = all.flatMap(g => g.items).length

    return (
      <Box flexDirection="column">
        <Text dimColor>
          {total} components · {v1} planned for v1 · the rest are mocks to judge
        </Text>
        <Box flexWrap="wrap" columnGap={1} marginBottom={1}>
          {tabs.map((t, i) => (
            <Button
              key={`tab-${t.id}`}
              label={t.label}
              hotkey={String(i)}
              variant={t.id === current ? 'primary' : 'secondary'}
              onPress={() => update($, tab, () => t.id)}
            />
          ))}
        </Box>
        {shown.map(g => (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="magenta">
              {g.title}
            </Text>
            <Text dimColor>{'─'.repeat(Math.min(width, 60))}</Text>
            {g.items.map(item => Specimen(el, item))}
          </Box>
        ))}
      </Box>
    )
  })
}
