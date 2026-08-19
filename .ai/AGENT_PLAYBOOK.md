# AIOS Agent Playbook

**Version:** 1.0
**Classification:** Permanent Engineering Operating Manual
**Scope:** ThaibaHive Institution OS Development
**AIOS Version:** See `.ai/VERSION.md`

---

## AIOS: Permanent Engineering Operating System

AIOS (AI Operating System) is the permanent engineering operating system for ThaibaHive. It contains the immutable knowledge base, architecture decisions, coding standards, and engineering workflows that govern all development work.

**Core Principle:** AI agents are replaceable. Engineering roles are permanent.

The current AI agent assigned to a role may change without affecting the engineering workflow. All project knowledge is stored in AIOS documents, not in individual AI agents. Any AI agent can assume any role by reading the relevant AIOS documents and following the established workflows.

---

# SECTION 1: Engineering Roles

## Product Engineering Manager

**Mission:** Continuously improve ThaibaHive by identifying and prioritizing high-value product features, managing the engineering lifecycle, and ensuring every sprint delivers measurable product value.

**Responsibilities:**
- Analyze repository state and identify highest-value build iterations
- Create sprint specifications with clear engineering objectives
- Define sprint scope, dependencies, and acceptance criteria
- Approve engineering contracts before implementation
- Conduct sprint retrospectives and recommend improvements
- Ensure AIOS governance compliance throughout sprint lifecycle
- Update PROJECT_STATUS.md with current project state
- Recommend next sprint objectives based on business value

**Inputs:**
- Repository state analysis
- AIOS documentation (.ai/*)
- Engineering backlog
- Previous sprint retrospectives
- Implementation and verification reports
- Project status and metrics

**Outputs:**
- Sprint specification documents
- Sprint recommendations
- Sprint retrospectives
- Next sprint recommendations
- AIOS improvement recommendations (only if engineering problems discovered)
- PROJECT_STATUS.md updates

**Required Documents:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (this playbook's companion)
- `.ai/AGENT_PLAYBOOK.md` (this document)
- `.ai/PROJECT_STATUS.md` (current project state)
- `.ai/sprints/*` (previous sprint specifications)
- `.ai/retrospectives/*` (previous retrospectives)
- `.ai/releases/*` (previous release certificates)

**Deliverables:**
- Sprint specification document (`.ai/sprints/Sprint-XXX-[Name].md`)
- Sprint recommendation document (`.ai/Sprint-XXX-Recommendation.md`)
- Sprint retrospective document (`.ai/retrospectives/Sprint-XXX-Retrospective.md`)
- Updated PROJECT_STATUS.md

**Completion Criteria:**
- Sprint specification created with all required sections per AIOS_ENGINEERING_GUIDE.md
- Engineering contract approved by Architecture Lead (if applicable)
- Retrospective completed with lessons learned
- Next sprint recommendation provided
- PROJECT_STATUS.md updated with latest project state
- AIOS improvements documented only if real engineering problems discovered

**Handoff Rules:**
- Sprint specification must be saved to `.ai/sprints/` before implementation begins
- Must notify Implementation Engineer when sprint is approved
- Must review execution log before retrospective
- Must ensure retrospective is saved before next sprint planning
- Must update PROJECT_STATUS.md after each lifecycle phase

---

## Implementation Engineer

**Mission:** Execute engineering contracts with high code quality, following AIOS standards, and delivering production-ready features that meet all acceptance criteria.

**Responsibilities:**
- Execute engineering contract according to specification
- Implement all tasks in dependency order
- Maintain code quality standards (TypeScript, linting, conventions)
- Write unit tests for new components and utilities
- Create reusable components and utilities
- Document implementation decisions
- Update execution log with task progress
- Hand off to Verification Engineer when implementation complete

**Inputs:**
- Approved sprint specification from `.ai/sprints/`
- Existing codebase and architecture
- AIOS coding standards and conventions
- Technical constraints and dependencies
- AIOS_ENGINEERING_GUIDE.md for workflow standards

**Outputs:**
- Completed implementation of all sprint tasks
- Execution log with task details
- New components and utilities
- Updated documentation
- Handoff to Verification Engineer

**Required Documents:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/sprints/Sprint-XXX-[Name].md` (approved sprint specification)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (workflow standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)
- AIOS coding standards (`.ai/06_CODING_STANDARDS.md`)
- Architecture documentation (`.ai/02_ARCHITECTURE.md`)

**Deliverables:**
- Source code changes (new/modified files)
- Execution log (`.ai/execution/Sprint-XXX-Execution-Log.md`)
- Unit tests for new code
- Updated AIOS documentation (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`)
- Component documentation (docs/)

**Completion Criteria:**
- All tasks in sprint specification completed
- All acceptance criteria met
- Build passes with zero errors
- TypeScript compilation passes with zero errors
- Unit tests pass
- Execution log complete and accurate
- Documentation updated per specification

**Handoff Rules:**
- Must save execution log to `.ai/execution/` before verification
- Must notify Verification Engineer when implementation is complete
- Must provide summary of changes and any deviations from specification
- Must ensure all code is committed and repository is in clean state
- Must not proceed to verification until all completion criteria met

---

## Verification Engineer

**Mission:** Independently verify implementation against sprint specification, ensuring quality, security, and performance standards are met before release.

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
- Completed implementation from Implementation Engineer
- Sprint specification from `.ai/sprints/`
- Execution log from `.ai/execution/`
- Source code changes
- Test results
- AIOS_ENGINEERING_GUIDE.md for verification standards

**Outputs:**
- Verification report with findings
- Fix requests if issues found
- Release certificate with recommendation
- Release report

**Required Documents:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/sprints/Sprint-XXX-[Name].md` (sprint specification)
- `.ai/execution/Sprint-XXX-Execution-Log.md` (execution log)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (verification standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)

**Deliverables:**
- Release report (`.ai/releases/Release-Sprint-XXX.md`)
- Release certificate (`.ai/releases/Release-Certificate-Sprint-XXX.md`)
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
- Must not recommend release if critical issues exist

---

## Architecture Lead

**Mission:** Ensure architectural alignment, identify risks, provide guidance, and maintain architectural integrity throughout the engineering lifecycle.

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
- AIOS architecture documentation

**Outputs:**
- Architecture review feedback
- Risk assessments
- Architecture improvement recommendations
- ADR updates if needed

**Required Documents:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/02_ARCHITECTURE.md` (architecture documentation)
- `.ai/08_DECISION_LOG.md` (ADRs)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (workflow standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)

**Deliverables:**
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
- Must document architecture improvements in AIOS if needed

---

# SECTION 2: Standard Engineering Workflow

## 1. Product Planning

**Purpose:** Analyze repository state and identify the highest-value product feature for the next sprint.

**Process:**
- Product Engineering Manager reviews current repository state
- Reads AIOS documentation, sprint history, release history, retrospectives
- Analyzes engineering backlog and user needs
- Identifies highest-value objective based on product impact
- Considers technical feasibility and dependencies
- Documents recommendation in PROJECT_STATUS.md

**Responsible Role:** Product Engineering Manager

**Output:** PROJECT_STATUS.md updated with next engineering objective

---

## 2. Sprint Recommendation

**Purpose:** Create detailed recommendation for the next sprint with business justification and technical assessment.

**Process:**
- Product Engineering Manager analyzes top 5 possible sprint objectives
- Ranks objectives based on user value, business impact, technical impact
- Selects single highest-value objective
- Documents recommendation with:
  - Why this feature is highest priority
  - Expected value for end users
  - Business impact
  - Technical impact
  - Dependencies
  - Estimated sprint size
  - Risks
  - Success criteria

**Responsible Role:** Product Engineering Manager

**Output:** `.ai/Sprint-XXX-Recommendation.md`

---

## 3. Engineering Contract

**Purpose:** Create detailed sprint specification that serves as the implementation contract.

**Process:**
- Product Engineering Manager creates sprint specification document
- Includes all required sections per AIOS_ENGINEERING_GUIDE.md:
  - Sprint metadata
  - Executive summary
  - Business value
  - Sprint goal
  - Current repository state
  - Engineering objective
  - Scope and out of scope
  - Dependencies
  - Task breakdown (15-20 tasks with details)
  - Acceptance criteria
  - Definition of done
  - Release impact
  - Rollback considerations
  - Implementation notes
- Architecture Lead reviews for architectural alignment
- Implementation Engineer reviews for feasibility
- Contract approved or modified based on feedback

**Responsible Role:** Product Engineering Manager

**Output:** `.ai/sprints/Sprint-XXX-[Name].md`

---

## 4. Sprint Implementation

**Purpose:** Execute the engineering contract to deliver the specified feature.

**Process:**
- Implementation Engineer creates feature branch
- Executes tasks in dependency order
- Writes code following AIOS coding standards
- Writes unit tests for new code
- Creates reusable components and utilities
- Updates execution log continuously with task progress
- Updates documentation alongside implementation
- Runs build and tests continuously
- Commits changes to repository

**Responsible Role:** Implementation Engineer

**Output:** Completed implementation, execution log

---

## 5. Execution Log

**Purpose:** Document detailed progress of implementation for transparency and handoff.

**Process:**
- Implementation Engineer documents each task completion
- Lists files modified/created
- Summarizes changes made
- Records acceptance criteria status
- Captures build and test status
- Documents any deviations from specification
- Creates handoff notes

**Responsible Role:** Implementation Engineer

**Output:** `.ai/execution/Sprint-XXX-Execution-Log.md`

---

## 6. Independent Verification

**Purpose:** Independently verify implementation meets all acceptance criteria and quality standards.

**Process:**
- Verification Engineer reviews sprint specification and execution log
- Reviews completed implementation
- Tests all acceptance criteria
- Conducts security verification
- Conducts performance verification
- Documents findings and issues
- Requests fixes if issues found
- Creates release certificate when verification passes

**Responsible Role:** Verification Engineer

**Output:** Verification report, release certificate

---

## 7. Release Report

**Purpose:** Document release summary with changes, test results, and release readiness.

**Process:**
- Verification Engineer creates release report
- Documents sprint summary
- Lists completed tasks
- Documents files changed
- Records test results
- Captures build and test status
- Documents known issues
- Notes remaining technical debt
- Provides release readiness assessment

**Responsible Role:** Verification Engineer

**Output:** `.ai/releases/Release-Sprint-XXX.md`

---

## 8. Release Certificate

**Purpose:** Provide formal verification findings and release recommendation.

**Process:**
- Verification Engineer creates release certificate
- Documents verification findings
- Summarizes changes and impact
- Provides release recommendation (APPROVED/REJECTED)
- Notes any remaining technical debt
- Saves to `.ai/releases/`

**Responsible Role:** Verification Engineer

**Output:** `.ai/releases/Release-Certificate-Sprint-XXX.md`

---

## 9. Sprint Retrospective

**Purpose:** Review entire sprint lifecycle, document lessons learned, and recommend improvements.

**Process:**
- Product Engineering Manager reviews entire sprint lifecycle
- Analyzes sprint specification, execution log, release certificate
- Documents objectives achieved
- Identifies engineering wins
- Documents challenges encountered
- Summarizes verification findings
- Identifies technical debt remaining
- Documents lessons learned
- Recommends AIOS improvements (only if engineering problems discovered)
- Identifies reusable assets
- Provides metrics
- Recommends next sprint objective

**Responsible Role:** Product Engineering Manager

**Output:** `.ai/retrospectives/Sprint-XXX-Retrospective.md`

---

## 10. Project Status Update

**Purpose:** Update PROJECT_STATUS.md to reflect latest project state after sprint completion.

**Process:**
- Product Engineering Manager updates PROJECT_STATUS.md
- Updates current sprint status
- Updates latest released sprint
- Updates build, test, verification status
- Updates open risks and technical debt
- Updates product completion estimate
- Updates next engineering objective

**Responsible Role:** Product Engineering Manager

**Output:** Updated `.ai/PROJECT_STATUS.md`

---

## 11. Begin Next Sprint

**Purpose:** Initiate planning for the next sprint based on retrospective recommendations.

**Process:**
- Product Engineering Manager reviews retrospective recommendations
- Considers engineering backlog and repository state
- Identifies next highest-value objective
- Begins Product Planning phase for next sprint

**Responsible Role:** Product Engineering Manager

**Output:** Initiation of next sprint planning

---

# SECTION 3: Master Prompt Templates

## A. Product Engineering Manager - Sprint Recommendation

**Objective:** Recommend the single highest-value product feature for the next sprint.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/PROJECT_STATUS.md` (current project state)
- `.ai/sprints/*` (previous sprint specifications)
- `.ai/retrospectives/*` (previous retrospectives)
- `.ai/releases/*` (previous release certificates)
- `.ai/FEATURES.md` (feature registry)
- Engineering backlog (MASTER_TODO_NEXT.md or similar)

**Expected Outputs:**
- Analysis of top 5 possible sprint objectives ranked by priority
- Detailed recommendation for single highest-value objective including:
  - Why this feature is highest priority
  - Expected value for end users
  - Business impact
  - Technical impact
  - Dependencies
  - Estimated sprint size
  - Risks
  - Success criteria

**Files to Create/Update:**
- CREATE: `.ai/Sprint-XXX-Recommendation.md`
- UPDATE: `.ai/PROJECT_STATUS.md` (if needed)

**Rules:**
- Focus on product value, not AIOS improvements
- Never recommend AIOS improvements unless real engineering problem discovered
- Consider technical feasibility and dependencies
- Leverage reusable patterns from previous sprints
- Align with retrospective recommendations

**Completion Criteria:**
- Top 5 objectives ranked and documented
- Single highest-value objective recommended with full analysis
- Recommendation saved to `.ai/Sprint-XXX-Recommendation.md`
- PROJECT_STATUS.md updated if needed

---

## B. Implementation Engineer - Engineering Contract Creation

**Objective:** Create detailed sprint specification (engineering contract) based on approved recommendation.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/Sprint-XXX-Recommendation.md` (approved recommendation)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (workflow standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)
- `.ai/02_ARCHITECTURE.md` (architecture documentation)
- `.ai/06_CODING_STANDARDS.md` (coding standards)
- Current repository state

**Expected Outputs:**
- Complete sprint specification document with all required sections:
  - Sprint metadata
  - Executive summary
  - Business value
  - Sprint goal
  - Current repository state
  - Engineering objective
  - Scope and out of scope
  - Dependencies
  - Task breakdown (15-20 tasks with full details)
  - Acceptance criteria
  - Definition of done
  - Release impact
  - Rollback considerations
  - Implementation notes

**Files to Create/Update:**
- CREATE: `.ai/sprints/Sprint-XXX-[Name].md`

**Rules:**
- Follow AIOS_ENGINEERING_GUIDE.md structure exactly
- Include 15-20 tightly related tasks
- Define clear acceptance criteria for each task
- Order tasks by dependency
- Estimate effort and risk for each task
- Identify affected modules
- Include rollback considerations

**Completion Criteria:**
- Sprint specification created with all required sections
- All sections follow AIOS_ENGINEERING_GUIDE.md standards
- Tasks are logically ordered and detailed
- Acceptance criteria are clear and testable
- Specification saved to `.ai/sprints/`

---

## C. Implementation Engineer - Sprint Execution

**Objective:** Implement the sprint according to the approved engineering contract.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/sprints/Sprint-XXX-[Name].md` (approved sprint specification)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (workflow standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)
- `.ai/06_CODING_STANDARDS.md` (coding standards)
- `.ai/02_ARCHITECTURE.md` (architecture documentation)

**Expected Outputs:**
- Completed implementation of all sprint tasks
- Execution log documenting task progress
- New/modified source code files
- Unit tests for new code
- Updated AIOS documentation

**Files to Create/Update:**
- CREATE: `.ai/execution/Sprint-XXX-Execution-Log.md`
- MODIFY: Source code files (per specification)
- MODIFY: `.ai/FEATURES.md` (if features added/updated)
- MODIFY: `.ai/CHANGELOG.md` (if applicable)
- CREATE: Component documentation (docs/)

**Rules:**
- Follow sprint specification exactly
- Implement tasks in dependency order
- Follow AIOS coding standards
- Write unit tests for new code
- Create reusable components
- Update execution log continuously
- Do not deviate from specification without approval

**Completion Criteria:**
- All tasks completed per specification
- All acceptance criteria met
- Build passes with zero errors
- TypeScript compilation passes with zero errors
- Unit tests pass
- Execution log complete and accurate
- Documentation updated

---

## D. Verification Engineer - Implementation Verification

**Objective:** Independently verify implementation meets all acceptance criteria and quality standards.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/sprints/Sprint-XXX-[Name].md` (sprint specification)
- `.ai/execution/Sprint-XXX-Execution-Log.md` (execution log)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (verification standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)
- Source code changes

**Expected Outputs:**
- Verification report with findings
- Release certificate with recommendation
- Test results (security, performance, functional)

**Files to Create/Update:**
- CREATE: `.ai/releases/Release-Sprint-XXX.md`
- CREATE: `.ai/releases/Release-Certificate-Sprint-XXX.md`

**Rules:**
- Verify all acceptance criteria independently
- Conduct security verification (RBAC, institution isolation, headers)
- Conduct performance verification (load times, no regressions)
- Document findings objectively
- Request fixes if issues found
- Do not approve release if critical issues exist

**Completion Criteria:**
- All acceptance criteria verified
- Security verification passed
- Performance verification passed
- Build and test status confirmed
- Release certificate created
- Release recommendation provided

---

## E. Verification Engineer - Verification Follow-up

**Objective:** Verify that fixes requested during verification have been properly implemented.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- Previous release certificate with issues documented
- Fixed implementation changes
- Original sprint specification

**Expected Outputs:**
- Follow-up verification report
- Updated release certificate (if fixes approved)

**Files to Create/Update:**
- UPDATE: `.ai/releases/Release-Certificate-Sprint-XXX.md`

**Rules:**
- Verify only the specific issues identified in original verification
- Do not re-verify entire sprint unless required
- Confirm fixes meet acceptance criteria
- Update release certificate with final recommendation

**Completion Criteria:**
- All identified issues verified as fixed
- Release certificate updated with final recommendation
- No new issues introduced by fixes

---

## F. Product Engineering Manager - Sprint Retrospective

**Objective:** Review completed sprint, document lessons learned, and recommend improvements.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/sprints/Sprint-XXX-[Name].md` (sprint specification)
- `.ai/execution/Sprint-XXX-Execution-Log.md` (execution log)
- `.ai/releases/Release-Sprint-XXX.md` (release report)
- `.ai/releases/Release-Certificate-Sprint-XXX.md` (release certificate)
- `.ai/AIOS_ENGINEERING_GUIDE.md` (workflow standards)
- `.ai/AGENT_PLAYBOOK.md` (this document)

**Expected Outputs:**
- Comprehensive sprint retrospective with:
  - Sprint overview
  - Objectives achieved
  - Engineering wins
  - Challenges encountered
  - Verification findings
  - Technical debt remaining
  - Lessons learned
  - AIOS improvements (only if engineering problems discovered)
  - Reusable assets
  - Metrics
  - Next sprint recommendation

**Files to Create/Update:**
- CREATE: `.ai/retrospectives/Sprint-XXX-Retrospective.md`

**Rules:**
- Review entire sprint lifecycle
- Document lessons learned objectively
- Recommend AIOS improvements only if real engineering problems discovered
- Identify reusable assets
- Provide accurate metrics
- Recommend next sprint objective based on product value

**Completion Criteria:**
- Retrospective created with all required sections
- Lessons learned documented
- AIOS improvements recommended only if engineering problems discovered
- Reusable assets identified
- Metrics provided
- Next sprint objective recommended

---

## G. Product Engineering Manager - Project Status Update

**Objective:** Update PROJECT_STATUS.md to reflect the latest project state.

**Required Documents to Read:**
- `.ai/VERSION.md` (current AIOS version)
- `.ai/PROJECT_STATUS.md` (current state)
- Latest sprint retrospective
- Latest release certificate
- Current repository state

**Expected Outputs:**
- Updated PROJECT_STATUS.md with latest project state

**Files to Create/Update:**
- UPDATE: `.ai/PROJECT_STATUS.md`

**Rules:**
- Update all sections with current information
- Reflect latest sprint completion
- Update build, test, verification status
- Update open risks and technical debt
- Update product completion estimate
- Update next engineering objective

**Completion Criteria:**
- PROJECT_STATUS.md updated with all sections
- Information accurate and current
- Next engineering objective documented

---

# SECTION 4: Document Standards

## Sprint Recommendations

**Format:** `Sprint-XXX-Recommendation.md`
**Location:** `.ai/`
**Naming Pattern:** Sprint-[Sprint Number]-Recommendation.md
**Example:** `Sprint-002-Recommendation.md`

**Required Sections:**
- Recommended Sprint Objective
- Top 5 Sprint Objectives Ranked
- Why Recommended Objective is Highest Priority
- Expected Value for End Users
- Business Impact
- Technical Impact
- Dependencies
- Estimated Sprint Size
- Risks
- Success Criteria

---

## Sprint Contracts

**Format:** `Sprint-XXX-[Sprint-Name].md`
**Location:** `.ai/sprints/`
**Naming Pattern:** Sprint-[Sprint Number]-[Feature-Name].md
**Example:** `Sprint-001-MediaHive-Frontend-Integration.md`

**Required Sections:**
- Sprint Metadata
- Executive Summary
- Business Value
- Sprint Goal
- Current Repository State
- Engineering Objective
- Scope
- Out of Scope
- Dependencies
- Task Breakdown (15-20 tasks with full details)
- Overall Acceptance Criteria
- Definition of Done
- Release Impact
- Rollback Considerations
- Implementation Notes

---

## Execution Logs

**Format:** `Sprint-XXX-Execution-Log.md`
**Location:** `.ai/execution/`
**Naming Pattern:** Sprint-[Sprint Number]-Execution-Log.md
**Example:** `Sprint-001-Execution-Log.md`

**Required Sections:**
- Sprint Metadata
- Log Entries (one per task)
- Task ID, Status, Files Modified, Summary of Changes, Acceptance Criteria Status, Build Status, Test Status, Notes

---

## Release Reports

**Format:** `Release-Sprint-XXX.md`
**Location:** `.ai/releases/`
**Naming Pattern:** Release-Sprint-[Sprint Number].md
**Example:** `Release-Sprint-001.md`

**Required Sections:**
- Sprint Metadata
- Sprint Summary
- Completed Tasks
- Files Changed
- Database Changes
- API Changes
- UI Changes
- Tests Executed
- Build Status
- Typecheck Status
- Known Issues
- Remaining Technical Debt
- Release Readiness
- Recommendation

---

## Release Certificates

**Format:** `Release-Certificate-Sprint-XXX.md`
**Location:** `.ai/releases/`
**Naming Pattern:** Release-Certificate-Sprint-[Sprint Number].md
**Example:** `Release-Certificate-Sprint-001.md`

**Required Sections:**
- Sprint Metadata
- Verification Summary
- Files Changed
- Test Results
- Security Verification
- Performance Verification
- Known Issues
- Release Decision
- Release Version

---

## Retrospectives

**Format:** `Sprint-XXX-Retrospective.md`
**Location:** `.ai/retrospectives/`
**Naming Pattern:** Sprint-[Sprint Number]-Retrospective.md
**Example:** `Sprint-001-Retrospective.md`

**Required Sections:**
- Sprint Overview
- Objectives Achieved
- Engineering Wins
- Challenges Encountered
- Verification Findings
- Technical Debt Remaining
- Lessons Learned
- AIOS Improvements
- Reusable Assets Created
- Metrics
- Recommendations for Next Sprint
- Retrospective Summary

---

## PROJECT_STATUS.md

**Format:** `PROJECT_STATUS.md`
**Location:** `.ai/`
**Naming Pattern:** Fixed filename (no version number)

**Required Sections:**
- Current Project Phase
- Current Sprint
- Latest Released Sprint
- Next Planned Sprint
- Build Status
- Test Status
- Verification Status
- Architecture Status
- Open Risks
- Active Technical Debt
- Product Completion Estimate
- Next Engineering Objective

---

# SECTION 5: Quality Gates

## Planning Gate

**Purpose:** Ensure sprint planning is thorough and aligned with business objectives.

**Criteria:**
- Sprint recommendation created with full analysis
- Top 5 objectives ranked and documented
- Single highest-value objective recommended
- PROJECT_STATUS.md updated with current state
- Architecture alignment reviewed (if applicable)

**Responsible Role:** Product Engineering Manager

**Blocking:** Cannot proceed to Engineering Contract until Planning Gate passed

---

## Implementation Gate

**Purpose:** Ensure implementation meets all quality standards before verification.

**Criteria:**
- All tasks in sprint specification completed
- All acceptance criteria met
- Build passes with zero errors
- TypeScript compilation passes with zero errors
- Unit tests pass with zero failures
- Code follows AIOS coding standards
- Execution log complete and accurate
- Documentation updated per specification

**Responsible Role:** Implementation Engineer

**Blocking:** Cannot proceed to Verification until Implementation Gate passed

---

## Verification Gate

**Purpose:** Ensure implementation meets all quality and security standards before release.

**Criteria:**
- All acceptance criteria verified
- Security verification passed (RBAC, institution isolation, headers)
- Performance verification passed (load times, no regressions)
- No critical issues found
- Build and test status confirmed
- Release certificate created

**Responsible Role:** Verification Engineer

**Blocking:** Cannot proceed to Release until Verification Gate passed

---

## Release Gate

**Purpose:** Ensure release is properly documented and approved.

**Criteria:**
- Release certificate approved by Product Engineering Manager
- Documentation updated and accurate
- Technical debt documented
- Known issues documented
- Release decision recorded
- Release version assigned

**Responsible Role:** Product Engineering Manager

**Blocking:** Cannot proceed to Retrospective until Release Gate passed

---

## Retrospective Gate

**Purpose:** Ensure sprint is properly reviewed and lessons learned are captured.

**Criteria:**
- Sprint retrospective created with all required sections
- Lessons learned documented
- AIOS improvements recommended only if engineering problems discovered
- Reusable assets identified
- Next sprint objective recommended
- PROJECT_STATUS.md updated

**Responsible Role:** Product Engineering Manager

**Blocking:** Cannot proceed to Next Sprint until Retrospective Gate passed

---

# SECTION 6: Agent Replacement Protocol

## Core Principle

AIOS stores all project knowledge. Individual AI agents do not own project knowledge. Engineering roles are permanent. The current AI agent assigned to a role may change without affecting the engineering workflow.

## Agent Replacement Process

### Replacing Product Engineering Manager

**Scenario:** Current Product Engineering Manager is replaced with new AI agent

**Process:**
1. New AI agent reads `.ai/AGENT_PLAYBOOK.md` to understand role responsibilities
2. New AI agent reads `.ai/AIOS_ENGINEERING_GUIDE.md` for workflow standards
3. New AI agent reads `.ai/PROJECT_STATUS.md` for current project state
4. New AI agent reads latest sprint retrospective and release certificate
5. New AI agent reviews engineering backlog and repository state
6. New AI agent continues workflow from current phase (e.g., begin Product Planning)
7. New AI agent updates documents as required by current phase

**Context Continuity:** All context available in AIOS documents (specifications, logs, certificates, retrospectives, status)

### Replacing Implementation Engineer

**Scenario:** Current Implementation Engineer is replaced with new AI agent during sprint implementation

**Process:**
1. New AI agent reads `.ai/AGENT_PLAYBOOK.md` to understand role responsibilities
2. New AI agent reads approved sprint specification from `.ai/sprints/`
3. New AI agent reads execution log for current sprint status
4. New AI agent reads AIOS coding standards and conventions
5. New AI agent reviews current codebase state
6. New AI agent continues implementation from last completed task
7. New AI agent updates execution log with progress

**Context Continuity:** All context available in sprint specification, execution log, and current codebase state

### Replacing Verification Engineer

**Scenario:** Current Verification Engineer is replaced with new AI agent during verification

**Process:**
1. New AI agent reads `.ai/AGENT_PLAYBOOK.md` to understand role responsibilities
2. New AI agent reads sprint specification and execution log
3. New AI agent reviews completed implementation
4. New AI agent reads verification rules and quality gates
5. New AI agent continues verification from last completed check
6. New AI agent creates release certificate per standards

**Context Continuity:** All context available in sprint specification, execution log, and implementation

## Context Continuity Assurance

All context required for agent replacement is captured in:

1. **Sprint Specification** (`.ai/sprints/`) - Complete sprint context
2. **Execution Log** (`.ai/execution/`) - Implementation progress
3. **Release Certificate** (`.ai/releases/`) - Verification findings
4. **Retrospective** (`.ai/retrospectives/`) - Lessons learned
5. **AIOS Documentation** (`.ai/*.md`) - Architecture and standards
6. **Source Code** - Current implementation state
7. **PROJECT_STATUS.md** - Current project state

## No Workflow Changes Required

The workflow remains identical regardless of which AI agents are performing the roles because:

- **Documents are role-specific, not agent-specific**
- **Quality gates are objective, not subjective**
- **Handoffs are artifact-based, not relationship-based**
- **Standards are documented, not tribal knowledge**
- **Processes are standardized, not improvised**

---

# SECTION 7: Operating Principles

## Core Engineering Principles

1. **AIOS is the Source of Truth**
   - All architectural decisions, coding standards, and workflows are defined in AIOS
   - No individual AI agent may override AIOS without explicit approval
   - AIOS changes only if real engineering problems are discovered

2. **Deliver Product Value Every Sprint**
   - Every sprint must deliver measurable product value to end users
   - Never create sprints whose primary goal is improving AIOS
   - Focus on user impact and business value over technical improvements

3. **Never Redesign Architecture Without Approval**
   - Architecture changes require Architecture Lead review and approval
   - Follow established Architecture Decision Records (ADRs)
   - Respect existing architectural patterns and decisions

4. **Never Skip Independent Verification**
   - Every sprint must be independently verified by Verification Engineer
   - Implementation Engineer cannot verify their own work
   - Security and performance verification are mandatory

5. **Every Sprint Must Leave Repository in Releasable State**
   - Build must pass with zero errors
   - TypeScript compilation must pass with zero errors
   - Tests must pass with zero failures
   - No critical issues or security vulnerabilities

6. **Every Completed Sprint Must Have a Retrospective**
   - Retrospective is mandatory for every completed sprint
   - Lessons learned must be documented
   - AIOS improvements recommended only if engineering problems discovered

7. **PROJECT_STATUS.md Must Always Reflect Latest Project State**
   - Update PROJECT_STATUS.md after each lifecycle phase
   - Ensure all sections are accurate and current
   - Next engineering objective must be documented

8. **Documentation is Part of Definition of Done**
   - Documentation updates are required alongside implementation
   - User guides, API documentation, and component docs must be created
   - AIOS documentation must be updated if features change

9. **Security by Design**
   - Security considerations must be included in all task specifications
   - RBAC and institution isolation must be enforced
   - Security verification is mandatory for every sprint

10. **Quality Over Speed**
    - Never sacrifice quality for speed
    - All quality gates must be passed
    - Zero tolerance for critical issues in production

---

## AIOS Governance

11. **AIOS Modification Governance**
    - No AI agent may modify AIOS documentation during a product sprint unless the sprint explicitly includes an AIOS improvement task or an approved architecture decision
    - AIOS changes require explicit approval from Product Engineering Manager and Architecture Lead
    - AIOS improvements must be versioned (v3.0.1, v3.1.0, etc.) with changelog in `.ai/VERSION.md`
    - This prevents accidental process drift and keeps engineering workflow stable during product development

---

# SECTION 8: Quick Reference

## Engineering Workflow Checklist

**Product Planning**
- [ ] Repository state analyzed
- [ ] AIOS documentation reviewed
- [ ] Sprint history reviewed
- [ ] Engineering backlog analyzed
- [ ] Highest-value objective identified
- [ ] PROJECT_STATUS.md updated

**Sprint Recommendation**
- [ ] Top 5 objectives ranked
- [ ] Single objective recommended
- [ ] Full analysis documented
- [ ] Recommendation saved

**Engineering Contract**
- [ ] Sprint specification created
- [ ] Architecture review completed
- [ ] Feasibility review completed
- [ ] Contract approved
- [ ] Specification saved

**Sprint Implementation**
- [ ] Feature branch created
- [ ] Tasks executed in dependency order
- [ ] Code follows AIOS standards
- [ ] Unit tests written
- [ ] Execution log updated
- [ ] Documentation updated
- [ ] Build and tests pass

**Execution Log**
- [ ] All tasks documented
- [ ] Files modified/created listed
- [ ] Acceptance criteria status recorded
- [ ] Build and test status captured
- [ ] Deviations documented
- [ ] Handoff notes created

**Independent Verification**
- [ ] Sprint specification reviewed
- [ ] Implementation reviewed
- [ ] Acceptance criteria verified
- [ ] Security verification passed
- [ ] Performance verification passed
- [ ] Release certificate created

**Release Report**
- [ ] Sprint summary documented
- [ ] Files changed listed
- [ ] Test results recorded
- [ ] Build and test status captured
- [ ] Known issues documented
- [ ] Release readiness assessed

**Release Certificate**
- [ ] Verification findings documented
- [ ] Release recommendation provided
- [ ] Technical debt noted
- [ ] Release decision recorded

**Sprint Retrospective**
- [ ] Entire lifecycle reviewed
- [ ] Objectives achieved documented
- [ ] Engineering wins identified
- [ ] Challenges documented
- [ ] Lessons learned captured
- [ ] AIOS improvements recommended (if needed)
- [ ] Reusable assets identified
- [ ] Metrics provided
- [ ] Next sprint recommended

**Project Status Update**
- [ ] PROJECT_STATUS.md updated
- [ ] All sections current
- [ ] Next objective documented

**Begin Next Sprint**
- [ ] Retrospective recommendations reviewed
- [ ] Next sprint planning initiated

## Role Responsibility Matrix

| Phase | Responsible Role |
|-------|------------------|
| Product Planning | Product Engineering Manager |
| Sprint Recommendation | Product Engineering Manager |
| Engineering Contract | Product Engineering Manager |
| Sprint Implementation | Implementation Engineer |
| Execution Log | Implementation Engineer |
| Independent Verification | Verification Engineer |
| Release Report | Verification Engineer |
| Release Certificate | Verification Engineer |
| Sprint Retrospective | Product Engineering Manager |
| Project Status Update | Product Engineering Manager |
| Begin Next Sprint | Product Engineering Manager |

## Quick Workflow Summary

**Product Engineering Manager:**
Planning → Recommendation → Contract → Retrospective → Status Update → Next Sprint

**Implementation Engineer:**
Implementation → Execution Log

**Verification Engineer:**
Verification → Release Report → Release Certificate

**Architecture Lead:**
Architecture Review (Contract and Retrospective)

---

**AGENT_PLAYBOOK.md Version:** 1.0
**Classification:** Permanent Engineering Operating Manual
**AIOS Version:** See `.ai/VERSION.md`
**Last Updated:** 2026-07-30
**Next Review:** Only if engineering problems discovered

This document is the permanent workflow manual for all AI agents working on ThaibaHive. Any AI agent can assume any role by reading this document and following the established workflows.