# recipes.md — Master Catalog of 100 Cross-Domain Automation Recipes

> **Classification**: Automation Engine Catalog & Action Specification  
> **Source of Truth**: `.ai/automation/recipes.md`  
> **Recipe Count**: Exactly 100 Recipes (Strictly Enforced)

---

## I. Attendance & Safety Automation Recipes (Recipes 1–20)

1. **Recipe 1 (Student 3-Day Absence Escalation)**:  
   *Trigger*: `AttendanceMarked(status="absent")` x 3 consecutive days.  
   *Action*: Send SMS to parent ──► Create high-priority task for Class Teacher ──► Notify Principal.
2. **Recipe 2 (Staff Late Arrival Alert)**:  
   *Trigger*: `StaffCheckIn` past shift grace period.  
   *Action*: Log late minutes ──► Send push alert to staff member ──► Update HOD daily dashboard.
3. **Recipe 3 (Unexcused Absence LOP Penalty)**:  
   *Trigger*: `AttendanceMarked(status="absent", reason=null)` at day end.  
   *Action*: Flag date for Loss-of-Pay (LOP) in monthly payroll tally.
4. **Recipe 4 (Teacher Absence Substitution Auto-Suggest)**:  
   *Trigger*: `LeaveApproved` for teaching staff.  
   *Action*: Scan timetable for free teachers in same department ──► Generate draft substitution schedule ──► Send notification to free teachers.
5. **Recipe 5 (Curfew Gate Violation Alert)**:  
   *Trigger*: Boarder NFC tap at gate past curfew hours.  
   *Action*: Emit `CurfewViolation` event ──► Send instant SMS to Hostel Warden & Parent.
6. **Recipe 6 (Geofence Location Drift Warning)**:  
   *Trigger*: Field work staff presence check > 500m outside geofence.  
   *Action*: Log geofence violation ──► Alert supervisor in Approvals Center.
7. **Recipe 7 (Automatic Check-Out on Shift End)**:  
   *Trigger*: Midnight system clock with active online presence.  
   *Action*: Auto-close attendance log with flag `auto_checkout`.
8. **Recipe 8 (Class Attendance Completion Reminder)**:  
   *Trigger*: 10:00 AM clock with unsubmitted class register.  
   *Action*: Send high-priority Push alert to homeroom teacher.
9. **Recipe 9 (Consecutive Late Arrival Parent Notice)**:  
   *Trigger*: Student marked `late` 3 times in a single week.  
   *Action*: Generate automated late warning letter ──► Dispatch to parent email.
10. **Recipe 10 (Daily Presence Summary Broadcast)**:  
    *Trigger*: 11:00 AM clock daily.  
    *Action*: Aggregate total campus presence % ──► Broadcast to Principal Workspace.
11. **Recipe 11 (Student Gate Departure Notification)**:  
    *Trigger*: Gate NFC tap matching approved Outpass.  
    *Action*: Mark outpass status `active_transit` ──► Send Push notification to parent: *"Child departed campus."*
12. **Recipe 12 (Boarder Return Verification)**:  
    *Trigger*: Gate NFC tap matching active Outpass.  
    *Action*: Mark outpass status `completed` ──► Notify Warden.
13. **Recipe 13 (Biometric Consent Revocation Cleanup)**:  
    *Trigger*: `student_biometric_consents` record updated with `revokedAt`.  
    *Action*: Deactivate face embedding matching ──► Flag student profile for manual marking fallback.
14. **Recipe 14 (Staff Onboarding Biometric Reminder)**:  
    *Trigger*: Staff onboarding Day 2 with un-enrolled NFC card.  
    *Action*: Create task for IT Support Desk: *"Enroll Staff NFC Tag"*.
15. **Recipe 15 (Emergency Campus Lockdown Notification)**:  
    *Trigger*: Manual security lockdown trigger.  
    *Action*: Send mass FCM Push & SMS broadcast to all active staff and parents.
16. **Recipe 16 (Field Work Session Approval Expired)**:  
    *Trigger*: Pending field work request > 24h old.  
    *Action*: Auto-escalate request to Campus Director.
17. **Recipe 17 (Student Medical Absence Flag)**:  
    *Trigger*: Attendance marked `absent` with reason containing `"medical"`.  
    *Action*: Alert Campus Health Clinic / Nurse.
18. **Recipe 18 (Period-Wise Skip Detection)**:  
    *Trigger*: Student present in Period 1 but absent in Period 3.  
    *Action*: Create urgent alert for Discipline Officer.
19. **Recipe 19 (Unassigned Class Alert)**:  
    *Trigger*: Class period starts with no teacher assigned or present.  
    *Action*: Alert HOD via SSE real-time notification.
20. **Recipe 20 (Weekly Attendance Report Auto-Email)**:  
    *Trigger*: Friday 4:00 PM clock.  
    *Action*: Compile weekly attendance stats ──► Email PDF summary to parents.

---

## II. Finance & Fee Recovery Automation Recipes (Recipes 21–40)

21. **Recipe 21 (Monthly Fee Invoice Auto-Generation)**:  
    *Trigger*: 1st day of month at 00:00.  
    *Action*: Generate fee invoices for all active student rosters based on fee structures.
22. **Recipe 22 (Smart Fee Reminder - Early Notice)**:  
    *Trigger*: 5 days prior to fee due date.  
    *Action*: Send gentle fee reminder SMS/Push to guardians with online payment link.
23. **Recipe 23 (Fee Due Date Overdue Escalation)**:  
    *Trigger*: `FeeOverdue` event (1 day past due date).  
    *Action*: Apply configured late fee penalty ──► Update invoice total ──► Send overdue alert.
24. **Recipe 24 (Fee Default Result Block)**:  
    *Trigger*: Exam Hall Ticket generation request for student with overdue fee balance > threshold.  
    *Action*: Block admit card download ──► Direct user to Cashier Workspace.
25. **Recipe 25 (Automated Digital Receipt Distribution)**:  
    *Trigger*: `FeePaid` event.  
    *Action*: Generate official PDF receipt ──► Send to parent WhatsApp & Email.
26. **Recipe 26 (Scholarship Concession Auto-Apply)**:  
    *Trigger*: `StudentAdmitted` with approved scholarship tag.  
    *Action*: Apply percentage waiver discount line item to generated fee invoice.
27. **Recipe 27 (Daily Cashier Counter Closing Reconcile)**:  
    *Trigger*: Cashier workspace sign-off button clicked.  
    *Action*: Calculate cash vs. online totals ──► Post summary journal entry to General Ledger.
28. **Recipe 28 (Overdue Fee Installment Arrangement)**:  
    *Trigger*: Parent accepts micro-payment agreement.  
    *Action*: Split overdue invoice into 3 installment sub-invoices with future due dates.
29. **Recipe 29 (Expense Claim Multi-Tier Routing)**:  
    *Trigger*: `ExpenseClaimSubmitted` > $500.  
    *Action*: Route approval task to Finance Director instead of standard HOD.
30. **Recipe 30 (Budget Limit Pre-Approval Warning)**:  
    *Trigger*: Purchase request amount exceeds remaining department budget line.  
    *Action*: Flag request with `BUDGET_OVERRUN_WARNING` ──► Require CFO explicit sign-off.
31. **Recipe 31 (Sibling Discount Auto-Calculation)**:  
    *Trigger*: Second child admitted under same primary `guardianId`.  
    *Action*: Automatically apply 15% sibling discount to second child's tuition fee structure.
32. **Recipe 32 (Bank Reconciliation Statement Match)**:  
    *Trigger*: Bank CSV statement upload.  
    *Action*: Match transaction reference numbers with outstanding fee invoices ──► Post confirmed credits.
33. **Recipe 33 (Failed Gateway Payment Webhook Recovery)**:  
    *Trigger*: Payment gateway callback returns `FAILED`.  
    *Action*: Revert pending receipt draft ──► Notify parent to retry payment.
34. **Recipe 34 (Fee Waiver Expiry Warning)**:  
    *Trigger*: Fee concession valid date ending in 15 days.  
    *Action*: Alert Accounts Officer to review concession renewal status.
35. **Recipe 35 (Refund Request Approval Routing)**:  
    *Trigger*: `FeeRefundRequested` event.  
    *Action*: Route approval task to Accounts Head and CFO.
36. **Recipe 36 (Monthly Income/Expense Variance Alert)**:  
    *Trigger*: End of month GL balance check showing expenses > budget by 10%.  
    *Action*: Generate variance report ──► Alert Executive Board.
37. **Recipe 37 (Unclaimed Security Deposit Alert)**:  
    *Trigger*: Student status set to `Graduated` > 30 days with positive deposit balance.  
    *Action*: Create task for Accounts: *"Disburse Security Deposit Refund"*.
38. **Recipe 38 (Petty Cash Limit Replenishment Trigger)**:  
    *Trigger*: Department petty cash balance < $50.  
    *Action*: Generate auto-replenishment voucher for Accounts approval.
39. **Recipe 39 (Audit Log Flag on Large Manual Discount)**:  
    *Trigger*: Manual fee concession > $200 applied by cashier.  
    *Action*: Log high-priority entry to `audit_log` ──► Alert Auditor.
40. **Recipe 40 (Annual Financial Year End Close)**:  
    *Trigger*: Fiscal year end date reached.  
    *Action*: Lock current fiscal year GL entries ──► Roll forward closing balances to new fiscal year ledger.

---

## III. Inventory, Assets & Procurement Recipes (Recipes 41–60)

41. **Recipe 41 (Reorder Point ROP Auto-Purchase Requisition)**:  
    *Trigger*: `InventoryLow` event.  
    *Action*: Auto-generate draft Purchase Requisition pre-filled with items, ROP count, and primary vendor details.
42. **Recipe 42 (Asset Maintenance Schedule Reminder)**:  
    *Trigger*: `asset_service_history` next service date in 7 days.  
    *Action*: Create maintenance task for Facilities Team ──► Alert Maintenance Manager.
43. **Recipe 43 (Unreturned Issued Inventory Escalation)**:  
    *Trigger*: Non-consumable item issued to staff not returned by expected date.  
    *Action*: Send reminder to staff ──► Alert Store Keeper.
44. **Recipe 44 (Asset Unassign on Staff Offboarding)**:  
    *Trigger*: Staff state changed to `Offboarded`.  
    *Action*: Unassign linked NFC hardware/laptops ──► Transfer assets back to Central Store inventory.
45. **Recipe 45 (Goods Received Note GRN Stock Credit)**:  
    *Trigger*: Store Keeper completes Goods Received Note (GRN) inspection.  
    *Action*: Automatically increment stock quantities for received items in warehouse DB.
46. **Recipe 46 (Asset Warranty Expiry Warning)**:  
    *Trigger*: Asset `warrantyEnd` date in 30 days.  
    *Action*: Alert Purchase Officer to evaluate extended warranty or replacement options.
47. **Recipe 47 (High-Value Asset NFC Dislocation Alert)**:  
    *Trigger*: High-value asset NFC tag scanned outside assigned department building.  
    *Action*: Emit security alert to Campus Security Workspace.
48. **Recipe 48 (Stock Audit Variance Resolution)**:  
    *Trigger*: Physical stock count < recorded DB inventory count during audit.  
    *Action*: Generate Stock Adjustment Voucher ──► Require Store Manager sign-off.
49. **Recipe 49 (Mess Grocery Weekly Requisition)**:  
    *Trigger*: Sunday 6:00 PM clock.  
    *Action*: Calculate upcoming week mess grocery requirements based on hostel headcount ──► Create purchase requisition.
50. **Recipe 50 (Vendor Purchase Order PO Auto-Send)**:  
    *Trigger*: Purchase Request status changed to `Approved` by Finance.  
    *Action*: Generate PDF Purchase Order ──► Email directly to vendor contact.
51. **Recipe 51 (Damaged Asset Decommissioning)**:  
    *Trigger*: Asset service log status set to `unrepairable`.  
    *Action*: Change asset state to `Decommissioned` ──► Adjust total asset valuation ledger.
52. **Recipe 52 (Consumable Stock Usage Spikes Alert)**:  
    *Trigger*: Item consumption rate 200% higher than historic 30-day average.  
    *Action*: Alert Inventory Auditor to investigate possible waste or theft.
53. **Recipe 53 (Lab Equipment Reservation Clashes)**:  
    *Trigger*: Two lab booking requests for same asset time slot.  
    *Action*: Reject second booking with notice: *"Resource already reserved."*
54. **Recipe 54 (Quarterly Physical Inventory Audit Task)**:  
    *Trigger*: End of quarter date.  
    *Action*: Create stock count audit tasks for all warehouse store keepers.
55. **Recipe 55 (Scrap Asset Sale Posting)**:  
    *Trigger*: Decommissioned asset marked `sold_as_scrap`.  
    *Action*: Post scrap income amount to General Ledger income account.
56. **Recipe 56 (Stationery Bulk Request Consolidation)**:  
    *Trigger*: 25th of month clock.  
    *Action*: Consolidate all department monthly stationery requests into a single bulk PO.
57. **Recipe 57 (Unapproved Requisition Auto-Cancel)**:  
    *Trigger*: Purchase request pending approval > 14 days.  
    *Action*: Mark request `expired` ──► Notify requester.
58. **Recipe 58 (IT Hardware Asset Tagging Reminder)**:  
    *Trigger*: New IT asset GRN received without assigned `qrCode` or `nfcTagId`.  
    *Action*: Create task: *"Tag New IT Assets with NFC/QR Code"*.
59. **Recipe 59 (Vehicle Fuel Stock Replenishment Alert)**:  
    *Trigger*: Campus fuel storage tank level < 20%.  
    *Action*: Create urgent fuel purchase request.
60. **Recipe 60 (Supplier Delivery SLA Performance Calculation)**:  
    *Trigger*: GRN recorded > 5 days past PO expected delivery date.  
    *Action*: Reduce supplier rating score in Vendor Management database.

---

## IV. Campus, Hostel, Transport & Library Recipes (Recipes 61–80)

61. **Recipe 61 (Night Outpass Curfew Expiry Warning)**:  
    *Trigger*: Boarder outpass expiration time reached without gate return tap.  
    *Action*: Emit `OutpassViolation` event ──► Send Push alert to Chief Warden and Parent.
62. **Recipe 62 (Hostel Room Capacity Full Prevention)**:  
    *Trigger*: Bed allocation attempt on room with zero vacant beds.  
    *Action*: Reject allocation request with error: *"Room capacity exceeded."*
63. **Recipe 63 (Library Overdue Book Fine Auto-Posting)**:  
    *Trigger*: Book return processed > due date.  
    *Action*: Calculate days overdue x daily fine rate ──► Post fine balance to student fee invoice.
64. **Recipe 64 (Transit Vehicle Delay Passenger Alert)**:  
    *Trigger*: Vehicle GPS speed 0 km/h on active route for > 15 minutes.  
    *Action*: Send FCM Push notification to all route parents: *"Bus delayed due to traffic."*
65. **Recipe 65 (Hostel Outpass Parental Consent OTP)**:  
    *Trigger*: Boarder submits night outpass request.  
    *Action*: Dispatch OTP to parent mobile number for verification before warden approval.
66. **Recipe 66 (Hostel Bed Vacated Cleaning Task)**:  
    *Trigger*: `HostelVacated` event.  
    *Action*: Mark bed status `Under Maintenance` ──► Create cleaning task for Housekeeping.
67. **Recipe 67 (Library Hold Available Notification)**:  
    *Trigger*: Reserved book returned to circulation desk.  
    *Action*: Mark book `Held for Reserved User` ──► Send Push alert to next student in hold queue.
68. **Recipe 68 (Vehicle Odometer Fuel Efficiency Warning)**:  
    *Trigger*: `VehicleLog` entry showing fuel consumption > 25% expected L/100km rate.  
    *Action*: Create vehicle inspection task for Fleet Manager.
69. **Recipe 69 (Night Roll Call Absence Escalation)**:  
    *Trigger*: 10:30 PM roll call register marked `absent` for resident without active outpass.  
    *Action*: Trigger high-priority alert to Chief Warden phone & security desk.
70. **Recipe 70 (Student TC Clearances Check - Hostel/Library/Bus)**:  
    *Trigger*: Transfer Certificate (TC) request submitted.  
    *Action*: Automatically query Hostel, Library, and Transport ledgers for unreturned items or pending dues ──► Flag clearance items.
71. **Recipe 71 (Library Card Loss Block)**:  
    *Trigger*: Student reports lost NFC library card.  
    *Action*: Revoke NFC tag binding in `nfc_cards` table ──► Prevent library book checkout.
72. **Recipe 72 (Hostel Mess Headcount Daily Forecast)**:  
    *Trigger*: 6:00 AM clock daily.  
    *Action*: Count active non-outpass residents + guest meals ──► Notify Mess Chef of required meal portions.
73. **Recipe 73 (Vehicle Maintenance Service Lock)**:  
    *Trigger*: Vehicle odometer reaches next scheduled service interval (e.g. +10,000 km).  
    *Action*: Block vehicle from new booking allocations until service sign-off completed.
74. **Recipe 74 (Library Max Book Limit Reached Check)**:  
    *Trigger*: Issue attempt for borrower with 3 active unreturned books.  
    *Action*: Reject checkout request with notice: *"Maximum book borrowing limit reached."*
75. **Recipe 75 (Hostel Visitor Log Expiry Notice)**:  
    *Trigger*: Hostel visitor check-in duration > 2 hours.  
    *Action*: Send alert to Warden: *"Visitor duration exceeded for Room XXX."*
76. **Recipe 76 (Bus Driver License Expiry Warning)**:  
    *Trigger*: Driver license expiry date in 30 days.  
    *Action*: Alert Transport Manager to request renewed driver documentation.
77. **Recipe 77 (Library Digital E-Book Stream Expiry)**:  
    *Trigger*: E-book rental period (14 days) reached.  
    *Action*: Revoke digital stream access link in MediaHive reader interface.
78. **Recipe 78 (Hostel Room Maintenance Complete Ready Alert)**:  
    *Trigger*: Housekeeping marks room task `Completed`.  
    *Action*: Update room state to `Vacant` / `Ready for Allocation`.
79. **Recipe 79 (Vehicle Route Passenger Over-Capacity Guard)**:  
    *Trigger*: Passenger assignment attempt exceeding vehicle passenger seat limit.  
    *Action*: Block assignment and suggest alternate bus route with free seats.
80. **Recipe 80 (Annual Hostel Room Re-Allocation Clear)**:  
    *Trigger*: Session end date reached.  
    *Action*: Clear non-permanent bed allocations ──► Reset rooms for upcoming session intake.

---

## V. HR, Academics, AI & System Governance Recipes (Recipes 81–100)

81. **Recipe 81 (Staff Probation Expiry Review Trigger)**:  
    *Trigger*: Staff employment date + 6 months reached.  
    *Action*: Create performance appraisal review task for Department HOD.
82. **Recipe 82 (Monthly Payroll Auto-Calculation)**:  
    *Trigger*: 25th of month clock.  
    *Action*: Compile worked days, LOP deductions, and approved overtime ──► Generate draft payroll run.
83. **Recipe 83 (Unexcused Staff Absence LOP Payroll Deduction)**:  
    *Trigger*: Unexcused staff absence confirmed by HOD.  
    *Action*: Deduct 1 day salary from monthly payroll calculation.
84. **Recipe 84 (Class Syllabus Completion Target Alert)**:  
    *Trigger*: 50% term duration reached with < 40% syllabus topics marked completed.  
    *Action*: Alert Subject Teacher and HOD to review class pacing.
85. **Recipe 85 (Exam Report Card Lock & Publish)**:  
    *Trigger*: Examination Controller clicks "Publish Results".  
    *Action*: Lock grade records against further edits ──► Generate digital report card PDFs ──► Publish to Parent App.
86. **Recipe 86 (Staff Contract Expiry Warning)**:  
    *Trigger*: Staff `contractEndDate` in 45 days.  
    *Action*: Alert HR Manager to initiate contract renewal or offboarding review.
87. **Recipe 87 (AI Dropout Risk Detection Alert)**:  
    *Trigger*: AI Anomaly Model identifies student with < 75% attendance + falling grades + overdue fees.  
    *Action*: Generate Dropout Risk Report ──► Assign counseling task to Student Advisor.
88. **Recipe 88 (New Staff System Account Auto-Provisioning)**:  
    *Trigger*: `StaffOnboarding` form completed.  
    *Action*: Generate `@thaibagarden.edu` email ──► Assign default role permissions ──► Send welcome packet.
89. **Recipe 89 (Class Homeroom Teacher Substitution Alert)**:  
    *Trigger*: Class Teacher absence > 3 days.  
    *Action*: Prompt HOD to assign temporary acting Homeroom Teacher.
90. **Recipe 90 (Grade Modification Audit Alert)**:  
    *Trigger*: Grade record edited after initial register submission.  
    *Action*: Log mandatory diff to `audit_log` ──► Alert Exam Controller.
91. **Recipe 91 (Staff Payslip Digital Delivery)**:  
    *Trigger*: `PayrollApproved` event.  
    *Action*: Generate encrypted PDF payslips ──► Deliver to staff email & workspace.
92. **Recipe 92 (AI Inventory Replenishment Prediction)**:  
    *Trigger*: AI model calculates item consumption trajectory reaching 0 in 5 days.  
    *Action*: Pre-fill draft purchase requisition with recommended order quantity.
93. **Recipe 93 (Student Birthday Recognition Announcement)**:  
    *Trigger*: Student DOB matches current date.  
    *Action*: Post birthday wish card on Class Activity Feed.
94. **Recipe 94 (System Token Version Invalidation Enforcement)**:  
    *Trigger*: Security event setting `tokenVersion = tokenVersion + 1`.  
    *Action*: Sever all active SSE channels ──► Force client app redirect to login.
95. **Recipe 95 (Annual Accreditation Data Pack One-Click Assembly)**:  
    *Trigger*: Compliance Officer requests NAAC/Board Data Pack.  
    *Action*: Assemble student ratios, staff qualifications, exam results, and infrastructure lists into ZIP package.
96. **Recipe 96 (Inactive Staff Account Auto-Freeze)**:  
    *Trigger*: Staff record `isActive` set to `false`.  
    *Action*: Revoke system permissions ──► Unbind NFC tags ──► Freeze email inbox.
97. **Recipe 97 (Child Safety Violation Immediate Escalation)**:  
    *Trigger*: Grievance submitted under category `"child_safety"`.  
    *Action*: Bypass standard routing ──► Alert Executive Director & Legal Counsel instantly.
98. **Recipe 98 (Document Expiration Renewal Reminder)**:  
    *Trigger*: Uploaded institutional license/permit expiration in 60 days.  
    *Action*: Create urgent task for Compliance Officer.
99. **Recipe 99 (Daily Operational Health Backup Verification)**:  
    *Trigger*: 2:00 AM clock daily.  
    *Action*: Verify automated DB snapshot backup completion ──► Log status to `telemetry`.
100. **Recipe 100 (AI Campus Operations Summary Generation)**:  
     *Trigger*: Sunday 8:00 PM clock.  
     *Action*: Ambient AI synthesizes weekly attendance, fee recoveries, inventory orders, and open tickets into an Executive Intelligence Summary for the Campus Chairman.
