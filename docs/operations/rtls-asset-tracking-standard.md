# Real-Time Location Services (RTLS) & Asset Tracking Standard

## 1. 3D Multilateration Localization Principles
Indoor positioning calculates $(x, y, z)$ spatial coordinates from BLE beacon RSSI readings across 3 or more fixed receiver gateways:

### Log-Distance Path Loss Model
$$\text{RSSI} = A - 10 \cdot n \cdot \log_{10}(d)$$
$$d = 10^{\frac{A - \text{RSSI}}{10 n}}$$

- **$A$ (Measured Power at 1m)**: Typically $-59\text{ dBm}$.
- **$n$ (Path Loss Exponent)**: $2.0$ (free space) to $2.8$ (dense academic buildings).
- **Position Smoothing**: Moving average filter over the last 5 coordinate solves eliminates RF multipath jitter.

## 2. Geofencing & Perimeter Alarms
- **2D/3D Polygon Boundaries**: Defined via GeoJSON coordinate arrays with optional elevation floors ($z_{\text{min}}, z_{\text{max}}$).
- **Event Classification**:
  - `enter`: Asset crosses perimeter into high-security zone.
  - `exit`: Authorized equipment transfer.
  - `breach`: Unauthorized removal of asset outside designated laboratory perimeter. Automatically triggers SOAR security alert.

## 3. Physical Asset Lifecycle & Depreciation
- **Straight-Line Depreciation**:
  $$\text{Book Value} = \text{Purchase Cost} - (\text{Purchase Cost} - \text{Salvage Value}) \times \frac{\text{Age in Years}}{\text{Useful Life}}$$
- **Preventive Maintenance**: Automatically creates maintenance work orders in `twin_maintenance_orders` when cumulative operational runtime hours reach service thresholds.

## 4. API Endpoints
- `GET /api/twin/assets` — List tracked assets with role-based coordinate masking for non-admin users.
- `POST /api/twin/assets` — Register tracked capital equipment with BLE tag ID.
