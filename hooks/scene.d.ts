import type { Breeze } from '../types'

/** The breeze's phase at `now`: seconds of calm-speed motion gone by. */
export function phaseAt(breeze: Breeze, now: number): number

/** The whole scene as one SVG document, with every petal where `breeze` puts it at `now`. */
export function scene(breeze: Breeze, now: number): string
