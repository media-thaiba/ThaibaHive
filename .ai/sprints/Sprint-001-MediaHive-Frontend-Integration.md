# Sprint Metadata

**Sprint ID:** MH-FE-INT-001
**Sprint Name:** MediaHive Frontend Integration
**Status:** Approved
**Created By:** Devin (Product Engineering Lead)
**Date:** 2026-07-30
**Estimated Duration:** 5-6 days (42 hours)
**Risk Level:** Low-Medium

---

# Executive Summary

This sprint completes the MediaHive media library feature by connecting the existing frontend UI (30% complete with mock data) to the production-ready backend API (80% complete). The sprint focuses on frontend integration work, leveraging significant existing backend investment to deliver immediate user value to 23+ campuses. The primary deliverable is a unified API client wrapper that establishes consistent patterns for future features while completing the media library functionality.

---

# Business Value

**Immediate Impact:**
- Completes a high-value feature with minimal additional backend work
- Provides immediate utility for institutional media management across 23+ campuses
- Enables secure file sharing within institutions
- Reduces dependency on third-party file sharing services

**Technical Value:**
- Establishes reusable API client pattern for use across other features
- Reduces technical debt through consistent error handling
- Foundation laid for mobile app media integration
- Improves developer experience with standardized API communication

**Strategic Value:**
- Delivers on core institutional OS capabilities
- Enhances platform competitiveness in education market
- Demonstrates ability to rapidly complete partial features
- Builds confidence in phased development approach

---

# Sprint Goal

Complete the MediaHive media library feature by connecting the existing frontend UI to the production-ready backend API, enabling users to upload, organize, share, and download media files through the web interface.

**Primary Objective:** Deliver a fully functional media library that provides immediate user value to 23+ campuses by leveraging the existing production-ready backend infrastructure.

---

# Current Repository State

**What the repository is capable of today:**
- ✅ Authentication system (JWT, RBAC) fully operational
- ✅ Attendance, Tasks, Leaves, Staff Directory, Bookings modules complete
- ✅ Finance & Reports pages exist but need feature completion (multi-stage approvals)
- ✅ MediaHive backend API 80% complete (upload, share, folders, batch download, auth, rate limiting)
- ❌ MediaHive frontend UI using mock data only (30% complete)
- ❌ Export engine stubbed
- ❌ Activity log API exists but no UI
- ❌ API client wrapper missing (causing error handling patterns issues)

**Planned vs Implemented Gap:**
- MediaHive backend is production-ready with comprehensive features
- Frontend Media Library page exists but disconnected from real API
- This represents the highest-value gap: backend investment not delivering user value

---

# Engineering Objective

Connect the 80% complete MediaHive backend API to the 30% complete frontend UI, replacing mock data with real API integration. Create a unified API client wrapper as a foundational improvement that benefits the entire codebase. Complete all media library features including upload, folders, sharing, batch download, search, and management operations.

---

# Scope

**In Scope:**
1. Unified API client wrapper with automatic authentication, error handling, and retry logic
2. Media library navigation and routing configuration
3. File list view with real API integration (replacing mock data)
4. File upload with progress tracking and chunked upload support
5. Folder navigation and creation with breadcrumb navigation
6. File preview for images, videos, and documents with metadata display
7. Share link generation with expiry dates and password protection
8. Batch download functionality with ZIP archive generation
9. Delete and move operations with confirmation dialogs
10. Search and filtering capabilities with debouncing
11. Comprehensive error handling and loading states
12. Security verification (RBAC, rate limiting, headers)
13. User acceptance testing (UAT) for all workflows
14. Documentation updates (FEATURES.md, CHANGELOG.md, user guides)
15. Implementation notes and handoff materials

**Key Deliverables:**
- Fully functional media library accessible via web interface
- Unified API client wrapper for use across the codebase
- Complete documentation and user guides
- Security verification and performance validation

---

# Out of Scope

**Explicitly Out of Scope:**
- Database schema changes (use existing media tables)
- Backend API modifications (backend is production-ready)
- Mobile app media integration (separate track)
- Media transcoding and live streaming (future phase)
- NAS sync functionality (future phase)
- Advanced media editing capabilities (future phase)
- Export engine completion (separate sprint)
- Activity log UI implementation (separate sprint)

**Rationale:**
- Focus on completing the highest-value gap with minimal risk
- Avoid scope creep by staying within frontend integration
- Leverage existing backend investment without modification
- Establish patterns before expanding to other features

---

# Dependencies

**Technical Dependencies:**
- Existing MediaHive backend API (`src/app/api/media/*`)
- Database schema with media tables (`packages/db/schema.ts`)
- Authentication system (`packages/auth/` with JWT, RBAC)
- Supabase Storage integration for file storage
- Existing UI components from `src/components/ui/`
- Toast notification system (`src/components/ui/toast`)
- Zod validation schemas (`src/lib/validation/schemas.ts`)

**External Dependencies:**
- None new (no additional packages required)
- Resend and @vercel/functions may be needed for email features (future)

**Task Dependencies:**
- MH-001 (API client) is foundational for all other tasks
- MH-003 (list view) required for MH-004 through MH-010
- MH-005 (folders) required for MH-009 (move operations)
- MH-014 (UAT) requires completion of MH-001 through MH-011
- MH-015 (documentation) requires MH-014 completion

---

# Task Breakdown

### Task MH-001: Create Unified API Client Wrapper

**Task ID:** MH-001
**Title:** Create Unified API Client Wrapper
**Objective:** Establish a consistent, type-safe API client with automatic authentication, error handling, and retry logic

**Description:**
Create `src/lib/api/client.ts` as the single source of truth for all API communications. The client will automatically inject JWT tokens from httpOnly cookies, handle errors with toast notifications, implement retry logic with exponential backoff, and provide type-safe request/response parsing. This addresses the technical debt of inconsistent API calling patterns across the codebase.

**Dependencies:** None (foundational task)

**Acceptance Criteria:**
- [ ] Client wrapper exports `api.get()`, `api.post()`, `api.put()`, `api.delete()`, `api.patch()`
- [ ] All requests automatically include JWT from httpOnly cookies
- [ ] Errors trigger toast notifications via existing toast system (`src/components/ui/toast`)
- [ ] Failed requests retry once with exponential backoff (1s, 2s, 4s delays)
- [ ] TypeScript types defined for request/response payloads
- [ ] Loading state can be tracked via optional `onLoading` callback
- [ ] Network errors (offline, timeout) show specific user-friendly messages
- [ ] Permission errors (401, 403) trigger redirect to login or show access denied
- [ ] Rate limit errors (429) show retry-after information
- [ ] Request/response logging in development mode only

**Expected Files/Modules:**
- **NEW:** `src/lib/api/client.ts` (main API client implementation)
- **MODIFY:** `src/lib/validation/schemas.ts` (add API response schemas if needed)

**Verification Method:**
1. Unit tests for client methods (mock fetch, verify cookie injection, retry logic)
2. Integration test with real API endpoint (verify auth flow)
3. Manual testing: call authenticated endpoint, verify token injection
4. Error simulation: trigger 401, 403, 429, 500 errors, verify toast messages
5. TypeScript compilation: verify type safety

**Estimated Effort:** 4 hours

**Risk Level:** Low

---

### Task MH-002: Add Media API Endpoints to Navigation Whitelist

**Task ID:** MH-002
**Title:** Add Media API Endpoints to Navigation Whitelist
**Objective:** Configure navigation and routing to enable access to media library features

**Description:**
Update `src/config/navigation.ts` to add the media library route to the enabled paths whitelist and configure role-based access permissions. This ensures authenticated users can access the media library while maintaining security boundaries.

**Dependencies:** None

**Acceptance Criteria:**
- [ ] `/media-library` added to `ENABLED_PATHS` in navigation config
- [ ] `/api/media/*` routes added to API whitelist
- [ ] Role-based access configured: staff (read-only), admin (full access)
- [ ] Route properly integrated with shell layout
- [ ] Navigation menu includes media library link for authorized roles
- [ ] Route inaccessible to unauthenticated users (redirects to login)
- [ ] Route inaccessible to unauthorized roles (shows 403 or access denied)

**Expected Files/Modules:**
- **MODIFY:** `src/config/navigation.ts` (navigation configuration)

**Verification Method:**
1. Manual testing: access `/media-library` as authenticated staff user
2. Manual testing: access `/media-library` as authenticated admin user
3. Manual testing: access `/media-library` as unauthenticated user (verify redirect)
4. Manual testing: verify navigation menu link appears for authorized roles
5. Manual testing: verify API routes accessible via direct fetch

**Estimated Effort:** 1 hour

**Risk Level:** Low

---

### Task MH-003: Wire Media Library List View to Real API

**Task ID:** MH-003
**Title:** Wire Media Library List View to Real API
**Objective:** Replace mock data with real API integration for the media library file list

**Description:**
Replace the mock data implementation in `src/app/(shell)/media-library/page.tsx` with real API calls to `GET /api/media/files`. Implement loading states, empty states, and error handling. Display file metadata including name, size, type, upload date, and uploader.

**Dependencies:** MH-001 (API client wrapper)

**Acceptance Criteria:**
- [ ] Page fetches real files from `GET /api/media/files` API
- [ ] Loading skeleton shown during initial fetch
- [ ] Empty state displayed when no files exist (with appropriate message)
- [ ] File metadata displayed correctly: name, size (formatted), type, upload date, uploader
- [ ] File type icons match file extensions (image, video, document, other)
- [ ] Errors handled with user-friendly toast messages
- [ ] Pagination implemented if file count > 50
- [ ] Refresh functionality available (manual refresh button)
- [ ] Institution isolation enforced (only shows files from user's institution)

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (main media library page)

**Verification Method:**
1. Manual testing: load page with existing files, verify list displays correctly
2. Manual testing: load page with no files, verify empty state
3. Manual testing: trigger API error (500), verify error message
4. Manual testing: verify pagination works with >50 files
5. Manual testing: verify file metadata accuracy
6. Cross-institution test: verify user cannot see files from other institutions

**Estimated Effort:** 3 hours

**Risk Level:** Low

---

### Task MH-004: Implement File Upload with Progress Tracking

**Task ID:** MH-004
**Title:** Implement File Upload with Progress Tracking
**Objective:** Enable users to upload files with real-time progress tracking and chunked upload support

**Description:**
Implement file upload functionality using the existing chunked upload backend API. Create an upload progress component that shows per-file and overall progress. Handle file selection, drag-and-drop, chunked uploads for large files (>10MB), error handling, and retry logic.

**Dependencies:** MH-001 (API client wrapper), MH-003 (list view)

**Acceptance Criteria:**
- [ ] Users can select multiple files via file dialog
- [ ] Drag-and-drop zone functional for file selection
- [ ] Upload progress displayed per file (percentage, speed, time remaining)
- [ ] Overall upload progress shown (files completed/total)
- [ ] Large files (>10MB) automatically chunked (reuse backend logic)
- [ ] Failed uploads can be retried individually
- [ ] Upload errors show specific failure reasons (file type, size, network)
- [ ] Upload completes and file appears in list automatically
- [ ] File type restrictions enforced (block executables: .exe, .bat, .sh)
- [ ] File size restrictions enforced (max 100MB per file)
- [ ] Upload queue management (pause, cancel, retry all)

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add upload functionality)
- **NEW:** `src/components/ui/upload-progress.tsx` (upload progress component)
- **NEW:** `src/components/ui/dropzone.tsx` (drag-and-drop zone)

**Verification Method:**
1. Manual testing: upload single small file (<1MB), verify progress and completion
2. Manual testing: upload multiple files, verify queue and progress
3. Manual testing: upload large file (>10MB), verify chunking and progress
4. Manual testing: upload invalid file type (.exe), verify rejection
5. Manual testing: upload oversized file (>100MB), verify rejection
6. Manual testing: interrupt upload (network disconnect), verify retry functionality
7. Manual testing: drag-and-drop files, verify functionality

**Estimated Effort:** 6 hours

**Risk Level:** Medium

---

### Task MH-005: Connect Folder Navigation and Creation

**Task ID:** MH-005
**Title:** Connect Folder Navigation and Creation
**Objective:** Implement folder hierarchy navigation and creation functionality

**Description:**
Implement folder operations including fetching folder structure from the API, creating new folders, navigating folder hierarchy, and breadcrumb navigation. Create a folder tree component for sidebar navigation and ensure folder creation validates name uniqueness.

**Dependencies:** MH-003 (list view)

**Acceptance Criteria:**
- [ ] Folder tree displayed in sidebar with expand/collapse functionality
- [ ] Users can create new folders via "New Folder" button
- [ ] Folder creation validates name uniqueness within parent folder
- [ ] Users can create nested folders (folders within folders)
- [ ] Breadcrumb navigation shows current path (e.g., Media > Documents > 2026)
- [ ] Clicking folders in tree navigates to folder contents
- [ ] Clicking breadcrumbs navigates to parent folders
- [ ] Folder icons differentiate between empty and non-empty folders
- [ ] Folder renaming functionality available
- [ ] Folder deletion with confirmation (if empty)

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add folder operations)
- **NEW:** `src/components/ui/folder-tree.tsx` (folder navigation tree)
- **NEW:** `src/components/ui/breadcrumbs.tsx` (breadcrumb navigation)

**Verification Method:**
1. Manual testing: create folder in root, verify appears in tree
2. Manual testing: create nested folder, verify hierarchy
3. Manual testing: navigate folders via tree, verify contents update
4. Manual testing: navigate via breadcrumbs, verify path updates
5. Manual testing: create duplicate folder name, verify error
6. Manual testing: rename folder, verify name updates
7. Manual testing: delete empty folder, verify removal

**Estimated Effort:** 4 hours

**Risk Level:** Low

---

### Task MH-006: Implement File Preview and Metadata Display

**Task ID:** MH-006
**Title:** Implement File Preview and Metadata Display
**Objective:** Add file preview functionality for images, videos, and documents with metadata display

**Description:**
Implement file preview functionality that allows users to view images and videos directly in the browser. Create a preview modal component that displays the file and associated metadata. Implement file size formatting (KB, MB, GB) and file type icons.

**Dependencies:** MH-003 (list view)

**Acceptance Criteria:**
- [ ] Clicking image file opens preview modal
- [ ] Image preview supports zoom in/out
- [ ] Video files play in browser HTML5 player
- [ ] Video player includes play/pause, volume, fullscreen controls
- [ ] Metadata panel shows EXIF data (where available): dimensions, duration, format
- [ ] File sizes displayed in human-readable format (KB, MB, GB)
- [ ] File type icons match file extensions (image, video, document, other)
- [ ] Preview modal supports keyboard navigation (ESC to close, arrow keys for next/prev)
- [ ] Download button available in preview modal
- [ ] Share button available in preview modal

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add preview functionality)
- **NEW:** `src/components/ui/file-preview.tsx` (file preview modal)
- **NEW:** `src/components/ui/metadata-panel.tsx` (metadata display)

**Verification Method:**
1. Manual testing: preview image file, verify modal and zoom
2. Manual testing: preview video file, verify player controls
3. Manual testing: preview document, verify metadata display
4. Manual testing: verify file size formatting accuracy
5. Manual testing: verify file type icons match extensions
6. Manual testing: keyboard navigation (ESC, arrows)
7. Manual testing: download and share buttons in preview

**Estimated Effort:** 3 hours

**Risk Level:** Low

---

### Task MH-007: Add Share Link Generation and Management

**Task ID:** MH-007
**Title:** Add Share Link Generation and Management
**Objective:** Implement shareable link generation with expiry dates, password protection, and link management

**Description:**
Implement share functionality that allows users to generate shareable links for files. Include options for expiry dates (1hr, 24hr, 7d, never) and optional password protection. Enable link copying to clipboard, management of existing shares, and revocation of share links.

**Dependencies:** MH-003 (list view)

**Acceptance Criteria:**
- [ ] Share dialog accessible from file context menu
- [ ] Users can set expiry options: 1 hour, 24 hours, 7 days, never
- [ ] Optional password protection for share links
- [ ] Generated link copies to clipboard automatically
- [ ] Active shares listed in file details panel
- [ ] Share links can be revoked (delete)
- [ ] Share link shows access count (times accessed)
- [ ] Share link shows creation date and expiry status
- [ ] Password-protected links require password before access
- [ ] Expired links show appropriate error message

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add share functionality)
- **NEW:** `src/components/ui/share-dialog.tsx` (share link configuration dialog)
- **NEW:** `src/components/ui/share-list.tsx` (active shares list)

**Verification Method:**
1. Manual testing: generate share link without password, verify access
2. Manual testing: generate share link with password, verify password requirement
3. Manual testing: set expiry to 1 hour, verify link expires
4. Manual testing: copy link to clipboard, verify clipboard content
5. Manual testing: revoke share link, verify access denied
6. Manual testing: view active shares list, verify accuracy
7. Manual testing: access count increments on each access

**Estimated Effort:** 4 hours

**Risk Level:** Medium

---

### Task MH-008: Integrate Batch Download Functionality

**Task ID:** MH-008
**Title:** Integrate Batch Download Functionality
**Objective:** Enable users to select multiple files and download them as a single ZIP archive

**Description:**
Implement batch download functionality that allows users to select multiple files via checkboxes and trigger a ZIP download. Show download progress during ZIP generation and handle large file sets. Integrate with existing backend batch download API.

**Dependencies:** MH-003 (list view)

**Acceptance Criteria:**
- [ ] Checkboxes appear on file list items for selection
- [ ] "Select All" checkbox available for bulk selection
- [ ] "Download Selected" button appears when files selected
- [ ] Download triggers ZIP generation via backend API
- [ ] Progress shown during ZIP creation
- [ ] Browser automatically downloads ZIP file when ready
- [ ] ZIP file contains all selected files with proper structure
- [ ] Large file sets (>20 files) handled without timeout
- [ ] Download cancellation available during ZIP generation
- [ ] Download progress shows estimated time remaining

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add batch download)
- **NEW:** `src/components/ui/download-progress.tsx` (download progress indicator)

**Verification Method:**
1. Manual testing: select single file, download as ZIP
2. Manual testing: select multiple files, download as ZIP
3. Manual testing: select all files, download as ZIP
4. Manual testing: verify ZIP contents match selected files
5. Manual testing: download large file set (>20 files), verify progress
6. Manual testing: cancel download during generation, verify cancellation
7. Manual testing: verify ZIP file structure and integrity

**Estimated Effort:** 3 hours

**Risk Level:** Low

---

### Task MH-009: Add Delete and Move Operations

**Task ID:** MH-009
**Title:** Add Delete and Move Operations
**Objective:** Implement file and folder management operations including deletion and moving between folders

**Description:**
Implement file management operations including delete (with confirmation), move between folders, and bulk delete operations. Create confirmation dialogs for destructive operations and ensure proper permission checks.

**Dependencies:** MH-005 (folder navigation)

**Acceptance Criteria:**
- [ ] Delete option available in file context menu
- [ ] Confirmation dialog shown before deletion
- [ ] Files moved to trash or permanently deleted (configurable)
- [ ] Move operation available in file context menu
- [ ] Folder selection dialog for move target
- [ ] Bulk delete available for multiple selections
- [ ] Delete and move operations respect RBAC permissions
- [ ] Operations show success/error toast notifications
- [ ] File list updates immediately after operation
- [ ] Undo functionality available for delete (move to trash scenario)

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add delete/move)
- **NEW:** `src/components/ui/confirm-dialog.tsx` (confirmation dialog)
- **NEW:** `src/components/ui/folder-selector.tsx` (folder selection dialog)

**Verification Method:**
1. Manual testing: delete single file, verify confirmation and removal
2. Manual testing: move file to different folder, verify location change
3. Manual testing: bulk delete multiple files, verify all removed
4. Manual testing: verify RBAC (staff cannot delete, admin can)
5. Manual testing: undo delete (if trash implemented), verify restoration
6. Manual testing: error scenarios (network error during delete)

**Estimated Effort:** 3 hours

**Risk Level:** Medium

---

### Task MH-010: Implement Search and Filtering

**Task ID:** MH-010
**Title:** Implement Search and Filtering
**Objective:** Add search capabilities and filter options for file discovery

**Description:**
Implement search functionality that allows users to search by filename and filter by file type, date range, and upload user. Include real-time search debouncing and a clear filters button to reset the view.

**Dependencies:** MH-003 (list view)

**Acceptance Criteria:**
- [ ] Search bar filters file list in real-time
- [ ] Search debounced with 300ms delay
- [ ] File type filter dropdown (images, videos, documents, all)
- [ ] Date range picker filters by upload date
- [ ] Filter by upload user (show all users in institution)
- [ ] Clear filters button resets view to default
- [ ] Search and filters work together (combined criteria)
- [ ] Search results highlighted with matching text
- [ ] Empty search results show appropriate message
- [ ] Search URL parameters support (shareable search URLs)

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add search/filter)
- **NEW:** `src/components/ui/search-bar.tsx` (search input with debounce)
- **NEW:** `src/components/ui/filter-panel.tsx` (filter options)

**Verification Method:**
1. Manual testing: search by filename, verify results
2. Manual testing: filter by file type, verify results
3. Manual testing: filter by date range, verify results
4. Manual testing: combine search + filters, verify combined results
5. Manual testing: clear filters, verify reset
6. Manual testing: verify debouncing (rapid typing doesn't trigger excessive API calls)
7. Manual testing: share search URL, verify filters preserved

**Estimated Effort:** 3 hours

**Risk Level:** Low

---

### Task MH-011: Add Error Handling and Loading States

**Task ID:** MH-011
**Title:** Add Error Handling and Loading States
**Objective:** Implement comprehensive error handling and loading states for all async operations

**Description:**
Add comprehensive error handling and loading states across all media library operations. Ensure API errors trigger toast notifications, loading skeletons show during async operations, offline detection works, and permission errors are handled gracefully.

**Dependencies:** MH-003 through MH-010 (all feature tasks)

**Acceptance Criteria:**
- [ ] All API errors trigger toast notifications
- [ ] Loading skeletons shown during all async operations
- [ ] Offline detection and user notification
- [ ] Permission errors (403) show appropriate access denied message
- [ ] Network errors suggest retry option
- [ ] Form validation errors show inline with fields
- [ ] Loading states prevent duplicate operations (disable buttons)
- [ ] Error boundaries catch React component errors
- [ ] Retry mechanism for failed operations
- [ ] Error logging in development mode

**Expected Files/Modules:**
- **MODIFY:** `src/app/(shell)/media-library/page.tsx` (add error handling)
- **MODIFY:** `src/lib/api/client.ts` (enhance error handling)
- **NEW:** `src/components/ui/error-boundary.tsx` (React error boundary)

**Verification Method:**
1. Manual testing: disconnect network, verify offline detection
2. Manual testing: trigger 403 error, verify access denied message
3. Manual testing: trigger 500 error, verify server error message
4. Manual testing: trigger network timeout, verify retry suggestion
5. Manual testing: trigger form validation, verify inline errors
6. Manual testing: verify loading states prevent duplicate submissions
7. Manual testing: cause React error, verify error boundary catches it

**Estimated Effort:** 2 hours

**Risk Level:** Low

---

### Task MH-012: Test Authentication and Permission Checks

**Task ID:** MH-012
**Title:** Test Authentication and Permission Checks
**Objective:** Verify security controls including RBAC permissions, JWT validation, and institution isolation

**Description:**
Comprehensive security testing to verify that authentication and authorization work correctly. Test RBAC permissions (staff vs admin), JWT token validation, unauthorized access attempts, institution isolation, and cross-institution access prevention.

**Dependencies:** None (verification task)

**Acceptance Criteria:**
- [ ] Staff users can only read, not delete or modify
- [ ] Admin users have full access (read, write, delete)
- [ ] Unauthenticated users redirected to login
- [ ] Users cannot access other institutions' files
- [ ] API returns 403 for unauthorized operations
- [ ] JWT token expiration handled correctly
- [ ] Session timeout redirects to login
- [ ] Permission checks on all API endpoints
- [ ] Institution isolation enforced on all queries
- [ ] Cross-institution access attempts logged for security audit

**Expected Files/Modules:**
- **VERIFY:** `src/app/api/media/*` (API endpoints)
- **VERIFY:** `src/lib/api/auth-guard.ts` (auth wrapper)
- **VERIFY:** `packages/auth/roles.ts` (role definitions)

**Verification Method:**
1. Security test: login as staff, attempt delete operation, verify 403
2. Security test: login as admin, attempt delete operation, verify success
3. Security test: access without authentication, verify redirect to login
4. Security test: attempt to access other institution's file ID, verify 404/403
5. Security test: expire JWT token, verify redirect to login
6. Security test: manual API call with invalid token, verify 401
7. Security test: verify all API endpoints have requireAuth wrapper
8. Security test: verify institution isolation on database queries

**Estimated Effort:** 2 hours

**Risk Level:** Low

---

### Task MH-013: Verify Rate Limiting and Security Headers

**Task ID:** MH-013
**Title:** Verify Rate Limiting and Security Headers
**Objective:** Validate security controls including rate limiting, brute-force protection, and security headers

**Description:**
Security validation to ensure rate limiting is enforced on upload endpoints, brute-force protection is active on share links, security headers are present on media responses, file type restrictions are enforced, and malware scanning integration works.

**Dependencies:** None (verification task)

**Acceptance Criteria:**
- [ ] Upload rate limits enforced (10 requests per minute per user)
- [ ] Share link brute-force protection active (3 attempts per minute)
- [ ] Security headers present on all responses (X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] Executable files blocked from upload (.exe, .bat, .sh, .dll)
- [ ] Large files (>100MB) rejected with appropriate error
- [ ] Malware scanning integration functional (if backend implements)
- [ ] CORS headers configured correctly
- [ ] Content-Security-Policy headers prevent XSS
- [ ] Rate limit errors show retry-after information
- [ ] Security headers prevent clickjacking and MIME sniffing

**Expected Files/Modules:**
- **VERIFY:** `src/lib/api/rate-limit.ts` (rate limiting configuration)
- **VERIFY:** `src/proxy.ts` (security headers middleware)
- **VERIFY:** `src/app/api/media/upload/route.ts` (upload endpoint)

**Verification Method:**
1. Security test: rapid upload attempts (>10/min), verify rate limit
2. Security test: brute-force share link password attempts, verify protection
3. Security test: inspect response headers, verify security headers present
4. Security test: upload executable file, verify rejection
5. Security test: upload oversized file, verify rejection
6. Security test: verify CORS headers allow only authorized origins
7. Security test: verify CSP headers prevent inline scripts
8. Security test: verify rate limit response includes retry-after header

**Estimated Effort:** 2 hours

**Risk Level:** Low

---

### Task MH-014: User Acceptance Testing (UAT)

**Task ID:** MH-014
**Title:** User Acceptance Testing (UAT)
**Objective:** End-to-end testing of all user workflows to ensure feature meets requirements

**Description:**
Comprehensive end-to-end testing of all media library workflows including upload, folder navigation, share links, batch download, search, and mobile responsiveness. Test with real file types (images, videos, PDFs) and verify the feature delivers expected user value.

**Dependencies:** MH-001 through MH-011 (all implementation tasks)

**Acceptance Criteria:**
- [ ] Complete upload workflow works end-to-end (select, upload, verify in list)
- [ ] Folder navigation intuitive and bug-free (create, navigate, rename, delete)
- [ ] Share links work for anonymous users (access, password, expiry)
- [ ] Batch download produces valid ZIP with correct contents
- [ ] Search returns accurate results with filters
- [ ] UI responsive on mobile viewport (<768px)
- [ ] All file types preview correctly (images, videos, PDFs)
- [ ] Error messages are user-friendly and actionable
- [ ] Performance acceptable (file list <2s, uploads smooth)
- [ ] Accessibility WCAG 2.1 AA compliant (keyboard nav, screen reader)

**Expected Files/Modules:**
- **VERIFY:** `src/app/(shell)/media-library/page.tsx` (main page)
- **VERIFY:** `src/components/ui/*` (all new components)
- **VERIFY:** Browser dev tools (performance, accessibility audit)

**Verification Method:**
1. UAT workflow: upload 5 files of different types, verify all appear
2. UAT workflow: create folder structure 3 levels deep, navigate all
3. UAT workflow: generate share link, access as anonymous user
4. UAT workflow: select 10 files, batch download, verify ZIP
5. UAT workflow: search for specific file, verify found
6. UAT workflow: test on mobile device (responsive design)
7. UAT workflow: keyboard navigation (tab, enter, escape, arrows)
8. UAT workflow: screen reader test (NVDA/JAWS)
9. Performance test: load 100 files, measure load time
10. Accessibility audit: Lighthouse accessibility score

**Estimated Effort:** 4 hours

**Risk Level:** Low

---

### Task MH-015: Documentation and Handoff

**Task ID:** MH-015
**Title:** Documentation and Handoff
**Objective:** Complete all documentation updates and create handoff materials for next sprint

**Description:**
Update AIOS documentation to reflect MediaHive completion, document API client usage patterns for future features, add MediaHive section to user guide, update CHANGELOG with version 1.3.0, and create implementation notes for the next sprint.

**Dependencies:** MH-014 (UAT complete)

**Acceptance Criteria:**
- [ ] `.ai/FEATURES.md` shows MediaHive as "Complete"
- [ ] API client documented with usage examples and patterns
- [ ] User guide includes MediaHive section (how-to, screenshots)
- [ ] `.ai/CHANGELOG.md` updated with v1.3.0 release notes
- [ ] Implementation notes created for next sprint
- [ ] Known issues and limitations documented
- [ ] Future enhancement suggestions recorded
- [ ] API client migration guide for existing endpoints
- [ ] Handoff checklist completed
- [ ] No context gaps for next sprint

**Expected Files/Modules:**
- **MODIFY:** `.ai/FEATURES.md` (feature registry)
- **MODIFY:** `.ai/CHANGELOG.md` (changelog)
- **NEW:** `docs/api-client-guide.md` (API client documentation)
- **NEW:** `docs/mediahive-user-guide.md` (user guide)
- **NEW:** `.planning/handoff-mh-fe-int.md` (handoff notes)

**Verification Method:**
1. Documentation review: verify FEATURES.md updated correctly
2. Documentation review: verify CHANGELOG.md includes all changes
3. Documentation review: verify API client guide is comprehensive
4. Documentation review: verify user guide includes screenshots
5. Handoff review: verify implementation notes capture all decisions
6. Handoff review: verify known issues documented
7. Handoff review: verify no context gaps for next sprint

**Estimated Effort:** 2 hours

**Risk Level:** Low

---

# Overall Acceptance Criteria

### Functional Requirements
- [ ] Users can upload files (images, videos, documents) with progress tracking
- [ ] Users can organize files in folders with nested hierarchy
- [ ] Users can preview images and videos in browser
- [ ] Users can generate shareable links with expiry and password protection
- [ ] Users can batch download files as ZIP
- [ ] Users can search and filter files by name, type, and date
- [ ] Users can delete and move files with confirmation
- [ ] All operations respect RBAC permissions (staff: read, admin: write)

### Non-Functional Requirements
- [ ] API client wrapper provides consistent error handling
- [ ] All async operations show loading states
- [ ] Rate limiting enforced on upload endpoints
- [ ] Security headers present on all responses
- [ ] Institution isolation enforced (no cross-tenant leakage)
- [ ] Mobile-responsive UI works on <768px viewports
- [ ] File type restrictions prevent executable uploads

### Quality Requirements
- [ ] TypeScript compilation passes with zero errors
- [ ] Linting passes with zero new warnings
- [ ] Unit tests pass for API client wrapper
- [ ] E2E tests pass for critical user workflows
- [ ] No console errors in browser dev tools
- [ ] Performance: file list loads in <2s for 100 files

### Security Requirements
- [ ] RBAC permissions enforced on all operations
- [ ] JWT token validation working correctly
- [ ] Institution isolation prevents cross-tenant access
- [ ] Rate limiting prevents abuse
- [ ] Security headers prevent XSS and clickjacking
- [ ] File type restrictions prevent malware upload

---

# Definition of Done

1. **Code Complete:** All 15 tasks implemented and committed to repository
2. **Testing Complete:** UAT passed for all functional and non-functional acceptance criteria
3. **Documentation Complete:** FEATURES.md, CHANGELOG.md, and API client documentation updated
4. **Quality Gates:** TypeScript compilation passes with zero errors, linting passes with zero new warnings
5. **Security Verified:** RBAC permissions, rate limiting, and security headers validated
6. **Performance Verified:** File list loads in <2s for 100 files, uploads progress smoothly
7. **Handoff Ready:** Implementation notes created for next sprint, no context gaps

---

# Release Impact

### Before Sprint
- MediaHive backend complete but unusable via web UI
- Frontend shows mock data only, no real functionality
- No user value delivered from significant media API investment
- Technical debt: inconsistent API calling patterns across codebase

### After Sprint
- ✅ Fully functional media library accessible via web interface
- ✅ Users can upload, organize, share, and download media files
- ✅ Media feature delivers immediate user value to 23+ campuses
- ✅ Foundation laid for mobile app media integration
- ✅ API client pattern established for use across other features
- ✅ Reduced technical debt through consistent error handling

### Business Value
- Completes a high-value feature with minimal additional backend work
- Provides immediate utility for institutional media management
- Enables secure file sharing within institutions
- Reduces dependency on third-party file sharing services
- Establishes reusable patterns for future API integrations

---

# Rollback Considerations

### Rollback Triggers
- Critical security vulnerabilities discovered in API client implementation
- Performance degradation (>5s load times) on file list operations
- Data corruption in media file metadata during operations
- Cross-institution data leakage detected
- Breaking changes to existing authentication flow

### Rollback Procedure
1. **Immediate Rollback:** Revert to commit before sprint start using `git revert`
2. **Data Cleanup:** No data cleanup required (no schema changes)
3. **Configuration Restore:** Revert `src/config/navigation.ts` changes
4. **Dependency Rollback:** Remove new dependencies if added (resend, @vercel/functions)
5. **Communication:** Notify stakeholders of rollback and timeline for fix

### Rollback Risk Assessment
- **Low Risk:** No database schema changes, no data migration
- **Low Risk:** No changes to authentication system
- **Medium Risk:** New API client wrapper may affect other parts of system if adopted
- **Mitigation:** API client wrapper introduced as new import, existing code unchanged

---

# Implementation Notes

### Technical Constraints
1. **No Schema Changes:** Do not modify database schemas - use existing media tables
2. **No Backend Changes:** Backend API is production-ready, focus on frontend integration
3. **Follow Conventions:** Use existing UI components from `src/components/ui/`
4. **Type Safety:** Maintain TypeScript strict mode compliance
5. **Error Handling:** Use the new API client wrapper for all API calls

### Integration Points
1. **Authentication:** JWT tokens stored in httpOnly cookies, use existing `requireAuth` wrapper
2. **Storage:** Supabase Storage for file storage, local `/uploads/` fallback in dev
3. **Rate Limiting:** Existing rate limiter in `src/lib/api/rate-limit.ts`
4. **Validation:** Use Zod schemas from `src/lib/validation/schemas.ts`
5. **Toast System:** Existing toast notification system in `src/components/ui/toast`

### Performance Considerations
1. **Lazy Loading:** Implement lazy loading for file list pagination
2. **Image Optimization:** Use Next.js Image component for thumbnails
3. **Debouncing:** Implement 300ms debounce for search and filter operations
4. **Chunked Upload:** Reuse backend chunking logic for files >10MB
5. **Caching:** Consider TanStack Query for API response caching

### Security Considerations
1. **Institution Isolation:** All API calls must include institution context
2. **RBAC:** Respect role permissions (staff: read, admin: write)
3. **File Validation:** Validate file types on both client and server
4. **Share Links:** Implement brute-force protection for password-protected links
5. **XSS Prevention:** Sanitize all user inputs, use React's built-in escaping

### Testing Strategy
1. **Unit Tests:** Test API client wrapper with mocked fetch
2. **Integration Tests:** Test API endpoints with real database
3. **E2E Tests:** Use Playwright for critical user workflows
4. **Security Tests:** Verify RBAC, rate limiting, and security headers
5. **Performance Tests:** Measure load times for 100+ files

### Rollback Plan
If critical issues arise:
1. Revert to pre-sprint commit using `git revert`
2. No data cleanup required (no schema changes)
3. Restore `src/config/navigation.ts` to previous state
4. Remove new dependencies if added
5. Communicate rollback to stakeholders

### Success Metrics
1. **User Adoption:** Media library used by 50% of staff within 1 week
2. **Performance:** File list loads in <2s for 100 files
3. **Reliability:** 99.9% uptime for media API endpoints
4. **Security:** Zero security incidents in first month
5. **Satisfaction:** User satisfaction score >4.0/5.0

---

# Handoff Instructions for Antigravity

### Sprint Overview
This sprint focuses on frontend integration work, connecting the existing MediaHive backend API to the frontend UI. The primary deliverable is a unified API client wrapper that establishes consistent patterns for the entire codebase while completing the media library functionality.

### Implementation Priority
1. **Foundation First:** Complete MH-001 (API client) before any other task
2. **Core Functionality:** Focus on MH-003 (list view) and MH-004 (upload) as highest priority
3. **User Value:** Complete features in order of user impact (upload > folders > share > download)
4. **Quality Gates:** Do not proceed to MH-014 (UAT) until MH-011 (error handling) is complete

### Critical Constraints
1. **No Schema Changes:** Do not modify database schemas under any circumstances
2. **No Backend Changes:** Backend API is production-ready, do not modify
3. **Type Safety:** Maintain TypeScript strict mode, resolve all type errors
4. **Error Handling:** Use the new API client wrapper for all API calls
5. **Security:** All operations must respect RBAC and institution isolation

### Integration Requirements
1. **Authentication:** Use existing `requireAuth` wrapper, do not modify auth flow
2. **Storage:** Use Supabase Storage, do not change storage configuration
3. **Rate Limiting:** Use existing rate limiter, do not modify rate limits
4. **Validation:** Use Zod schemas, do not create new validation systems
5. **UI Components:** Use existing UI components from `src/components/ui/`

### Testing Requirements
1. **Unit Tests:** Must write unit tests for API client wrapper
2. **Integration Tests:** Test API endpoints with real database
3. **Security Tests:** Verify RBAC, rate limiting, and security headers
4. **Performance Tests:** Measure load times for 100+ files
5. **UAT:** Complete end-to-end testing before documentation

### Documentation Requirements
1. **API Client Guide:** Must document usage patterns and examples
2. **User Guide:** Must include MediaHive section with screenshots
3. **FEATURES.md:** Must update MediaHive status to "Complete"
4. **CHANGELOG.md:** Must document all changes in v1.3.0
5. **Handoff Notes:** Must capture all decisions and context

### Rollback Protocol
If critical issues arise during implementation:
1. Stop immediately and assess the issue
2. Determine if rollback is necessary
3. If rollback needed: revert to pre-sprint commit
4. Document the issue and resolution
5. Communicate with stakeholders

### Success Criteria
1. All 15 tasks completed and verified
2. All acceptance criteria met
3. TypeScript compilation passes with zero errors
4. Linting passes with zero new warnings
5. Security audit completed
6. Performance testing completed
7. Documentation updated
8. No context gaps for next sprint

---

# Verification Checklist for Opencoder

### Code Quality
- [ ] TypeScript compilation passes with zero errors
- [ ] Linting passes with zero new warnings
- [ ] All new files follow project conventions
- [ ] Code is well-documented with comments
- [ ] No console.log statements left in production code

### Functionality
- [ ] All 15 tasks completed as specified
- [ ] All acceptance criteria met
- [ ] Feature works end-to-end
- [ ] Error handling is comprehensive
- [ ] Loading states are implemented

### Security
- [ ] RBAC permissions enforced correctly
- [ ] Institution isolation working
- [ ] Rate limiting enforced
- [ ] Security headers present
- [ ] File type restrictions working

### Performance
- [ ] File list loads in <2s for 100 files
- [ ] Upload progress is smooth
- [ ] No memory leaks detected
- [ ] No performance regressions
- [ ] Lazy loading implemented

### Testing
- [ ] Unit tests pass for API client
- [ ] Integration tests pass
- [ ] E2E tests pass for critical workflows
- [ ] Security tests pass
- [ ] Performance tests pass

### Documentation
- [ ] FEATURES.md updated
- [ ] CHANGELOG.md updated
- [ ] API client guide created
- [ ] User guide created
- [ ] Handoff notes created

### Handoff
- [ ] Implementation notes complete
- [ ] Known issues documented
- [ ] Future enhancements recorded
- [ ] No context gaps
- [ ] Ready for next sprint

---

# Known Risks

### High Risks
- **None identified** - backend API is production-ready and tested

### Medium Risks
- **Chunked upload complexity:** Large file chunking may have edge cases
  - *Mitigation:* Reuse existing backend chunking logic, test with files >50MB, implement robust error handling
- **Share link security:** Password-protected links need thorough testing
  - *Mitigation:* Security audit in Task MH-013, test with various expiry settings, brute-force testing
- **API client adoption:** New pattern may affect existing code if adopted prematurely
  - *Mitigation:* Document thoroughly, gradual migration strategy, keep existing code unchanged

### Low Risks
- **Mobile responsiveness:** Media grid may break on small screens
  - *Mitigation:* Test on actual mobile device in Task MH-014, use responsive design patterns
- **File type detection:** MIME type detection may be inconsistent across browsers
  - *Mitigation:* Use both file extension and MIME type detection, whitelist allowed types
- **Performance with large file lists:** Pagination may be needed for >1000 files
  - *Mitigation:* Implement pagination in Task MH-003, test with 100+ files

---

# Future Follow-up Items

### Immediate Next Sprint
1. **Export Engine:** Complete the stubbed export engine for CSV, Excel, and PDF exports
2. **Activity Log UI:** Build UI for the existing activity log API
3. **Finance Features:** Complete multi-stage approvals for expenses and purchases
4. **Performance Reviews:** Implement quarterly performance appraisal system

### Medium-Term Enhancements
1. **Mobile App Integration:** Integrate media library into Flutter companion app
2. **Advanced Search:** Implement full-text search across file contents
3. **Media Transcoding:** Add live transcoding for video optimization
4. **NAS Sync:** Implement NAS sync for enterprise storage

### Long-Term Vision
1. **AI-Powered Organization:** Use AI for automatic file categorization and tagging
2. **Advanced Analytics:** Usage analytics and storage optimization
3. **Collaboration Features:** Real-time collaboration on documents
4. **Integration Ecosystem:** Third-party integrations (Google Drive, OneDrive)

### Technical Debt
1. **API Client Migration:** Gradually migrate existing endpoints to use new API client
2. **Zustand Stores:** Implement Zustand for shared UI state management
3. **Component Extraction:** Extract large page components into smaller reusable components
4. **Accessibility Audit:** Complete WCAG 2.1 AA compliance audit and fixes

---

**End of Sprint Specification Document**

**Document Classification:** Implementation Contract
**Distribution:** Antigravity (Implementation Agent), Opencoder (Verification Agent)
**Next Review:** Post-sprint retrospective
**Archive Location:** `.ai/sprints/Sprint-001-MediaHive-Frontend-Integration.md`