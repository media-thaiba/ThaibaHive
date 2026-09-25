# Endowment Fund & Section 80G Tax Compliance Runbook (ALUM-023)

## Overview
This runbook governs institutional endowment fund management, double-entry general ledger synchronization with FinanceOS, and Section 80G tax-exemption certificate issuance.

---

## 1. Recognition Tiers & Contribution Brackets
- **Supporter**: $<\$500$ (or $<₹50,000$)
- **Bronze**: $\$500+$ ($₹50,000+$)
- **Silver**: $\$2,500+$ ($₹250,000+$)
- **Gold**: $\$10,000+$ ($₹1,000,000+$)
- **Platinum**: $\$50,000+$ ($₹5,000,000+$)
- **Trustee Circle**: $\$100,000+$ ($₹10,000,000+$)

---

## 2. Double-Entry GL Ledger Invariants
Every incoming donation processed through `DonationFinanceBridge` generates an atomic, balanced double-entry ledger entry:

- **Debit**: `GL:1110-GATEWAY_CLEARING_ACCOUNT` (or `GL:1100-BANK_CASH_MAIN`)
- **Credit**: `GL:3100-ENDOWMENT_GENERAL_REVENUE` (or designated sub-accounts `GL:3110-SCHOLARSHIP`, `GL:3120-INFRASTRUCTURE`, `GL:3130-RESEARCH_CHAIR`)

**Balancing Rule**: Total Debits $\equiv$ Total Credits ($|\sum D - \sum C| < 0.001$). Unbalanced entries are immediately aborted.

---

## 3. Section 80G Cryptographic Tax Receipts
1. **Receipt Generation**: Formatted electronic certificate containing Donor PAN, Trust Reg No., and donation breakdown.
2. **Cryptographic Signature**: HMAC-SHA256 signature generated using institution key over receipt hash.
3. **Public Verification**: Donors and tax authorities can verify authenticity at `/api/alumni/verify/donation/[hash]` with PII masked.
