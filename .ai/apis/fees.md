# fees.md — Fee Collection API Specification

> **Specification Tier**: API Contract Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/apis/fees.md`

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/erp/fees/invoices` | List Student Invoices | `fees:reports:view` |
| `POST` | `/api/erp/fees/collect` | Record Fee Payment & Issue Receipt | `fees:collect` |
| `POST` | `/api/erp/fees/concession` | Apply Scholarship Waiver | `fees:concession:apply` |

---

# academics.md — Academic API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/academic/classes` | List Classes & Sections | `classes:read` |
| `POST` | `/api/academic/classes` | Create Class Section | `classes:create` |
| `GET` | `/api/academic/academic-years` | List Academic Sessions | `academic_years:manage` |
| `POST` | `/api/academic/academic-years` | Create Academic Session | `academic_years:manage` |

---

# hostel.md — Hostel & Residential API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/erp/hostel/rooms` | List Rooms & Bed Vacancies | `hostel:facility:manage` |
| `POST` | `/api/erp/hostel/allocate` | Allocate Bed to Boarder | `hostel:allocate` |
| `POST` | `/api/erp/hostel/outpass` | Apply for Digital Outpass | `hostel:outpass:approve` |

---

# transport.md — Fleet & Transit API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/vehicles` | List Fleet Vehicles | `vehicles:read` |
| `POST` | `/api/vehicles` | Register Fleet Vehicle | `vehicles:create` |
| `POST` | `/api/erp/transport/assign` | Assign Passenger to Route | `transport:assign` |
