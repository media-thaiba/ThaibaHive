# Smart HVAC & Campus Energy Operations Runbook

## 1. Thermal Comfort Index (ISO 7730 Fanger Model)

### Predicted Mean Vote (PMV) & Predicted Percentage of Dissatisfied (PPD)
$$PMV = [0.303 e^{-0.036 M} + 0.028] \cdot L$$
$$PPD = 100 - 95 \exp\left( -(0.03353 PMV^4 + 0.2179 PMV^2) \right)$$

Where:
- $M$: Metabolic rate ($1.0\text{--}1.2\text{ met}$)
- $L$: Thermal load on human body
- Clothing insulation $I_{cl}$: $0.5\text{--}1.0\text{ clo}$

### Comfort Target Categories
- **Category A (Excellent)**: $-0.2 \le PMV \le +0.2$, $PPD \le 6\%$
- **Category B (Good)**: $-0.5 \le PMV \le +0.5$, $PPD \le 10\%$
- **Category C (Acceptable)**: $-0.7 \le PMV \le +0.7$, $PPD \le 15\%$

## 2. IoT BMS Sensor Telemetry & Kalman Filtering
Raw telemetry streams (temperature, relative humidity, $CO_2$ ppm, power kW) are smoothed using a 1D discrete Kalman filter:
$$\hat{x}_k = \hat{x}_{k-1} + K_k (z_k - \hat{x}_{k-1})$$
$$K_k = \frac{P_{k-1} + Q}{P_{k-1} + Q + R}$$

## 3. Microgrid Solar PV & BESS Dispatcher
- **Solar Generation**: Dispatched directly to daytime HVAC baseload.
- **Battery Storage (BESS)**: Charged during solar peak or off-peak grid tariffs; discharged during peak grid tariff windows.
- **Setpoints**: Clamped strictly between $20.0^\circ\text{C}$ and $26.0^\circ\text{C}$.
