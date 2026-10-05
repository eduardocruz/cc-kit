// Groups 3–6: rough mocks, drawn so they can be judged before being built properly.
import { Gauge } from './data'
import { pad, tone, truncateStart, type El } from './foundations'

type Act = (what: string) => void

export function Badge(el: El, p: { text: string; tone?: keyof typeof tone }) {
  const { Text } = el
  return (
    <Text backgroundColor={tone[p.tone ?? 'info']} color="black" bold>
      {' '}
      {p.text}{' '}
    </Text>
  )
}

// ── 3 Code & review ────────────────────────────────────────────

export function DiffCard(el: El, p: { width: number; act: Act }) {
  const { Box, Text, Button, Code } = el
  const source = [
    '@@ -12,6 +12,9 @@ class InvoiceService',
    '     public function total(): int',
    '     {',
    '-        return $this->lines->sum("amount");',
    '+        return $this->lines',
    '+            ->reject->isVoided()',
    '+            ->sum("amount");',
    '     }',
  ].join('\n')
  return (
    <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1} width={p.width}>
      <Box justifyContent="space-between">
        <Text bold>{truncateStart('app/Services/InvoiceService.php', p.width - 14)}</Text>
        <Box>
          <Text color={tone.ok}>+3 </Text>
          <Text color={tone.bad}>−1</Text>
        </Box>
      </Box>
      <Code source={source} format="diff" language="php" />
      <Box columnGap={1}>
        <Button key="diff-accept" label="Accept" variant="primary" onPress={() => p.act('Accepted diff')} />
        <Button key="diff-reject" label="Reject" onPress={() => p.act('Rejected diff')} />
      </Box>
    </Box>
  )
}

export function FindingList(el: El, p: { width: number }) {
  const { Box, Text } = el
  const findings: { sev: 'bad' | 'warn' | 'info'; label: string; where: string; text: string }[] = [
    { sev: 'bad', label: 'HIGH', where: 'routes/web.php:42', text: 'Debug route reachable without auth' },
    { sev: 'warn', label: 'MED', where: 'app/Jobs/Sync.php:88', text: 'Retries forever on 4xx' },
    { sev: 'info', label: 'LOW', where: 'resources/js/app.tsx:7', text: 'Unused import' },
  ]
  return (
    <Box flexDirection="column">
      {findings.map(f => (
        <Box columnGap={1}>
          {Badge(el, { text: f.label.padEnd(4), tone: f.sev })}
          <Text>{pad(f.text, Math.max(10, p.width - 30))}</Text>
          <Text dimColor>{f.where}</Text>
        </Box>
      ))}
    </Box>
  )
}

export function TestRun(el: El, p: { width: number }) {
  const { Box, Text } = el
  const dots = '••••••••••••✗••••••••••••••••••✗••••••••○○'
  return (
    <Box flexDirection="column">
      <Box>
        {[...dots.slice(0, p.width)].map(d => (
          <Text color={d === '✗' ? tone.bad : d === '○' ? tone.muted : tone.ok}>{d}</Text>
        ))}
      </Box>
      <Box columnGap={2}>
        <Text color={tone.ok}>38 passed</Text>
        <Text color={tone.bad}>2 failed</Text>
        <Text dimColor>2 skipped · 4.1s</Text>
      </Box>
      <Text color={tone.bad}>✗ InvoiceTest › total ignores voided lines</Text>
    </Box>
  )
}

export function CommitComposer(el: El, p: { act: Act }) {
  const { Box, Text, Button } = el
  return (
    <Box flexDirection="column">
      <Text>
        <Text color={tone.ok}>☑</Text> app/Services/InvoiceService.php
      </Text>
      <Text>
        <Text color={tone.ok}>☑</Text> tests/Unit/InvoiceTest.php
      </Text>
      <Text dimColor>☐ CHANGELOG.md</Text>
      <Text>
        <Text dimColor>message › </Text>Exclude voided lines from invoice totals▌
      </Text>
      <Button key="commit" label="Commit 2 files" variant="primary" onPress={() => p.act('Committed (mock)')} />
    </Box>
  )
}

// ── 4 Decision & input ─────────────────────────────────────────

export function ChoiceCard(el: El, p: { width: number; act: Act }) {
  const { Box, Text, Button } = el
  const options = [
    { id: 'a', label: 'Copy-in registry', note: 'own the source, no version hell', isRecommended: true },
    { id: 'b', label: 'Dependency plugin', note: 'one source of truth, no tweaks' },
    { id: 'c', label: 'Both', note: 'more to maintain' },
  ]
  return (
    <Box flexDirection="column">
      <Text bold>How should authors consume the kit?</Text>
      {options.map((o, i) => (
        <Box columnGap={1}>
          <Button key={`choice-${o.id}`} label={`${i + 1}`} plain onPress={() => p.act(`Chose ${o.label}`)} />
          <Text bold={o.isRecommended}>{o.label}</Text>
          {o.isRecommended && Badge(el, { text: 'recommended', tone: 'ok' })}
          <Text dimColor>{o.note}</Text>
        </Box>
      ))}
    </Box>
  )
}

export function TodoBoard(el: El, p: { width: number }) {
  const { Box, Text } = el
  const todos = [
    { text: 'Scaffold kit-sink', state: 'done' },
    { text: 'Data components', state: 'done' },
    { text: 'Observability components', state: 'active' },
    { text: 'Tests on terminal + desktop', state: 'todo' },
  ]
  const done = todos.filter(t => t.state === 'done').length
  return (
    <Box flexDirection="column">
      {Gauge(el, { label: 'progress', value: done / todos.length, width: p.width, detail: `${done}/${todos.length}`, warnAt: 2, badAt: 2 })}
      {todos.map(t => (
        <Text
          color={t.state === 'active' ? tone.warn : undefined}
          dimColor={t.state === 'done'}
          strikethrough={t.state === 'done'}
        >
          {t.state === 'done' ? '☑' : t.state === 'active' ? '◐' : '☐'} {t.text}
        </Text>
      ))}
    </Box>
  )
}

export function ConfirmBar(el: El, p: { act: Act }) {
  const { Box, Text, Button } = el
  return (
    <Box borderStyle="round" borderColor={tone.bad} paddingX={1} justifyContent="space-between">
      <Text>
        <Text color={tone.bad} bold>
          Delete 3 merged branches?
        </Text>
        <Text dimColor> feat/x, fix/y, chore/z</Text>
      </Text>
      <Box columnGap={1}>
        <Button key="confirm-yes" label="Delete" variant="primary" onPress={() => p.act('Deleted (mock)')} />
        <Button key="confirm-no" label="Cancel" role="dismiss" onPress={() => p.act('Cancelled')} />
      </Box>
    </Box>
  )
}

export function FormPane(el: El) {
  const { Box, Text } = el
  const fields: [string, string][] = [
    ['Project', 'cc-kit'],
    ['License', 'MIT ▾'],
    ['Surfaces', '☑ terminal  ☑ desktop  ☐ mobile'],
  ]
  return (
    <Box flexDirection="column">
      {fields.map(([label, value]) => (
        <Box>
          <Text dimColor>{pad(label, 10)}</Text>
          <Text underline>{value}</Text>
        </Box>
      ))}
    </Box>
  )
}

// ── 5 Engine-slot skins ────────────────────────────────────────

export function ToolUseSkin(el: El, p: { width: number }) {
  const { Box, Text } = el
  const rows = [
    { icon: '◇', tool: 'Read', arg: 'app/Models/User.php', meta: '42ms', color: tone.info },
    { icon: '✎', tool: 'Edit', arg: 'app/Models/User.php', meta: '+3 −1', color: tone.warn },
    { icon: '$', tool: 'Bash', arg: 'php artisan test --filter=User', meta: '4.1s', color: tone.accent },
    { icon: '✗', tool: 'Bash', arg: 'npm run build', meta: 'exit 1', color: tone.bad },
  ]
  return (
    <Box flexDirection="column">
      {rows.map(r => (
        <Box>
          <Text color={r.color}>{r.icon} </Text>
          <Text bold>{pad(r.tool, 5)}</Text>
          <Text>{pad(r.arg, Math.max(10, p.width - 16))}</Text>
          <Text dimColor> {r.meta}</Text>
        </Box>
      ))}
    </Box>
  )
}

export function SpinnerPack(el: El) {
  const { Box, Text } = el
  const packs: [string, string][] = [
    ['braille', '⣾⣽⣻⢿⡿⣟⣯⣷'],
    ['moon', '◐◓◑◒'],
    ['pulse', '·•●•'],
    ['bar', '▁▃▅▇▅▃'],
  ]
  return (
    <Box flexDirection="column">
      {packs.map(([name, frames]) => (
        <Box>
          <Text dimColor>{pad(name, 9)}</Text>
          <Text color={tone.accent}>{frames.split('').join(' ')}</Text>
        </Box>
      ))}
      <Text color={tone.accent}>✻ Untangling… </Text>
    </Box>
  )
}

export function ToolGroupSummary(el: El) {
  const { Box, Text } = el
  return (
    <Box columnGap={1}>
      <Text color={tone.info}>⏺</Text>
      <Text>Read 14 files</Text>
      <Text dimColor>·</Text>
      <Text>Grep ×3</Text>
      <Text dimColor>·</Text>
      <Text>Edit ×2</Text>
      <Text dimColor>· 1.8s</Text>
    </Box>
  )
}

export function PromptHint(el: El) {
  const { Text } = el
  return (
    <Text dimColor italic>
      tip › /observatory opens the live timeline · ⇧⇥ cycles modes
    </Text>
  )
}

// ── 6 Layout & chrome ──────────────────────────────────────────

export function TableMock(el: El, p: { width: number }) {
  const { Box, Text } = el
  const head = ['Component', 'Group', 'v1']
  const rows = [
    ['Sparkline', 'data', '✓'],
    ['ToolTimeline', 'observe', '✓'],
    ['DiffCard', 'code', '—'],
  ]
  const w = Math.max(8, Math.floor((p.width - 2) / 3))
  return (
    <Box flexDirection="column">
      <Text bold>{head.map(c => pad(c, w)).join(' ')}</Text>
      <Text dimColor>{'─'.repeat(Math.min(p.width, w * 3 + 2))}</Text>
      {rows.map(r => (
        <Text>{r.map(c => pad(c, w)).join(' ')}</Text>
      ))}
    </Box>
  )
}

export function KeyValue(el: El) {
  const { Box, Text } = el
  const pairs: [string, string][] = [
    ['model', 'opus-5.5'],
    ['branch', 'main ↑2'],
    ['surface', 'terminal'],
  ]
  return (
    <Box flexDirection="column">
      {pairs.map(([k, v]) => (
        <Box>
          <Text dimColor>{pad(k, 9)}</Text>
          <Text>{v}</Text>
        </Box>
      ))}
    </Box>
  )
}

export function Pills(el: El) {
  const { Box } = el
  return (
    <Box columnGap={1} flexWrap="wrap">
      {Badge(el, { text: 'passing', tone: 'ok' })}
      {Badge(el, { text: 'flaky', tone: 'warn' })}
      {Badge(el, { text: 'failing', tone: 'bad' })}
      {Badge(el, { text: 'v0.1', tone: 'info' })}
      {Badge(el, { text: 'beta', tone: 'accent' })}
    </Box>
  )
}

export function EmptyState(el: El) {
  const { Box, Text } = el
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text dimColor>╭─╮</Text>
      <Text dimColor>╰─╯</Text>
      <Text bold>Nothing here yet</Text>
      <Text dimColor>Run a tool and it shows up.</Text>
    </Box>
  )
}

export function ToastPresets(el: El, p: { act: Act }) {
  const { Box, Button } = el
  return (
    <Box columnGap={1} flexWrap="wrap">
      <Button key="toast-ok" label="✓ success" onPress={() => p.act('✓ Deployed in 41s')} />
      <Button key="toast-warn" label="⚠ warn" onPress={() => p.act('⚠ Context at 82%')} />
      <Button key="toast-bad" label="✗ error" onPress={() => p.act('✗ Build failed: exit 1')} />
    </Box>
  )
}
