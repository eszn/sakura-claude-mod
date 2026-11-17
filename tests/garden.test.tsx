import { expect, test } from 'claude-code/testing'

import { isMerge, isPush } from '../hooks/merges.js'
import { scene } from '../hooks/scene.js'

const BACKDROP = {
  plugin: 'sakura',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: 'sakura-garden', plugin: 'sakura', glass: { blur: 4, opacity: 0.6 } },
} as const

const NOW = 1_800_000_000_000

/** The timing rule the scene wrote for one animated element. */
const rule = (source: string, id: string) => source.match(new RegExp(`#${id}\\{animation:[^}]+`))?.[0]

test('the garden draws on desktop and mobile, inside the size an Svg takes', async ($, on) => {
  // Nothing sits beneath the plugin: these stand for the engine's clock and state.
  on('clock.now', () => ({ value: NOW }))
  on('state.get', () => ({ value: { value: undefined, version: 0 } }))

  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BACKDROP, surface })
    const svg = await ui.find({ type: 'Svg' })
    const source = String(svg?.props.source)

    expect(source.startsWith('<svg')).toBe(true)
    expect(source.length < 131072).toBe(true)
    expect(source.includes('prefers-color-scheme:dark')).toBe(true)
    expect(source.includes('prefers-reduced-motion:reduce')).toBe(true)
    expect(source.includes('<script')).toBe(false)
    await ui.unmount()
  }
})

/** The length and the head start of that rule's animation, in seconds. */
function timing(source: string, id: string): { length: number; start: number } {
  const [, length = '', start = ''] = rule(source, id)?.match(/ ([\d.]+)s \S+ (-?[\d.]+)s /) ?? []

  return { length: Number(length), start: Number(start) }
}

test('a redraw picks each petal up where it was, at either speed', () => {
  const calm = { phase: 100, at: NOW, speed: 1, gust: -1, burst: -1 }
  const first = timing(scene(calm, NOW), 'a0')
  const later = timing(scene(calm, NOW + 5000), 'a0')

  // Five seconds on, the first petal is five seconds further into the same fall.
  expect(later.length).toBe(first.length)
  expect(Math.abs(first.start - later.start - 5) < 0.02).toBe(true)

  // Working: the same place in the fall, on a clock half as fast again.
  const breezy = timing(scene({ phase: 105, at: NOW + 5000, speed: 1.5, gust: -1, burst: -1 }, NOW + 5000), 'a0')

  expect(Math.abs(breezy.length - later.length / 1.5) < 0.02).toBe(true)
  expect(Math.abs(breezy.start / breezy.length - later.start / later.length) < 0.001).toBe(true)
})

test('a gust shows only around the end of a turn, and rest stops every petal', () => {
  const quiet = scene({ phase: 100, at: NOW, speed: 1, gust: -1, burst: -1 }, NOW)
  const gusting = scene({ phase: 100, at: NOW, speed: 1, gust: 100, burst: -1 }, NOW + 2000)
  const longAfter = scene({ phase: 100, at: NOW, speed: 1, gust: 100, burst: -1 }, NOW + 60_000)
  const resting = scene({ phase: 100, at: NOW, speed: 0, gust: -1, burst: -1 }, NOW + 60_000)

  expect(quiet.includes('.tg{display:none}')).toBe(true)
  expect(gusting.includes('animation:once')).toBe(true)
  expect(longAfter.includes('.tg{display:none}')).toBe(true)
  expect(resting.includes('animation-play-state:paused')).toBe(true)
  // At rest the phase holds, so a petal is where it stopped a minute ago.
  expect(rule(resting, 'a0')).toBe(rule(quiet, 'a0'))
})

test('a merge burst shows only after a merge, apart from the turn-end gust', () => {
  const quiet = scene({ phase: 100, at: NOW, speed: 1.5, gust: -1, burst: -1 }, NOW)
  const bursting = scene({ phase: 100, at: NOW, speed: 1.5, gust: -1, burst: 100 }, NOW + 2000)
  const longAfter = scene({ phase: 100, at: NOW, speed: 1.5, gust: -1, burst: 100 }, NOW + 60_000)

  expect(quiet.includes('.mb{display:none}')).toBe(true)
  expect(bursting.includes('.mb{display:none}')).toBe(false)
  expect(bursting.includes('.tg{display:none}')).toBe(true)
  expect(longAfter.includes('.mb{display:none}')).toBe(true)
  expect(bursting.length < 131072).toBe(true)
})

test('only a merge that happens now counts as one', () => {
  for (const command of [
    'gh pr merge 12 --squash',
    'git merge feature/petals',
    'git -C ../site merge --no-ff main',
    'git fetch && git merge origin/main',
    'git merge --continue',
  ]) {
    expect(isMerge('Bash', command)).toBe(true)
  }

  for (const command of [
    'git merge-base main HEAD',
    'git mergetool',
    'git merge --abort',
    'gh pr merge 12 --auto',
    'git log --merges',
    'echo merge',
  ]) {
    expect(isMerge('Bash', command)).toBe(false)
  }

  expect(isMerge('mcp__github__merge_pull_request')).toBe(true)
  expect(isMerge('Edit')).toBe(false)
})

test('only a push that sends something counts as one', () => {
  for (const command of [
    'git push',
    'git push -u origin main',
    'git -C ../site push --force-with-lease',
    'git commit -m "petals" && git push',
    'gh repo create me/garden --public --source . --push',
  ]) {
    expect(isPush('Bash', command)).toBe(true)
  }

  for (const command of [
    'git push --dry-run',
    'git push -n origin main',
    'git stash push',
    'git log --pushed',
    'gh repo create me/garden --public',
    'echo push',
  ]) {
    expect(isPush('Bash', command)).toBe(false)
  }

  expect(isPush('mcp__github__push_files')).toBe(true)
  expect(isPush('Edit')).toBe(false)
})
