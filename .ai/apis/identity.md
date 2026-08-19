# identity.md — Identity & Authentication API Specification

> **Specification Tier**: API Contract Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/apis/identity.md`  
> **Standards Alignment**: OpenAPI 3.1 / Stripe REST Specification Standard

---

## 1. Overview & Endpoints

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Staff/User Authentication & JWT Session Issuance | Public |
| `POST` | `/api/auth/signup` | Public User Registration | Public / Rate Limited |
| `POST` | `/api/auth/logout` | Session Termination & Cookie Invalidation | Authenticated |
| `GET` | `/api/auth/me` | Fetch Current Authenticated Identity Profile | Authenticated |
| `POST` | `/api/auth/mobile-handoff/nonce` | Generate Mobile WebView Nonce | Authenticated |

---

## 2. Endpoint Contracts

### `POST /api/auth/login`
* **Request Body**:
  ```json
  {
    "email": "user@thaibagarden.edu",
    "password": "SecurePassword123!",
    "rememberMe": true
  }
  ```
* **Response (200 OK)**: Set-Cookie `thb_session` (httpOnly) + Body:
  ```json
  {
    "success": true,
    "staff": {
      "id": "UUID",
      "email": "user@thaibagarden.edu",
      "firstName": "Aisha",
      "lastName": "Sharma",
      "role": "admin",
      "employeeId": "EMP-9012"
    }
  }
  ```
* **Error Response (401 Unauthorized)**:
  ```json
  {
    "error": "Invalid email or password"
  }
  ```

---

# students.md — Student Management API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/academic/students` | Search & List Students (Paginated) | `students:read` |
| `POST` | `/api/academic/students` | Enroll New Student Record | `students:create` |
| `GET` | `/api/academic/students/[id]` | Fetch Full Student Profile | `students:read` |
| `PATCH` | `/api/academic/students/[id]` | Update Profile Fields | `students:update` |
| `DELETE` | `/api/academic/students/[id]` | Soft-Delete Student Record | `students:delete` |

---

# attendance.md — Attendance API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance/my-attendance` | Fetch Individual Attendance History | `attendance:view` |
| `POST` | `/api/attendance/check-in` | Staff Check-In Endpoint | `attendance:mark` |
| `POST` | `/api/attendance/check-out` | Staff Check-Out Endpoint | `attendance:mark` |
| `POST` | `/api/academic/attendance/bulk` | Submit Bulk Class Register | `student_attendance:manage` |

---

# finance.md — Finance & Ledger API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/accounts` | Fetch Institutional Financial Ledger | `finance:transaction:read` |
| `POST` | `/api/accounts` | Record Income/Expense Transaction | `finance:transaction:create` |
| `GET` | `/api/export` | Export Ledger to CSV/Excel | `finance:export` |
