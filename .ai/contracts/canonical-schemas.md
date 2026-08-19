# canonical-schemas.md — Canonical JSON Request & Response Contracts

> **Specification Tier**: API Contract Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/contracts/canonical-schemas.md`

---

## 1. Standard Success Response Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-07-29T16:20:00.000Z",
    "requestId": "UUID"
  }
}
```

---

## 2. Standard Paginated List Envelope

```json
{
  "success": true,
  "items": [],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

## 3. Standard Error Response Envelope

```json
{
  "error": "Human-readable error description",
  "code": "ERROR_CLASSIFICATION_CODE",
  "details": [],
  "timestamp": "2026-07-29T16:20:00.000Z"
}
```

---

# canonical-queries.md — Canonical SQL Query Patterns

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/queries/canonical-queries.md`

---

## 1. Optimized Class Roster Fetch Pattern (Avoids N+1)

```sql
SELECT 
  s.id, s.admission_no, s.first_name, s.last_name, s.gender, s.is_active,
  c.name AS class_name, c.section AS class_section
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.institution_id = ? AND s.is_active = 1 AND s.class_id = ?
ORDER BY s.first_name ASC
LIMIT 20 OFFSET 0;
```

---

## 2. Daily Attendance Summary Calculation Pattern

```sql
SELECT 
  status, 
  COUNT(*) AS count
FROM student_attendance_logs
WHERE class_id = ? AND date = ?
GROUP BY status;
```

---

## 3. Realtime Presence Verification Join

```sql
SELECT 
  p.staff_id, p.online, p.last_seen_at, p.status, p.status_text,
  st.first_name, st.last_name, st.role
FROM presence p
JOIN staff st ON p.staff_id = st.id
WHERE p.staff_id IN (SELECT staff_id FROM staff_institutions WHERE institution_id = ?);
```
