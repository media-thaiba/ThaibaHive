# AIOS Engineering Guide

**Version:** 1.0
**Created:** 2026-07-30
**Classification:** Permanent Engineering Operating Manual
**Scope:** ThaibaHive Institution OS Development Workflow

---

# Engineering Roles

## Product Engineering Manager

**Responsibilities:**
- Analyze repository state and identify highest-value build iterations
- Create sprint specifications with clear engineering objectives
- Define scope, dependencies, and acceptance criteria
- Approve engineering contracts before implementation
- Conduct sprint retrospectives and recommend improvements
- Ensure AIOS governance compliance throughout sprint lifecycle
- Manage sprint planning and next sprint recommendations

**Inputs:**
- Repository state analysis
- AIOS documentation (.ai/*)
- Engineering backlog
- Previous sprint retrospectives
- Implementation and verification reports

**Outputs:**
- Sprint specification document
- Engineering contract approval
- Sprint retrospective
- Next sprint recommendations
- AIOS improvement recommendations

**Artifacts:**
- `.ai/sprints/Sprint-XXX-[Name].md` (Sprint specification)
- `.ai/retrospectives/Sprint-XXX-Retrospective.md` (Sprint retrospective)

**Completion Criteria:**
- Sprint specification created with all required sections
- Engineering contract approved by implementation team
- Retrospective completed with lessons learned
- Next sprint recommendation provided
- AIOS improvements documented

**Handoff Rules:**
- Sprint specification must be saved to `.ai/sprints/` before implementation begins
- Must notify implementation team when sprint is approved
- Must review execution log before retrospective
- Must ensure retrospective is saved before next sprint planning

---

## Implementation Engineer (Antigravity)

**Responsibilities:**
- Execute engineering contract according to specification
- Implement all tasks in dependency order
- Maintain code quality standards (TypeScript, linting, conventions)
- Write unit tests for new components and utilities
- Create reusable components and utilities
- Document implementation decisions
- Update execution log with task progress
- Hand off to verification when implementation complete

**Inputs:**
- Approved sprint specification from `.ai/sprints/`
- Existing codebase and architecture
- AIOS coding standards and conventions
- Technical constraints and dependencies

**Outputs:**
- Completed implementation of all sprint tasks
- Execution log with task details
- New components and utilities
- Updated documentation
- Handoff to verification team

**Artifacts:**
- Source code changes (new/modified files)
- `.ai/execution/Sprint-XXX-Execution-Log.md` (Execution log)
- Unit tests for new code
- Updated AIOS documentation (.ai/FEATURES.md, .ai/CHANGELOG.md)
- Component documentation (docs/)

**Completion Criteria:**
- All tasks in sprint specification completed
- All acceptance criteria met
- Build passes with zero errors
- TypeScript compilation passes with zero errors
- Unit tests pass
- Execution log complete
- Documentation updated

**Handoff Rules:**
- Must save execution log to `.ai/execution/` before verification
- Must notify verification team when implementation is complete
- Must provide summary of changes and any deviations from specification
- Must ensure all code is committed and pushed

---

## Verification Engineer (Opencoder)

**Responsibilities:**
- Independently verify implementation against sprint specification
- Test all acceptance criteria
- Conduct security verification
- Conduct performance verification
- Document verification findings
- Request fixes if issues found
- Create release certificate when verification passes
- Recommend release decision

**Inputs:**
- Completed implementation from implementation team
- Sprint specification from `.ai/sprints/`
- Execution log from `.ai/execution/`
- Source code changes
- Test results

**Outputs:**
- Verification report with findings
- Fix requests if issues found
- Release certificate with recommendation
- Release report

**Artifacts:**
- `.ai/releases/Release-Sprint-XXX.md` (Release report)
- `.ai/releases/Release-Certificate-Sprint-XXX.md` (Release certificate)
- Verification test results
- Security audit results
- Performance test results

**Completion Criteria:**
- All acceptance criteria verified
- Security verification passed
- Performance verification passed
- Build and test status confirmed
- Release certificate created
- Release recommendation provided

**Handoff Rules:**
- Must save release certificate to `.ai/releases/` before Product Engineering Manager review
- Must notify Product Engineering Manager when verification is complete
- Must document any issues found and fixes required
- Must ensure release decision is documented

---

## Architecture Lead

**Responsibilities:**
- Review sprint specifications for architectural alignment
- Ensure adherence to AIOS architecture decisions
- Identify architectural risks and mitigation strategies
- Review technical approaches and patterns
- Provide architectural guidance during implementation
- Conduct architecture reviews in retrospective
- Recommend architectural improvements

**Inputs:**
- Sprint specifications
- Implementation proposals
- Code changes (for review)
- Retrospective findings
- Architecture decision records (ADRs)

**Outputs:**
- Architecture review feedback
- Risk assessments
- Architecture improvement recommendations
- ADR updates if needed

**Artifacts:**
- Architecture review comments
- Risk assessment documents
- Updated ADRs (if needed)
- Architecture improvement recommendations

**Completion Criteria:**
- Sprint specification reviewed for architectural alignment
- Implementation risks identified and mitigated
- Architecture guidance provided
- Retrospective architecture review completed
- Architecture improvements documented

**Handoff Rules:**
- Must provide architecture review before sprint approval
- Must be available for architectural guidance during implementation
- Must conduct architecture review in retrospective
- Must document architecture improvements

---

# Standard Sprint Lifecycle

## 1. Sprint Planning

**Trigger:** Product Engineering Manager identifies need for new sprint

**Process:**
1. Analyze repository state and capabilities
2. Review AIOS documentation and engineering backlog
3. Identify highest-value engineering objective
4. Define sprint scope and constraints
5. Identify dependencies and risks
6. Create sprint specification document

**Output:** `.ai/sprints/Sprint-XXX-[Name].md`

**Quality Gate:** Sprint specification must include all required sections and be approved by Architecture Lead

---

## 2. Engineering Contract

**Trigger:** Sprint specification created and reviewed

**Process:**
1. Product Engineering Manager presents sprint specification
2. Implementation Engineer reviews specification for feasibility
3. Architecture Lead reviews for architectural alignment
4. Dependencies and risks are validated
5. Acceptance criteria are clarified
6. Contract is approved or modified

**Output:** Approved sprint specification (engineering contract)

**Quality Gate:** All roles must approve specification before implementation begins

---

## 3. Implementation

**Trigger:** Engineering contract approved

**Process:**
1. Implementation Engineer creates feature branch
2. Tasks executed in dependency order
3. Code written following AIOS coding standards
4. Unit tests written for new code
5. Execution log updated with task progress
6. Documentation updated alongside implementation
7. Build and tests run continuously
8. Changes committed to repository

**Output:** Completed implementation, execution log

**Quality Gate:** All tasks completed, build passes, tests pass, execution log complete

---

## 4. Execution Log

**Trigger:** Implementation tasks completed

**Process:**
1. Implementation Engineer documents each task completion
2. Files modified/created listed
3. Acceptance criteria status recorded
4. Build and test status captured
5. Any deviations from specification documented
6. Handoff notes created

**Output:** `.ai/execution/Sprint-XXX-Execution-Log.md`

**Quality Gate:** Execution log must be complete and accurate before verification

---

## 5. Verification

**Trigger:** Implementation complete and execution log saved

**Process:**
1. Verification Engineer reviews sprint specification
2. Reviews execution log and implementation
3. Tests all acceptance criteria
4. Conducts security verification
5. Conducts performance verification
6. Documents findings and issues
7. Requests fixes if issues found
8. Creates release certificate when verification passes

**Output:** Verification report, release certificate

**Quality Gate:** All acceptance criteria verified, security and performance tests passed

---

## 6. Release Certificate

**Trigger:** Verification passed

**Process:**
1. Verification Engineer creates release certificate
2. Documents verification findings
3. Summarizes changes and impact
4. Provides release recommendation
5. Notes any remaining technical debt
6. Saves to `.ai/releases/`

**Output:** `.ai/releases/Release-Certificate-Sprint-XXX.md`

**Quality Gate:** Release certificate must include verification summary and recommendation

---

## 7. Retrospective

**Trigger:** Release certificate created

**Process:**
1. Product Engineering Manager reviews entire sprint lifecycle
2. Analyzes sprint specification, execution log, release certificate
3. Documents objectives achieved
4. Identifies engineering wins
5. Documents challenges encountered
6. Summarizes verification findings
7. Identifies technical debt remaining
8. Documents lessons learned
9. Recommends AIOS improvements
10. Identifies reusable assets
11. Provides metrics
12. Recommends next sprint objective

**Output:** `.ai/retrospectives/Sprint-XXX-Retrospective.md`

**Quality Gate:** Retrospective must be comprehensive and include all required sections

---

## 8. Next Sprint

**Trigger:** Retrospective complete

**Process:**
1. Product Engineering Manager reviews retrospective recommendations
2. Considers engineering backlog and repository state
3. Identifies next highest-value objective
4. Begins Sprint Planning for next sprint

**Output:** Next sprint planning initiated

**Quality Gate:** Next sprint objective must align with retrospective recommendations

---

# Quality Gates

## Pre-Implementation Gates
- Sprint specification includes all required sections
- Architecture Lead approves architectural alignment
- Implementation Engineer confirms feasibility
- Dependencies and risks identified and mitigated
- Acceptance criteria are clear and testable

## Implementation Gates
- All tasks completed per specification
- Build passes with zero errors
- TypeScript compilation passes with zero errors
- Unit tests pass with zero failures
- Code follows AIOS coding standards
- Execution log is complete and accurate

## Verification Gates
- All acceptance criteria verified
- Security verification passed
- Performance verification passed
- No critical issues found
- Build and test status confirmed
- Release certificate created

## Release Gates
- Release certificate approved by Product Engineering Manager
- Documentation updated and accurate
- Technical debt documented
- Known issues documented
- Release decision recorded

## Retrospective Gates
- All lifecycle documents reviewed
- Lessons learned documented
- AIOS improvements recommended
- Reusable assets identified
- Next sprint objective recommended

---

# Definition of Done

A sprint is considered complete when:

1. **Implementation Complete:**
   - All tasks in sprint specification completed
   - All acceptance criteria met
   - Code follows AIOS coding standards
   - Build passes with zero errors
   - TypeScript compilation passes with zero errors
   - Unit tests pass

2. **Verification Complete:**
   - All acceptance criteria verified
   - Security verification passed
   - Performance verification passed
   - No critical issues
   - Release certificate created

3. **Documentation Complete:**
   - Execution log complete and accurate
   - AIOS documentation updated (.ai/FEATURES.md, .ai/CHANGELOG.md)
   - Component documentation created
   - User guides updated if applicable
   - Handoff notes created

4. **Release Complete:**
   - Release certificate approved
   - Release decision documented
   - Technical debt documented
   - Known issues documented

5. **Retrospective Complete:**
   - Sprint retrospective created
   - Lessons learned documented
   - AIOS improvements recommended
   - Reusable assets identified
   - Next sprint objective recommended

---

# Release Checklist

## Pre-Release
- [ ] All sprint tasks completed
- [ ] All acceptance criteria met
- [ ] Build passes with zero errors
- [ ] TypeScript compilation passes with zero errors
- [ ] Unit tests pass
- [ ] Security verification passed
- [ ] Performance verification passed
- [ ] No critical issues

## Documentation
- [ ] Execution log complete
- [ ] .ai/FEATURES.md updated
- [ ] .ai/CHANGELOG.md updated
- [ ] Component documentation created
- [ ] User guides updated if applicable
- [ ] Handoff notes created

## Release
- [ ] Release certificate created
- [ ] Release recommendation provided
- [ ] Technical debt documented
- [ ] Known issues documented
- [ ] Release decision approved
- [ ] Release version assigned

## Post-Release
- [ ] Sprint retrospective created
- [ ] Lessons learned documented
- [ ] AIOS improvements recommended
- [ ] Reusable assets identified
- [ ] Next sprint objective recommended

---

# Verification Rules

## General Rules
1. Verification must be independent from implementation
2. All acceptance criteria must be explicitly verified
3. Security verification is mandatory for all sprints
4. Performance verification is mandatory for all sprints
5. Issues must be documented with root cause and severity

## Security Verification
- RBAC permissions must be tested
- Institution isolation must be verified
- JWT token validation must be tested
- Rate limiting must be verified
- Security headers must be present
- File type restrictions must be tested
- No cross-tenant data leakage

## Performance Verification
- Load times must meet specification requirements
- No performance regressions
- Memory leaks must be absent
- Database query performance acceptable
- API response times acceptable

## Code Quality Verification
- TypeScript compilation passes with zero errors
- Linting passes with zero new warnings
- Code follows AIOS coding standards
- No console.log statements in production code
- No hardcoded credentials or disabled security

## Integration Verification
- End-to-end workflows tested
- Component integration tested
- API integration tested
- Database integration tested
- No integration regressions

---

# Prompt Standards

## Sprint Specification Prompts
- Must include clear engineering objective
- Must define scope and out of scope
- Must identify dependencies and risks
- Must include detailed task specifications
- Must include acceptance criteria for each task
- Must include definition of done
- Must include release impact and rollback considerations

## Implementation Prompts
- Must reference approved sprint specification
- Must follow AIOS coding standards
- Must maintain architectural alignment
- Must write unit tests for new code
- Must document implementation decisions
- Must update execution log continuously

## Verification Prompts
- Must reference sprint specification and execution log
- Must verify all acceptance criteria
- Must conduct security verification
- Must conduct performance verification
- Must document findings objectively
- Must provide clear release recommendation

## Retrospective Prompts
- Must review entire sprint lifecycle
- Must document lessons learned
- Must recommend AIOS improvements
- Must identify reusable assets
- Must provide accurate metrics
- Must recommend next sprint objective

---

# Document Naming Convention

## Sprint Specifications
Format: `Sprint-XXX-[Sprint-Name].md`
Example: `Sprint-001-MediaHive-Frontend-Integration.md`
Location: `.ai/sprints/`

## Execution Logs
Format: `Sprint-XXX-Execution-Log.md`
Example: `Sprint-001-Execution-Log.md`
Location: `.ai/execution/`

## Release Documents
Format: `Release-Sprint-XXX.md`
Format: `Release-Certificate-Sprint-XXX.md`
Example: `Release-Sprint-001.md`
Location: `.ai/releases/`

## Retrospectives
Format: `Sprint-XXX-Retrospective.md`
Example: `Sprint-001-Retrospective.md`
Location: `.ai/retrospectives/`

## AIOS Documentation
- Feature registry: `.ai/FEATURES.md`
- Changelog: `.ai/CHANGELOG.md`
- Engineering guide: `.ai/AIOS_ENGINEERING_GUIDE.md`
- Sprint specifications: `.ai/sprints/*.md`

## Component Documentation
Format: `[component-name]-guide.md`
Example: `api-client-guide.md`
Location: `docs/`

---

# Folder Structure

```
.ai/
├── sprints/                    # Sprint specifications
│   ├── Sprint-001-MediaHive-Frontend-Integration.md
│   └── Sprint-XXX-[Name].md
├── execution/                  # Execution logs
│   ├── Sprint-001-Execution-Log.md
│   └── Sprint-XXX-Execution-Log.md
├── releases/                   # Release documents
│   ├── Release-Sprint-001.md
│   ├── Release-Certificate-Sprint-001.md
│   └── Release-Sprint-XXX.md
├── retrospectives/            # Sprint retrospectives
│   ├── Sprint-001-Retrospective.md
│   └── Sprint-XXX-Retrospective.md
├── 00_START_HERE.md           # AIOS entry point
├── 01_PROJECT_MANIFEST.md     # Project philosophy
├── 02_ARCHITECTURE.md         # Platform architecture
├── AIOS_ENGINEERING_GUIDE.md   # This document
├── FEATURES.md                 # Feature registry
├── CHANGELOG.md               # Changelog
└── [other AIOS documentation]

docs/                          # Component and user documentation
├── api-client-guide.md
├── mediahive-user-guide.md
└── [other documentation]

.planning/                      # Planning and handoff notes
├── handoff-mh-fe-int.md
└── [other planning documents]
```

---

# Required AIOS Artifacts

## Per Sprint
1. **Sprint Specification** (`.ai/sprints/Sprint-XXX-[Name].md`)
   - Sprint metadata
   - Executive summary
   - Business value
   - Sprint goal
   - Current repository state
   - Engineering objective
   - Scope and out of scope
   - Dependencies
   - Task breakdown (15-20 tasks)
   - Acceptance criteria
   - Definition of done
   - Release impact
   - Rollback considerations
   - Implementation notes

2. **Execution Log** (`.ai/execution/Sprint-XXX-Execution-Log.md`)
   - Task completion status
   - Files modified/created
   - Summary of changes
   - Acceptance criteria status
   - Build and test status
   - Notes and deviations

3. **Release Certificate** (`.ai/releases/Release-Certificate-Sprint-XXX.md`)
   - Sprint summary
   - Completed tasks
   - Files changed
   - Test results
   - Build status
   - Security verification
   - Performance verification
   - Release recommendation

4. **Retrospective** (`.ai/retrospectives/Sprint-XXX-Retrospective.md`)
   - Sprint overview
   - Objectives achieved
   - Engineering wins
   - Challenges encountered
   - Verification findings
   - Technical debt remaining
   - Lessons learned
   - AIOS improvements
   - Reusable assets
   - Metrics
   - Next sprint recommendation

## Ongoing AIOS Artifacts
1. **AIOS Engineering Guide** (`.ai/AIOS_ENGINEERING_GUIDE.md`)
   - Engineering roles
   - Sprint lifecycle
   - Quality gates
   - Definition of done
   - Verification rules
   - Document standards

2. **Feature Registry** (`.ai/FEATURES.md`)
   - Feature status tracking
   - Dependencies and owners

3. **Changelog** (`.ai/CHANGELOG.md`)
   - Version history
   - Change descriptions

---

# Lessons Learned from Sprint-001

## What Worked Well

### Foundational Task Prioritization
**Lesson:** Identifying and prioritizing foundational tasks (like MH-001 API client) that establish patterns for subsequent tasks significantly accelerated implementation.
**Application:** Future sprints should explicitly identify foundational tasks in planning phase and tag them in engineering contracts.

### Component Reusability Investment
**Lesson:** Investing in well-designed, reusable components (12 components in Sprint-001) paid dividends in implementation speed and consistency.
**Application:** Include component reusability assessment in task specifications and design components for reuse from the start.

### Security Testing Integration
**Lesson:** Integrating security testing into the implementation process (MH-012, MH-013) prevented security debt accumulation and caught issues early.
**Application:** Make security testing a standard implementation phase rather than a separate verification task.

### Documentation Parallelism
**Lesson:** Creating documentation alongside implementation (MH-015) ensured accuracy and reduced post-sprint documentation burden.
**Application:** Establish documentation updates as continuous requirement during implementation, not a final step.

### Clear Sprint Specification
**Lesson:** Detailed sprint specification with clear acceptance criteria enabled focused implementation and zero rework.
**Application:** Maintain high detail level in sprint specifications, especially for acceptance criteria and task dependencies.

## What Should Improve

### Component Design Review
**Lesson:** Could benefit from more formal component design review to ensure reusability and consistency.
**Application:** Add "Component Design Review" phase for reusable components before implementation begins.

### Security Test Templates
**Lesson:** Security testing was effective but could be standardized with templates for future sprints.
**Application:** Create security test templates for common scenarios (RBAC, institution isolation, rate limiting).

### Technical Debt Assessment
**Lesson:** Technical debt assessment could be more systematic to ensure no debt is overlooked.
**Application:** Add "Technical Debt Assessment" as standard verification workflow step with systematic checklist.

### Documentation Templates
**Lesson:** Documentation quality was good but could benefit from templates for consistency.
**Application:** Create documentation templates for common document types (API guides, user guides).

## Architectural Insights

### API Client Pattern Success
**Lesson:** The unified API client wrapper proved to be the right architectural decision, providing consistent error handling and retry logic.
**Application:** Establish API client pattern as standard for all API communication, consider making it a required architectural pattern.

### Type Safety Investment
**Lesson:** TypeScript strict mode compliance prevented runtime errors and improved developer experience.
**Application:** Maintain TypeScript strict mode as non-negotiable standard, consider adding type coverage metrics.

### Component Library Approach
**Lesson:** Creating reusable UI components rather than monolithic page components improved maintainability and consistency.
**Application:** Continue component library approach, establish component design system guidelines.

### Security by Design
**Lesson:** Implementing RBAC and institution isolation from the start prevented security debt.
**Application:** Make security-by-design a standard requirement, include security considerations in all task specifications.

---

# Agent Replacement Protocol

## Principle
The AIOS engineering workflow is designed to be agent-agnostic. Any AI agent can replace another without changing the workflow because:

1. **Role-Based Workflow:** Each role has clearly defined responsibilities, inputs, outputs, and artifacts
2. **Standardized Documentation:** All communication happens through standardized documents with fixed formats
3. **Clear Handoff Rules:** Handoffs are defined by document completion and notification, not agent identity
4. **Quality Gates:** Quality gates are based on objective criteria, not agent judgment
5. **Artifact-Based Continuity:** All context is captured in artifacts, not agent memory

## Replacement Process

### Product Engineering Manager Replacement
1. New agent reviews existing sprint specifications and retrospectives
2. Reviews `.ai/AIOS_ENGINEERING_GUIDE.md` for role responsibilities
3. Reviews current repository state and AIOS documentation
4. Reviews engineering backlog and previous sprint recommendations
5. Continues with next sprint planning using established process

### Implementation Engineer Replacement
1. New agent reviews approved sprint specification
2. Reviews execution log for current sprint status
3. Reviews AIOS coding standards and conventions
4. Reviews current codebase state
5. Continues implementation from last completed task
6. Updates execution log with progress

### Verification Engineer Replacement
1. New agent reviews sprint specification and execution log
3. Reviews completed implementation
4. Reviews verification rules and quality gates
5. Continues verification from last completed check
6. Creates release certificate per standards

### Architecture Lead Replacement
1. New agent reviews current sprint specification
2. Reviews architecture decision records (ADRs)
3. Reviews existing architecture and patterns
4. Provides architectural guidance for current sprint
5. Conducts architecture review per standards

## Context Continuity

All context required for agent replacement is captured in:

1. **Sprint Specification** (`.ai/sprints/`) - Complete sprint context
2. **Execution Log** (`.ai/execution/`) - Implementation progress
3. **Release Certificate** (`.ai/releases/`) - Verification findings
4. **Retrospective** (`.ai/retrospectives/`) - Lessons learned
5. **AIOS Documentation** (`.ai/*.md`) - Architecture and standards
6. **Source Code** - Current implementation state

## No Workflow Changes Required

The workflow remains identical regardless of which agents are performing the roles because:

- **Documents are role-specific, not agent-specific**
- **Quality gates are objective, not subjective**
- **Handoffs are artifact-based, not relationship-based**
- **Standards are documented, not tribal knowledge**
- **Processes are standardized, not improvised**

## Agent Transition Checklist

When replacing an agent:

1. **Review Role Documentation:** Agent reviews their role in `.ai/AIOS_ENGINEERING_GUIDE.md`
2. **Review Current Artifacts:** Agent reviews all relevant artifacts for current sprint
3. **Review Standards:** Agent reviews AIOS coding standards and conventions
4. **Understand Context:** Agent understands current progress and next steps
5. **Continue Workflow:** Agent continues workflow from where previous agent left off
6. **Update Artifacts:** Agent updates artifacts with their progress
7. **Notify Next Role:** Agent notifies next role when their work is complete

---

**AIOS Engineering Guide Version:** 1.0
**Last Updated:** 2026-07-30
**Next Review:** After Sprint-002 completion
**Maintainer:** Product Engineering Manager

This document is the permanent engineering operating manual for ThaibaHive Institution OS development. All engineering teams must follow these standards and processes.