import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import { makeColors } from './make-colors.js'
import { isMerge, isPush } from './merges.js'
import { phaseAt, scene } from './scene.js'

const SCENE = 'sakura-garden'

/** Petal speed: calm between turns, a little quicker while Claude works, 0 at rest. */
const CALM = 1
const BREEZY = 1.5
const AT_REST = 0

/** The garden rests after this long with nothing happening in the session. */
const QUIET_MS = 2 * 60_000
/** A turn that runs this long is likely unwatched, so the garden rests until it ends. */
const LONG_TURN_MS = 5 * 60_000

// Pale pink paper by day, a moonlit garden by night. With both halves given and
// no override, the app picks the half that matches the person's own mode.
const { theme, problems } = makeColors({
  label: 'Sakura',
  roles: { accent: '#c9476f', danger: '#b83b46', success: '#4c7f4f', warning: '#a8721c', pro: '#7b58a0' },
  light: {
    git: { merged: '#b8457c' },
    gray: {
      anchors: {
        'surface-0': '#faecec',
        'surface-1': '#fcf2f0',
        'surface-2': '#fef9f5',
        'text-primary': '#33202e',
        'text-secondary': '#523d4c',
        'text-muted': '#5a4554',
      },
    },
  },
  dark: {
    roles: { accent: '#f2a3bd' },
    git: { merged: '#f0a0c2' },
    gray: {
      anchors: {
        'surface-0': '#17152c',
        'surface-1': '#1e1a34',
        'surface-2': '#241f39',
        'surface-3': '#27213c',
        'text-primary': '#f6ede7',
        'text-secondary': '#d6c9d0',
        'text-muted': '#c4b7c4',
      },
    },
  },
})

// The glass is the frosted layer between the petals and the words. No tint is
// named, so each panel keeps the look's own surface color in either mode.
const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE, glass: { blur: 4, opacity: 0.6 } },
}

const breeze = atom({ plugin: 'sakura', key: 'breeze' } as const, { phase: 0, at: 0, speed: CALM, gust: -1, burst: -1 }, {
  shape: 'breeze-2',
})

// A reload starts this over, and `session.start` sets it again.
let rest: Timer | undefined

/** Changes the breeze from now on, keeping every petal where it is. */
async function blow($: EngineInterface, speed: number, setsOff?: 'gust' | 'burst'): Promise<void> {
  const now = await $.clock.now()

  await update($, breeze, was => {
    const phase = phaseAt(was, now)

    return {
      phase,
      at: now,
      speed,
      gust: setsOff === 'gust' ? phase : was.gust,
      burst: setsOff === 'burst' ? phase : was.burst,
    }
  })
}

/** Lets the garden rest once `ms` pass with no turn starting or ending. */
function restAfter($: EngineInterface, ms: number): void {
  rest?.cancel()
  rest = $.clock.after(ms, () => {
    void blow($, AT_REST)
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // While you build: the line that would stop Desktop painting this look.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await $.theme.set(LOOK)
    await blow($, CALM)
    restAfter($, QUIET_MS)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    await blow($, BREEZY)
    restAfter($, LONG_TURN_MS)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    const done = await next(e)

    await blow($, CALM, e.reason === 'answer' ? 'gust' : undefined)
    restAfter($, QUIET_MS)

    return done
  })

  // A merge or a push Claude runs sets off a burst once it has gone through. One
  // that fails, or that a guard refused, sets off nothing.
  on('tool.call', async ($, e, next) => {
    const command = e.tool === 'Bash' ? e.command : undefined
    const isLanding = isMerge(e.tool, command) || isPush(e.tool, command)
    const ran = await next(e)

    if (isLanding && ran.deny === undefined && ran.isError !== true) {
      await blow($, BREEZY, 'burst')
      restAfter($, LONG_TURN_MS)
    }

    return ran
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)
    const now = await $.clock.now()
    const source = scene(await read($, breeze), now)

    return (
      <Svg
        source={source}
        alt="Cherry blossom petals drifting down past a blossoming branch, with mist below"
        isInteractive
      />
    )
  })
}
