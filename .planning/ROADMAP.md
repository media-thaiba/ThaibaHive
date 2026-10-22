# ThaibaHive - App Perfection Roadmap

*Generated from Vercel Skills Audit (2026-10-21)*

## Overview
This roadmap addresses 35 issues across 5 Vercel skill categories to bring the ThaibaHive app to production perfection.

## Phase Sequence

| Phase | Title | Priority | Effort | Dependencies |
|-------|-------|----------|--------|--------------|
| 001 | React 19 Modernization | **Critical** | Low | None |
| 002 | Cache Components & PPR | **Critical** | Medium | 001 (recommended) |
| 003 | Global State Fix | **High** | Low | None |
| 004 | Component Architecture | **High** | Medium | 001 |
| 005 | Bundle Optimization | **Medium** | Medium | 001, 002 |
| 006 | Accessibility Polish | **High** | Low | 001 |

## Quick Wins (Do First - < 1 hour each)
1. **Enable `cacheComponents: true`** (Phase 002.1) - 1 line change
2. **Remove `globalThis.__activeSession`** (Phase 003.1) - 1 line deletion
3. **Hoist loading skeletons** (Phase 004.5) - copy/paste to module level
4. **Add `content-visibility` to sidebar** (Phase 004.4) - 1 CSS class

## Critical Path
```
001 (React 19) → 002 (Cache Components) → 005 (Bundle)
                    ↓
               004 (Components) → 006 (A11y)
                    ↓
               003 (Global State) - independent, do anytime
```

## Skill References
- **vercel-react-best-practices** - 70 rules across 8 categories
- **vercel-composition-patterns** - Compound components, React 19 APIs
- **web-design-guidelines** - 100+ accessibility/UX rules
- **next-cache-components-optimizer** - Cache Components, `instant()` tests
- **next-bundle-optimizer** - `next analyze`, community detection

## Success Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Bundle Size (main chunk) | ~TBD | -20% |
| Lighthouse Performance | ~TBD | ≥ 90 |
| Lighthouse Accessibility | ~TBD | 100 |
| `instant()` Test Pass Rate | N/A | 100% |
| TypeScript Errors | 0 | 0 |
| Test Pass Rate | 100% | 100% |

## Rollback Plan
Each phase is independently revertible:
- Phase 001: Git revert `forwardRef`/`useContext` changes
- Phase 002: Remove `cacheComponents: true`, delete `instant()` tests
- Phase 003: Re-add `globalThis.__activeSession` (if needed)
- Phase 004: Revert component refactors
- Phase 005: Restore `lodash`/`date-fns` imports
- Phase 006: Revert token changes

## Next Steps
1. Review and approve this roadmap
2. Start Phase 001 (React 19 Modernization) - lowest risk, highest compatibility value
3. Run `pnpm typecheck` and `pnpm test` baseline before starting
4. Execute phases in order, verifying at each gate

## Notes
- **Feature Freeze:** Per AGENTS.md, no new features during perfection phase
- **Working Tree Inviolability:** No git mutations without explicit instruction
- **Evidence-Based Completion:** Each phase requires verification commands to pass