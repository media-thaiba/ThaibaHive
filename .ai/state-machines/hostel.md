# hostel.md — Residential Bed Allocation State Machine

```
[ Vacant ] ──► [ Reserved ] ──► [ Occupied ] ──► [ Under Maintenance ] ──► [ Vacant ]
```

---

# transport.md — Transit Route & Pass State Machine

```
[ Assigned ] ──► [ Active Passenger ] ──► [ Suspended ] ──► [ Terminated ]
```

---

# inventory.md — Stock Consumption State Machine

```
[ Requisitioned ] ──► [ Approved ] ──► [ Ordered ] ──► [ Received in Stock ] ──► [ Consumed / Issued ]
```

---

# asset.md — Fixed Asset Lifecycle State Machine

```
[ Procured ] ──► [ Tagged ] ──► [ In Service ] ──► [ Maintenance ] ──► [ Decommissioned / Disposed ]
```
