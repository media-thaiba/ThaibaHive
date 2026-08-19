# hostel-allocation.md — Hostel Bed Allocation Workflow

## 1. Workflow Purpose
To manage room and bed allocation for residential students, boarders, and care home inmates.

## 2. Steps
1. **Application & Fee Clearance**: Resident applies for boarding; system verifies fee deposit.
2. **Bed Allocation**: Warden assigns vacant bed in specific block/room via Layout Builder.
3. **Asset Handover**: Warden issues room keys, linen, and furniture; records items on resident timeline.
4. **Activation**: Resident identity linked to hostel gate biometric reader and night roll call register.

---

# transport-assignment.md — Vehicle Route Assignment Workflow

## 1. Workflow Purpose
To assign passengers to transit routes, stops, and vehicles while updating route balances.

## 2. Steps
1. **Route Selection**: Passenger selects pickup/drop stop location.
2. **Capacity Check**: System verifies bus seating capacity is not exceeded.
3. **Fee Adjustment**: Transport fee linked to pickup stop distance is applied to student fee account.
4. **Pass Issuance**: Digital bus pass generated with QR verification code.

---

# inventory-procurement.md — Stock Procurement Workflow

## 1. Workflow Purpose
To manage stock requisitions, purchase order approvals, vendor deliveries, and warehouse receiving.

## 2. Steps
1. **Requisition**: Store keeper or ROP automation submits purchase request.
2. **Multi-Tier Approval**: Request approved by Department Head -> Accounts -> Finance Director.
3. **PO Issuance**: Purchase Order dispatched to approved vendor.
4. **Delivery & GRN**: Vendor delivers stock; Store Keeper inspects items, logs Goods Received Note (GRN), updates stock levels, and posts invoice to Accounts Payable.

---

# library-circulation.md — Library Book Circulation Workflow

## 1. Workflow Purpose
To manage book issues, renewals, returns, and overdue fine collection.

## 2. Steps
1. **Checkout**: Borrower scans smart NFC library card and book barcode at circulation desk.
2. **Issue Validation**: System checks active borrower status and confirms total borrowed limit not exceeded.
3. **Return & Inspection**: Borrower returns book; librarian inspects condition.
4. **Fine Processing**: If returned late, system calculates overdue fine and posts balance to fee account.

---

# staff-onboarding.md — Staff Onboarding Workflow

## 1. Workflow Purpose
To guide new employee registration, contract signing, IT asset allocation, and biometric enrollment.

## 2. Steps
1. **Profile Registration**: HR inputs basic staff details, contract terms, and salary structure.
2. **Identity & Auth**: System generates `employeeId`, user account, and email credentials.
3. **Biometric Enrollment**: Staff registers NFC ID card and facial recognition embedding.
4. **Asset Handover**: IT Dept issues laptop/hardware; assets linked to staff timeline.
5. **Orientation Checklist**: Onboarding checklist tasks assigned to department mentor.

---

# staff-offboarding.md — Staff Offboarding & Clearance Workflow

## 1. Workflow Purpose
To manage employee resignations, department clearances, asset returns, and account deactivation.

## 2. Steps
1. **Clearance Initiation**: HR initiates offboarding checklist.
2. **Department Sign-Offs**: IT, Library, Finance, and HOD approve clearance items.
3. **Asset Return**: Issued hardware and NFC cards returned and unlinked.
4. **Session Revocation**: System increments `staff.tokenVersion`, invalidating all active JWT sessions instantly.
5. **Archival**: Record marked `isActive = false`; historical logs retained for compliance.
