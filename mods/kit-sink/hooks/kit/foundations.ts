import type { Elements } from 'claude-code'

/** The element table a component draws with: what `$.ui.resolve(e)` returns. */
export type El = Elements[keyof Elements]

/** Semantic colors. Names every surface understands. */
export const tone = {
  ok: 'green',
  warn: 'yellow',
  bad: 'red',
  info: 'cyan',
  accent: 'magenta',
  muted: 'gray',
} as const

export type Tone = keyof typeof tone

/** Distinct series colors, for stacked bars and legends. */
export const series = ['cyan', 'magenta', 'yellow', 'green', 'blue', 'red', 'white'] as const

const SPARK = '▁▂▃▄▅▆▇█'
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
const DENSITY = ' ░▒▓█'

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Resample `values` to `width` points (last value wins per bucket). */
export function resample(values: number[], width: number): number[] {
  if (values.length <= width) return values
  const out: number[] = []
  for (let i = 0; i < width; i++) {
    out.push(values[Math.floor(((i + 1) * values.length) / width) - 1] ?? 0)
  }
  return out
}

export function spark(values: number[], width = values.length): string {
  const points = resample(values, Math.max(1, width))
  if (points.length === 0) return ''
  const lo = Math.min(...points)
  const hi = Math.max(...points)
  const span = hi - lo || 1
  return points.map(v => SPARK[Math.round(((v - lo) / span) * (SPARK.length - 1))]).join('')
}

/** A horizontal bar `width` cells wide filled to `fraction`, with eighth-cell precision. */
export function bar(fraction: number, width: number, empty = '░'): string {
  const cells = clamp(fraction, 0, 1) * Math.max(0, width)
  const full = Math.floor(cells)
  const part = EIGHTHS[Math.round((cells - full) * 8) % 8]
  const used = full + (part ? 1 : 0)
  return '█'.repeat(full) + part + empty.repeat(Math.max(0, width - used))
}

/** One glyph for an intensity in 0..1. */
export const density = (fraction: number) =>
  DENSITY[Math.round(clamp(fraction, 0, 1) * (DENSITY.length - 1))]

export function truncate(text: string, width: number): string {
  if (width <= 0) return ''
  return text.length <= width ? text : text.slice(0, Math.max(0, width - 1)) + '…'
}

/** Keeps the end of a path, where the file name is. */
export function truncateStart(text: string, width: number): string {
  if (width <= 0) return ''
  return text.length <= width ? text : '…' + text.slice(text.length - width + 1)
}

export const pad = (text: string, width: number) => truncate(text, width).padEnd(width)

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(Math.round(n))
}

export const fmtUsd = (n: number) => `$${n.toFixed(n < 10 ? 2 : 0)}`

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m${Math.round((ms % 60_000) / 1000)}s`
}

export const pct = (fraction: number) => `${Math.round(fraction * 100)}%`
