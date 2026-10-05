import { bar, density, fmtTokens, pad, spark, tone, truncate, type El, type Tone } from './foundations'

/** ▁▂▃▅▇ trend line, optionally labelled with its last value. */
export function Sparkline(
  el: El,
  p: { values: number[]; width: number; color?: string; label?: string; format?: (n: number) => string },
) {
  const { Box, Text } = el
  const last = p.values[p.values.length - 1] ?? 0
  const suffix = p.format ? ` ${p.format(last)}` : ''
  const room = Math.max(4, p.width - (p.label ? p.label.length + 1 : 0) - suffix.length)

  return (
    <Box>
      {p.label && <Text dimColor>{p.label} </Text>}
      <Text color={p.color ?? tone.info}>{spark(p.values, room)}</Text>
      {suffix && <Text bold>{suffix}</Text>}
    </Box>
  )
}

/** label ███████░░░ 61%, colored by the threshold it crossed. */
export function Gauge(
  el: El,
  p: { label: string; value: number; width: number; warnAt?: number; badAt?: number; detail?: string },
) {
  const { Box, Text } = el
  const level: Tone = p.value >= (p.badAt ?? 0.9) ? 'bad' : p.value >= (p.warnAt ?? 0.7) ? 'warn' : 'ok'
  const right = p.detail ?? `${Math.round(p.value * 100)}%`
  const labelWidth = Math.min(14, Math.max(6, Math.floor(p.width / 4)))
  const barWidth = Math.max(4, p.width - labelWidth - right.length - 2)

  return (
    <Box>
      <Text dimColor>{pad(p.label, labelWidth)} </Text>
      <Text color={tone[level]}>{bar(p.value, barWidth)}</Text>
      <Text bold> {right}</Text>
    </Box>
  )
}

/** A bordered KPI: label, big value, delta arrow, optional trend. */
export function StatTile(
  el: El,
  p: { label: string; value: string; delta?: number; isGoodUp?: boolean; trend?: number[]; width: number },
) {
  const { Box, Text } = el
  const inner = Math.max(8, p.width - 4)
  const isUp = (p.delta ?? 0) >= 0
  const isGood = isUp === (p.isGoodUp ?? true)

  return (
    <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1} width={p.width}>
      <Text dimColor>{truncate(p.label, inner)}</Text>
      <Box>
        <Text bold>{p.value}</Text>
        {p.delta !== undefined && (
          <Text color={isGood ? tone.ok : tone.bad}>
            {' '}
            {isUp ? '▲' : '▼'} {Math.abs(p.delta)}%
          </Text>
        )}
      </Box>
      {p.trend && <Text color={tone.info}>{spark(p.trend, inner)}</Text>}
    </Box>
  )
}

/** A row of StatTiles that wraps when narrow. */
export function KpiRow(el: El, p: { tiles: Parameters<typeof StatTile>[1][]; width: number }) {
  const { Box } = el
  const perRow = Math.max(1, Math.min(p.tiles.length, Math.floor(p.width / 20)))
  const tileWidth = Math.floor(p.width / perRow) - 1

  return (
    <Box flexWrap="wrap" columnGap={1}>
      {p.tiles.map(tile => StatTile(el, { ...tile, width: tileWidth }))}
    </Box>
  )
}

/** Ranked horizontal bars: label, bar, value. */
export function BarList(
  el: El,
  p: { items: { label: string; value: number }[]; width: number; color?: string; format?: (n: number) => string },
) {
  const { Box, Text } = el
  const format = p.format ?? fmtTokens
  const max = Math.max(1, ...p.items.map(item => item.value))
  const labelWidth = Math.min(18, Math.max(6, Math.floor(p.width / 3)))
  const valueWidth = Math.max(...p.items.map(item => format(item.value).length), 1)
  const barWidth = Math.max(4, p.width - labelWidth - valueWidth - 2)

  return (
    <Box flexDirection="column">
      {p.items.map(item => (
        <Box>
          <Text>{pad(item.label, labelWidth)} </Text>
          <Text color={p.color ?? tone.accent}>{bar(item.value / max, barWidth, ' ')}</Text>
          <Text dimColor> {format(item.value).padStart(valueWidth)}</Text>
        </Box>
      ))}
    </Box>
  )
}

/** GitHub-style activity grid: 7 rows (days) × N columns (weeks). */
export function Heatmap(el: El, p: { days: number[]; width: number; color?: string; label?: string }) {
  const { Box, Text } = el
  const weeks = Math.max(1, Math.min(Math.ceil(p.days.length / 7), p.width - 4))
  const recent = p.days.slice(-weeks * 7)
  const max = Math.max(1, ...recent)
  const names = ['M', ' ', 'W', ' ', 'F', ' ', 'S']
  const rows = names.map((name, day) => {
    let line = ''
    for (let week = 0; week < weeks; week++) {
      const value = recent[week * 7 + day] ?? 0
      line += value === 0 ? '·' : density(0.25 + (0.75 * value) / max)
    }
    return { name, line }
  })

  return (
    <Box flexDirection="column">
      {p.label && <Text dimColor>{p.label}</Text>}
      {rows.map(row => (
        <Box>
          <Text dimColor>{row.name} </Text>
          <Text color={p.color ?? tone.ok}>{row.line}</Text>
        </Box>
      ))}
    </Box>
  )
}
