# Forensic Snapshot Management & Incident Reconstruction SOP

## Purpose & Scope

This Standard Operating Procedure (SOP) defines the procedures for creating, storing, verifying, and diffing immutable forensic state snapshots in ThaibaHive Institution OS. Forensic snapshots provide mathematical certainty for point-in-time compliance state reconstruction.

---

## Snapshot Lifecycle & Tiering

1. **Hot Tier (0 – 30 Days):**
   - Stored in local high-speed encrypted volume.
   - GZIP compressed canonical JSON manifests.
   - Immediate access for real-time diffing and active audit investigation.

2. **Warm Tier (31 – 90 Days):**
   - Replicated across regional read-replicas and backup storage.
   - Readily available for monthly compliance reporting.

3. **Cold Tier (91 – 365+ Days):**
   - Archived to cold object storage (S3 Glacier / Azure Archive).
   - Signed cryptographic manifest hashes retained locally.

---

## Operational Commands

### Capturing a Snapshot
To manually capture and sign a snapshot:
```bash
pnpm compliance:snapshot --tenant=default
```

### Inspecting Snapshot Manifest & Signatures
```bash
tsx scripts/compliance/snapshot-reconstruct.ts --inspect="file://.compliance-snapshots/default_snp_1234.json.gz"
```

### Performing Differential State Comparison
```bash
tsx scripts/compliance/snapshot-reconstruct.ts \
  --base="file://.compliance-snapshots/default_snp_base.json.gz" \
  --target="file://.compliance-snapshots/default_snp_target.json.gz"
```

---

## Incident Investigation SOP

1. **Identify Investigation Window:** Determine the suspect timeframe $T_{\text{start}}$ to $T_{\text{end}}$.
2. **Select Base and Target Snapshots:** Choose the snapshot immediately prior to $T_{\text{start}}$ and the snapshot immediately following $T_{\text{end}}$.
3. **Execute Reconstruction & Diff API:**
   ```http
   POST /api/system/compliance/snapshots/diff
   Content-Type: application/json

   {
     "baseSnapshotUri": "file://.compliance-snapshots/default_snp_100.json.gz",
     "targetSnapshotUri": "file://.compliance-snapshots/default_snp_101.json.gz"
   }
   ```
4. **Export Signed Evidence Pack:** Generate the official compliance evidence pack for legal review using the Regulatory Export Engine.
