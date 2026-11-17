# Sakura

A calm spring garden look for the Claude desktop and mobile apps. Cherry blossom petals drift down behind the conversation, a blossoming branch reaches in from the top right corner, and the colors follow your system's light or dark mode.

## What it does

- **Backdrop.** 53 petals fall at three depths: many small far ones, some mid-sized, and a few large soft ones up close. Each sways and tumbles as it falls, over a gradient sky with mist at the foot. Now and then a gust carries a cluster of petals across the screen.
- **Reacts to Claude.** Petals fall half as fast again while Claude is working, and a larger gust sweeps across when Claude finishes a turn.
- **Celebrates landings.** When Claude runs a merge or a push that succeeds (`gh pr merge`, `git merge`, `git push`), a burst of 36 petals sweeps across the whole scene. Merges and pushes made outside the session are not seen.
- **Light mode.** Blush-to-off-white paper, a warm brown branch, deep plum text and rose accents.
- **Dark mode.** An indigo-to-plum night garden with a faint moon behind a silhouetted branch, warm white text and sakura pink accents.
- **Readable.** A thin frosted layer sits between the scene and the conversation. Worst-case text contrast through it stays above 4.5:1 in both modes.
- **Quiet when you are.** The garden freezes after two minutes with no turn starting or ending (five minutes into a long turn) and picks up again at the next one. With reduced motion turned on in your system settings, it shows a still branch and a few resting petals instead.

The terminal and editor extensions draw no looks, so the mod does nothing there.

## Install

At the prompt of a terminal session:

```
/plugin install sakura --marketplace eszn/sakura-claude-mod
```

From a shell:

```
claude plugin install sakura --marketplace eszn/sakura-claude-mod
```

Answer `y` to add the marketplace, then choose a scope (the user scope loads it in every session).

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `eszn/sakura-claude-mod`, then Add plugin.

## Changing it

- `hooks/register.tsx` holds the colors, the frosted layer's blur and opacity, the petal speeds and the rest timings.
- `hooks/scene.js` draws the scene: petal counts and sizes, the branch, the sky, the gusts and the burst.
- `hooks/merges.js` decides which tool calls count as a merge or a push.
- `tests/garden.test.tsx` runs with `claude plugin test <folder>`.
