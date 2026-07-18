# ThaibaHive Project Terminology

Understanding the specific terminology of this workspace is required to prevent code mismatches and naming errors.

---

## Ecosystem Definitions

### 1. Platforms & Applications
- **ThaibaHive**: The parent/umbrella brand encompassing the web and companion mobile systems.
- **MediaHive**: The sub-platform dedicated to media production assets management, FFmpeg transcoding queues, and ingestion pathways.
- **EduHive**: The school/department management interface layer, handling institutions setup, leave rosters, and administrative checklists.

### 2. Core Entities & Database Terms
- **Institution**: A high-level organizational structure (e.g. a school campus or main office branch). Represented in database via `institutions` table.
- **Department**: A subsection within an Institution (e.g., IT department, Media wing, standard classrooms). Table: `departments`.
- **Sub-department**: Further granular divisions of a department. Table: `sub_departments`.
- **Staff**: Any user/employee registered within the organization directory. Staff members can be associated with multiple departments via `staffDepartments` junction table, and multiple institutions via `staffInstitutions` junction table.
- **Shifts**: Assigned working hour ranges (with predefined start, end, and grace period minutes) mapped to staff members.

### 3. Permissions & Hierarchy Roles
- **super_admin**: Universal bypass authorization (`*`).
- **admin**: General manager.
- **principal**: Institution manager.
- **hod**: Head of Department.
- **staff**: Regular employee.

### 4. Technical / Flow Elements
- **WebView Handoff**: The process where a Flutter companion app uses a single-use *Nonce token exchange* to securely log a user into the Next.js web application inside an embedded WebView wrapper.
- **Jetpack Glance Widget**: The Android home screen widget system implemented via Kotlin Glance APIs, referencing a local cached database (Room) instead of initiating direct external network queries.
- **Shift Grace Period**: The number of minutes after the shift start time during which a staff member is not flagged as "late".
