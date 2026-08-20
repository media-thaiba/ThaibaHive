# IoT Sensor Integration & Mesh Commissioning Runbook

## 1. Supported IoT Communication Protocols

| Protocol | Transport | Port / Path | Topic / Format Schema | Use Case |
|---|---|---|---|---|
| **MQTT** | TCP / TLS | `8883` | `campus/{tenantId}/{facilityId}/{spaceId}/sensor/{sensorId}` | Real-time high-frequency room telemetry |
| **CoAP** | UDP | `5683` | `/sensors/{sensorId}/telemetry` (binary packed) | Low-power battery-operated environmental nodes |
| **HTTP Webhook** | HTTPS | `/api/twin/telemetry/ingest` | JSON payload with single or batch array | LoRaWAN / Sigfox gateway egress bridges |
| **BLE Mesh** | Bluetooth 5.x | Native Gateway Mesh | RSSI beacon packets with UUID & TxPower | RTLS asset localization and presence badges |

## 2. Sensor Commissioning Workflow
1. **Device Provisioning**:
   - Assign hardware UUID (e.g. `SEN-ENV-SEC-101`).
   - Calibrate sensor in controlled environment against reference standard.
2. **Registration via REST API or Admin Studio**:
   ```bash
   curl -X POST https://thaibahive.local/api/twin/sensors \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "sensorId": "SEN-ENV-SEC-101",
       "facilityId": "FAC-SEC-01",
       "spaceId": "SEC-101",
       "sensorType": "temperature",
       "protocol": "mqtt",
       "samplingIntervalSeconds": 60,
       "calibrationOffset": -0.2,
       "coordinatesJson": "{\"x\":12.5,\"y\":8.0,\"z\":3.5}"
     }'
   ```
3. **Validation & Anomaly Threshold Configuration**:
   - Temperature Normal Range: $18.0^\circ\text{C} - 26.0^\circ\text{C}$
   - $\text{CO}_2$ Normal Range: $400\text{ ppm} - 1000\text{ ppm}$
   - Noise Normal Range: $30\text{ dB} - 75\text{ dB}$
   - $Z$-Score Threshold: $Z \ge 2.5$ triggers Warning; $Z \ge 3.5$ triggers Critical Anomaly.

## 3. Sensor Health Monitoring & Self-Healing
The `SensorHealthMonitor` continuously analyzes incoming heartbeats:
- **Online**: Heartbeat received within $3 \times \text{samplingIntervalSeconds}$.
- **Degraded**: Battery percentage $< 20\%$ or $Z$-score drift detected.
- **Offline**: No heartbeat for $> 3 \times \text{interval}$. Automatically dispatches maintenance order into `twin_maintenance_orders`.

## 4. Troubleshooting & Error Codes

| Error Symptom | Probable Cause | Remediation Procedure |
|---|---|---|
| **400 Bad Request on Ingestion** | Invalid metric type or timestamp format | Check Zod schema validation rules in `src/lib/validation/twin-schemas.ts`. |
| **Sensor Marked Degraded** | Low battery or calibration drift | Replace CR2032/LiPo cell or adjust `calibrationOffset` via Admin Studio. |
| **Telemetry Dropped** | Tenant isolation mismatch | Ensure `tenantId` in header/payload matches registered institution scope. |
