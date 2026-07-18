# AIOS Recovery Protocol

Follow these recovery steps if an AI session introduces regression, compilation breakage, or invalid directory restructures.

---

## 🚨 Trigger Conditions
- Compilation checks fail after multiple repair attempts.
- Git status reveals unauthorized deletion of migration scripts.
- Essential folders or components are modified or deleted without permission.

## 🛠️ Step-by-Step Recovery Flow

### Step 1: Stash or Discard Broken Changes
```bash
# To view modifications
git status

# To discard all uncommitted changes in tracked files
git restore .

# To clean untracked files added by the broken session
git clean -fd
```

### Step 2: Read Reference Context
- Read [DECISIONS.md](file:///d:/ThaibaHive/.ai/DECISIONS.md) to check why the broken choice was rejected.
- Read [SYSTEM_GUARDRAILS.md](file:///d:/ThaibaHive/.ai/SYSTEM_GUARDRAILS.md) to review coding limitations.

### Step 3: Compare Project State
- Check [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) to verify the expected status parameters.

### Step 4: Resume
- Run your onboarding commands and rewrite the target file, ensuring compilation validation at each step.
