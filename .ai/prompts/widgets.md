# Android Widget Prompts Template

Copy and execute these prompt templates when developing Glance widgets.

---

## Model Prompts

### 1. Generating Jetpack Glance Widget Provider
```markdown
Create a new Android Glance widget for [ModuleName] tasks inside `thaibahive_mobile_app`.
Requirements:
1. Lay out components using Glance's Box, Column, and Row elements.
2. Read data exclusively from Room database cache, never fetch from raw web API requests.
3. Configure WorkManager sync scheduled for a minimum of 15 minutes.
4. Render warning badge if data timestamp exceeds 30 minutes.
```
