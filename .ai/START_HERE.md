# ThaibaHive AIOS Start Here (AIOS 2.0.0)

Welcome! As an AI agent working on ThaibaHive, you must initialize yourself by loading only the necessary files to conserve tokens:

## Onboarding Protocol (Lazy Loading / On-Demand)
1. Read [MACHINE_README.md](file:///d:/ThaibaHive/.ai/MACHINE_README.md) to understand basic boundaries.
2. Read [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) to parse project metadata.
3. Read [CURRENT_TASK.md](file:///d:/ThaibaHive/.ai/CURRENT_TASK.md) for the active sprint.
4. Read [HANDOFF.md](file:///d:/ThaibaHive/.ai/HANDOFF.md) to resume from the last agent's state.
5. **Lazy Load**: Search [CONTEXT_INDEX.md](file:///d:/ThaibaHive/.ai/CONTEXT_INDEX.md) to identify and load only the rule files, features, and maps directly relevant to your task.
6. Output a brief summary (2-3 sentences) showing you understand the context and are ready to proceed.

## Offboarding Protocol (End of Session)
Before ending your execution turn:
1. Ensure the project builds successfully and passes formatting/lint tests.
2. Update [CHANGELOG.md](file:///d:/ThaibaHive/.ai/CHANGELOG.md) with details of your changes.
3. Update [HANDOFF.md](file:///d:/ThaibaHive/.ai/HANDOFF.md) with active status, compile verification, and instructions for the next agent.
4. Update [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) if the project phase or task status has shifted.
