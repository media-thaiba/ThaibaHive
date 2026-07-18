# Flutter Prompts Template

Copy and execute these prompt templates when generating Flutter components.

---

## Model Prompts

### 1. Generating Riverpod State Providers
```markdown
Create a new Flutter state notifier for the [FeatureName] module using Riverpod generator syntax.
Requirements:
1. State model must be immutable, defined via @freezed.
2. Extend AsyncNotifier and implement async build method.
3. Keep logic decoupled from widgets.
4. Include pull-to-refresh reload handler.
```

### 2. Form Handling and Routing
```markdown
Generate a new user form layout for [FormPurpose] in Flutter.
Requirements:
1. Use standard Form and TextFormField widgets.
2. Implement validation rules.
3. Hook into GoRouter path `/path` for navigation.
4. Perform state mutations via notifier.
```
