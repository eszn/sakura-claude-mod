// Tells a merge or a push Claude runs from every other tool call. The mod sees
// only what runs in the session: one made on GitHub's site never reaches it.

// `gh pr merge`, or `git merge` with any options before the word (`git -C x merge`),
// but not `git merge-base` or `git mergetool`.
const MERGE_COMMAND = /\b(gh\s+pr\s+merge|git\s+(?:-\S+\s+\S+\s+)*merge)(?![-\w])/

// Forms of those commands that merge nothing now.
const MERGES_NOTHING = /--(abort|quit|auto|disable-auto)\b/

// A connector's own merge tool, such as `mcp__github__merge_pull_request`.
const MERGE_TOOL = /merge[-_]?(pull[-_]?request|pr)\b|pr[-_]merge\b/i

/** True when a tool call is a merge: `command` is a Bash call's, absent for any other tool. */
export function isMerge(tool, command) {
  if (tool === 'Bash') {
    return command !== undefined && MERGE_COMMAND.test(command) && !MERGES_NOTHING.test(command)
  }

  return MERGE_TOOL.test(tool)
}

// `git push` with any options before the word (`git -C x push`), and
// `gh repo create ... --push`, which pushes as it creates.
const PUSH_COMMAND = /\bgit\s+(?:-\S+\s+\S+\s+)*push(?![-\w])|\bgh\s+repo\s+create\b.*\s--push\b/

// A push that sends nothing.
const PUSHES_NOTHING = /\s(--dry-run|-n)\b/

// A connector's own push tool, such as `mcp__github__push_files`.
const PUSH_TOOL = /push[-_]files\b|git[-_]push\b/i

/** True when a tool call is a push: `command` is a Bash call's, absent for any other tool. */
export function isPush(tool, command) {
  if (tool === 'Bash') {
    return command !== undefined && PUSH_COMMAND.test(command) && !PUSHES_NOTHING.test(command)
  }

  return PUSH_TOOL.test(tool)
}
