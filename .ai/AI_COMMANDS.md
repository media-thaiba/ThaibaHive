# AI Reusable Commands

To simplify onboarding and handoff transitions across different AI engines, use these standard instructions:

---

## 1. `/onboard`
*Trigger this prompt when launching a new AI session:*
```markdown
Read .ai/MACHINE_README.md, then follow the sequential read order.
Parse .ai/CURRENT_TASK.md and .ai/HANDOFF.md to understand active goals.
Output a short summary (2-3 sentences) showing you understand the context and are ready to proceed.
```

---

## 2. `/handoff`
*Trigger this prompt when ending a session:*
```markdown
Review all modified files. Verify compilation status.
Update .ai/CURRENT_TASK.md (completed items and next steps).
Update .ai/CHANGELOG.md with date and details of modified files.
Update .ai/HANDOFF.md with active compile status, issues, and next tasks.
Update .ai/PROJECT_STATE.json if the phase or tech dependencies shifted.
```

---

## 3. `/audit`
*Trigger this prompt to review project rules alignment:*
```markdown
Read the conventions inside .ai/rules/global/ and .ai/rules/framework/.
Examine the last 5 modified files in the codebase.
Identify any deviations from the conventions (e.g. raw HTML tags, missing requireAuth, relative imports, date formats).
Report a clean list of suggestions. Do not change code directly.
```

---

## 4. `/review`
*Trigger this prompt to review a pull request or code change:*
```markdown
Review the diff of the changes.
Ensure code quality, type-safety, and secure coding rules are met.
Check for hardcoded Tailwind colors, missing try/catch scopes, or unhandled errors.
Provide a summary report.
```
