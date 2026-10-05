export type SinkCall = {
  id: string
  tool: string
  target: string
  startedAt: number
  endedAt?: number
  isError?: boolean
}

export type SinkCategory = { name: string; tokens: number }

export type SinkUsage = {
  at: number
  tokens: number
  window: number
  usd: number
  categories: SinkCategory[]
}

declare module 'claude-code' {
  interface PluginState {
    'kit-sink': { tab: string; calls: SinkCall[]; usage: SinkUsage[] }
  }
}
