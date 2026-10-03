# ThaibaHive Repository Cleanup Guide

This document outlines:
1. Candidate sensitive and internal files currently in the working tree / documentation that should be reviewed before making the repository public.
2. The exact commands to purge large binary files, test artifacts, and sensitive files from git commit history (e.g. using `git filter-repo` or BFG Repo-Cleaner).

---

## 1. Candidate Sensitive & Internal Files for Review

Before publishing or open-sourcing the repository, the following internal files and directories should be reviewed for removal or redaction:

### Internal Audit & Security Reports
- `AUDIT_REPORT.md` (Contains detailed vulnerability findings, secret analysis, and remediation notes)
- `docs/internal/Claude_bug_scan_findings.md` (Detailed AST and vulnerability scan logs)
- `docs/internal/SECURITY_HEADERS_REPORT.md` (Security header audit results)
- `docs/internal/TGCIS_PROPOSAL_FULFILLMENT_AUDIT.md` (Internal commercial proposal and audit notes)
- `reports/` (Security scan logs, tenant isolation audit outputs, SBOM reports, and benchmark runs)

### Architecture, Planning & Sprint Docs
- `docs/internal/PRD.md`, `docs/internal/PRODUCT.md`, `docs/internal/Phasis.md`, `docs/internal/MASTER_BLUEPRINT.md`
- `docs/internal/Memory.md`, `docs/internal/MASTER_TODO_NEXT.md`, `docs/internal/TODO.md`
- `.ai/` directory (Historical sprint prompt contexts and logs)
- `.planning/` directory (Internal engineering handoff notes)

### Binary Artifacts
- `public/downloads/*.apk` (Android release and debug APK binaries)
- `k6.exe` (Load-testing binary)

---

## 2. Git History Purge Instructions (Large Binaries & Secrets)

> **IMPORTANT**: Rewriting git history modifies commit hashes and requires all collaborators to re-clone the repository. Run these commands only when you are ready to rewrite history.

### Option A: Using `git-filter-repo` (Recommended)

First install `git-filter-repo` (via Python/pip):
```bash
pip install git-filter-repo
```

Make a fresh mirror backup clone before running:
```bash
git clone --mirror https://github.com/your-org/ThaibaHive.git ThaibaHive-backup.git
cd ThaibaHive-backup.git
```

#### Step 1: Purge Large Binary Files and Executables from Entire History
```bash
git filter-repo --invert-paths \
  --path k6.exe \
  --path-glob "*.apk" \
  --path-glob "*.zip" \
  --path-glob "*.tar.gz" \
  --path test-results/ \
  --path load-tests-attendance.log \
  --path migrate_stdout.txt \
  --path migrate_stderr.txt \
  --path build_history.json
```

#### Step 2: Purge Internal Security Reports and Sensitive Documents (Optional)
```bash
git filter-repo --invert-paths \
  --path AUDIT_REPORT.md \
  --path Claude_bug_scan_findings.md \
  --path TGCIS_PROPOSAL_FULFILLMENT_AUDIT.md
```

#### Step 3: Force-push Cleaned History to Remote
```bash
git remote add origin https://github.com/your-org/ThaibaHive.git
git push origin --force --all
git push origin --force --tags
```

---

### Option B: Using BFG Repo-Cleaner

1. Download BFG JAR (`bfg.jar`):
```bash
# Delete all APK files from git history
java -jar bfg.jar --delete-files "*.apk"

# Delete k6 executable from git history
java -jar bfg.jar --delete-files "k6.exe"

# Delete large log files
java -jar bfg.jar --delete-files "*.log"

# Strip all blobs larger than 10MB
java -jar bfg.jar --strip-blobs-bigger-than 10M
```

2. Clean and expire the reflog:
```bash
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

3. Push the cleaned repository:
```bash
git push origin --force --all
```
