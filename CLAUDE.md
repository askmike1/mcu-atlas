# Project Instructions for Claude Code

## Git Workflow

**Branching:** `type/short-description` (e.g. `feat/login-page`, `fix/null-pointer-auth`).
Valid types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.

**Commits:** Conventional Commits format — `type(scope): summary`
- Example: `feat(auth): add password reset flow`
- Example: `fix(api): handle null response from user endpoint`
- Keep the summary line under 72 characters. Add a body only if the change needs explanation beyond the summary.

**Pushing:** Claude commits but does **not** push. Leave the branch ready locally; the user pushes manually.

### Rules for running git commands
- Do **not** run `git status`, `git diff`, or `git log` before or after a commit unless something failed or the user asks for it. Assume the working tree matches the changes just made.
- Batch git operations into a single command using `&&` rather than separate tool calls, e.g.:
  `git checkout -b feat/login-page && git add -A && git commit -m "feat(auth): add login page"`
- Do not inspect commit history for style — always use the Conventional Commits format above.
- Do not run `git push`, `git push --force`, or any remote-mutating command under any circumstances.
- If a commit fails (e.g. pre-commit hook), report the error directly rather than running additional diagnostic commands first.

## General Efficiency
- Don't re-explore files or directories already read earlier in the same session.
- Prefer targeted reads/greps over broad directory scans when the user names a specific file or feature.
