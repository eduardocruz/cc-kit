import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const clock = (on: On) => mock.clock(on, { now: 1_700_000_000_000 })

const SURFACES = ['terminal', 'desktop'] as const

const pane = (bodyColumns: number) => ({
  component: 'Pane' as const,
  requestId: 'kit-sink',
  props: {
    title: 'cc-kit · kitchen sink',
    isFocused: true,
    bodyColumns,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
})

test('the sink draws every group on every surface', async ($, on) => {
  clock(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'kit-sink', surface, ...pane(100) })
    for (const name of ['Sparkline', 'ToolTimeline', 'DiffCard', 'ChoiceCard', 'Spinner pack', 'EmptyState']) {
      expect(await ui.find({ type: 'Text', text: name })).toBeDefined()
    }
    await ui.unmount()
  }
})

test('a tab narrows the sink to its group', async ($, on) => {
  clock(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'kit-sink', surface, ...pane(100) })
    await ui.press({ key: 'tab-code' })
    expect(await ui.find({ type: 'Text', text: 'DiffCard' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'ToolTimeline' })).toBeUndefined()
    await ui.press({ key: 'tab-all' })
    await ui.unmount()
  }
})

test('a narrow pane still draws', async ($, on) => {
  clock(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'kit-sink', surface, ...pane(34) })
    expect(await ui.find({ type: 'Text', text: 'Heatmap' })).toBeDefined()
    await ui.unmount()
  }
})

test('observability shows mock data until a tool runs, then live', async ($, on) => {
  clock(on)
  on('tool.call', () => ({ result: 'ok' }) as never)

  const before = await $.ui.mount({ plugin: 'kit-sink', surface: 'terminal', ...pane(100) })
  expect(await before.find({ type: 'Text', text: /○ mock/ })).toBeDefined()
  await before.unmount()

  await $.tool.call({ tool: 'Read', file_path: '/repo/app/Billing.php' } as never)

  const after = await $.ui.mount({ plugin: 'kit-sink', surface: 'terminal', ...pane(100) })
  expect(await after.find({ type: 'Text', text: /● live/ })).toBeDefined()
  expect(await after.find({ type: 'Text', text: /Billing\.php/ })).toBeDefined()
  await after.unmount()
})
