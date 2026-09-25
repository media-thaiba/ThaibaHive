# Regional Alumni Chapter Governance & Homecoming Runbook (ALUM-024)

## Overview
This runbook provides guidelines for establishing regional and international alumni chapters, delegating chapter officers, and managing annual reunions and homecoming events with offline QR pass verification.

---

## 1. Chapter Chartering & Governance
1. **Chartering Criteria**: Minimum 10 active alumni in a metropolitan region or country.
2. **Officer Roles**:
   - **President**: Strategic oversight and alumni engagement leadership.
   - **Secretary**: Member directory maintenance and communication dispatch.
   - **Treasurer**: Regional event budgets and fundraising coordination.
3. **Approval**: Reviewed and ratified by Institution Alumni Relations Director.

---

## 2. Event RSVP & Ticketing Lifecycle
1. **Creation**: Event created via Admin Cockpit or Chapter Lead Portal.
2. **Ticketing & Pass**: Each RSVP receives an HMAC-SHA256 signed `MobileEventPass`.
3. **Offline Sync**: Passes are securely cached in the Flutter mobile offline vault.
4. **Gate Check-In**: Security gates scan QR passes via mobile app or web scanner; duplicate check-ins are detected and prevented.
