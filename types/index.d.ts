/**
 * How the petals are moving. `phase` counts seconds of motion at calm speed,
 * so a redraw at any later moment puts every petal where it would have been.
 */
export type Breeze = {
  /** Seconds of calm-speed motion gone by when `at` was read. */
  phase: number
  /** When `phase` was measured, in milliseconds since the epoch. */
  at: number
  /** 1 calm, above 1 while Claude works, 0 while the garden rests. */
  speed: number
  /** The `phase` at which the last turn-end gust set off; -1 for none yet. */
  gust: number
  /** The `phase` at which the last burst, for a merge or a push, set off; -1 for none yet. */
  burst: number
}

declare module 'claude-code' {
  interface PluginState {
    sakura: { breeze: Shaped<Breeze> }
  }
}
