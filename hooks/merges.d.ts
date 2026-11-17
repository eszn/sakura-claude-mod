/** True when a tool call is a merge: `command` is a Bash call's, absent for any other tool. */
export function isMerge(tool: string, command?: string): boolean

/** True when a tool call is a push: `command` is a Bash call's, absent for any other tool. */
export function isPush(tool: string, command?: string): boolean
