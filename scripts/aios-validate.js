const fs = require('fs');
const path = require('path');

const AIOS_ROOT = path.join(__dirname, '..', '.ai');

const categories = {
  STRUCTURE: [
    { name: 'MACHINE_README.md', path: 'MACHINE_README.md' },
    { name: 'START_HERE.md', path: 'START_HERE.md' },
    { name: 'CONTEXT_INDEX.md', path: 'CONTEXT_INDEX.md' },
    { name: 'SESSION_TEMPLATE.md', path: 'SESSION_TEMPLATE.md' },
    { name: 'archives/2026-Q2.md', path: 'archives/2026-Q2.md' }
  ],
  DOCUMENTATION: [
    { name: 'AIOS_GUIDE.md', path: 'AIOS_GUIDE.md' },
    { name: 'AI_CONTRACT.md', path: 'AI_CONTRACT.md' },
    { name: 'PROJECT_MEMORY.md', path: 'PROJECT_MEMORY.md' },
    { name: 'SESSION_MEMORY.md', path: 'SESSION_MEMORY.md' },
    { name: 'MEMORY_SUMMARY.md', path: 'MEMORY_SUMMARY.md' },
    { name: 'TERMINOLOGY.md', path: 'TERMINOLOGY.md' },
    { name: 'AI_COMMANDS.md', path: 'AI_COMMANDS.md' },
    { name: 'AI_HISTORY.md', path: 'AI_HISTORY.md' }
  ],
  STATE: [
    { name: 'PROJECT_STATE.json', path: 'PROJECT_STATE.json', checkJSON: true },
    { name: 'CURRENT_TASK.md', path: 'CURRENT_TASK.md' },
    { name: 'DECISIONS.md', path: 'DECISIONS.md' },
    { name: 'TODOS.md', path: 'TODOS.md' },
    { name: 'CHANGELOG.md', path: 'CHANGELOG.md' },
    { name: 'HANDOFF.md', path: 'HANDOFF.md' },
    { name: 'VERSION.md', path: 'VERSION.md', checkVersion: true }
  ],
  REFERENCES: [
    { name: 'SYSTEM_GUARDRAILS.md', path: 'SYSTEM_GUARDRAILS.md' },
    { name: 'AI_CHECKLIST.md', path: 'AI_CHECKLIST.md' },
    { name: 'AI_MODELS.md', path: 'AI_MODELS.md' },
    { name: 'RECOVERY.md', path: 'RECOVERY.md' },
    { name: 'FEATURES.md', path: 'FEATURES.md' },
    { name: 'METRICS.md', path: 'METRICS.md' },
    { name: 'adr/ADR-001.md', path: 'adr/ADR-001.md' },
    { name: 'adr/ADR-002.md', path: 'adr/ADR-002.md' },
    { name: 'adr/ADR-003.md', path: 'adr/ADR-003.md' },
    { name: 'adr/ADR-004.md', path: 'adr/ADR-004.md' },
    { name: 'adr/ADR-005.md', path: 'adr/ADR-005.md' },
    { name: 'maps/frontend.md', path: 'maps/frontend.md' },
    { name: 'maps/backend.md', path: 'maps/backend.md' },
    { name: 'maps/mobile.md', path: 'maps/mobile.md' },
    { name: 'maps/database.md', path: 'maps/database.md' }
  ],
  RULES: [
    { name: 'rules/global/coding.md', path: 'rules/global/coding.md' },
    { name: 'rules/global/security.md', path: 'rules/global/security.md' },
    { name: 'rules/global/performance.md', path: 'rules/global/performance.md' },
    { name: 'rules/global/git.md', path: 'rules/global/git.md' },
    { name: 'rules/framework/flutter.md', path: 'rules/framework/flutter.md' },
    { name: 'rules/framework/react.md', path: 'rules/framework/react.md' },
    { name: 'rules/framework/nextjs.md', path: 'rules/framework/nextjs.md' },
    { name: 'rules/framework/supabase.md', path: 'rules/framework/supabase.md' },
    { name: 'rules/framework/design.md', path: 'rules/framework/design.md' },
    { name: 'prompts/flutter.md', path: 'prompts/flutter.md' },
    { name: 'prompts/react.md', path: 'prompts/react.md' },
    { name: 'prompts/database.md', path: 'prompts/database.md' },
    { name: 'prompts/design.md', path: 'prompts/design.md' },
    { name: 'prompts/widgets.md', path: 'prompts/widgets.md' }
  ]
};

console.log('=== AIOS Validator ===\n');
let failed = false;
let passedCount = 0;
let totalChecked = 0;

for (const [categoryName, items] of Object.entries(categories)) {
  console.log(`${categoryName}`);
  items.forEach((item) => {
    totalChecked++;
    const filePath = path.join(AIOS_ROOT, item.path);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ Missing: ${item.name}`);
      failed = true;
      return;
    }

    if (item.checkJSON) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.project && data.version && data.tech_stack) {
          console.log(`  ✓ ${item.name} structure is valid`);
          passedCount++;
        } else {
          console.error(`  ✗ ${item.name} is missing required JSON keys`);
          failed = true;
        }
      } catch (e) {
        console.error(`  ✗ ${item.name} JSON parsing failed: ${e.message}`);
        failed = true;
      }
    } else if (item.checkVersion) {
      try {
        const versionContent = fs.readFileSync(filePath, 'utf8');
        if (versionContent.includes('2.0.0')) {
          console.log(`  ✓ ${item.name} version matches 2.0.0`);
          passedCount++;
        } else {
          console.error(`  ✗ ${item.name} version does not declare 2.0.0`);
          failed = true;
        }
      } catch (e) {
        console.error(`  ✗ ${item.name} reading failed: ${e.message}`);
        failed = true;
      }
    } else {
      console.log(`  ✓ ${item.name}`);
      passedCount++;
    }
  });
  console.log('');
}

console.log('SUMMARY');
if (failed) {
  console.error(`✗ AIOS validation failed. ${passedCount}/${totalChecked} passed.`);
  process.exit(1);
} else {
  console.log(`✓ ${passedCount}/${totalChecked} Passed`);
  console.log('\nAIOS 2.0.0 validation successful!');
  process.exit(0);
}
