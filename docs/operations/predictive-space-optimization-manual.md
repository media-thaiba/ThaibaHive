# Predictive Space & HVAC Energy Optimization Manual

## 1. Machine Learning Forecasting Architecture
The predictive space optimization subsystem utilizes a hybrid Holt-Winters double exponential smoothing algorithm combined with a 24-hour diurnal campus activity curve:

$$\hat{y}_{t+h} = \ell_t + h b_t + s_{t+h-m}$$

- **Level Smoothing Parameter ($\alpha$)**: $0.4$
- **Trend Smoothing Parameter ($\beta$)**: $0.2$
- **Diurnal Campus Weighting ($s$)**: Dynamically adjusts predictions based on historical 24-hour academic lecture profiles (peaks at 10 AM and 2 PM, low baseline at night).
- **Confidence Intervals**: Computed using moving standard deviation ($\pm 1.96 \sigma$ for 95% bounds).

## 2. Autonomous Space Allocation Reallocation Engine
The `SpaceAllocator` identifies scheduled classes or meetings that are mismatched with room sizes:
- **Oversized Room Mismatch**: Class headcount $< 40\%$ room capacity (e.g. 15 students in 150-seat lecture hall).
- **Overcrowding Hazard**: Expected attendance $> 100\%$ room capacity.
- **Reallocation Algorithm**: Searches for alternative candidate rooms on the same floor/facility with matching equipment and wheelchair accessibility, targeting an optimal $80\%$ utilization index.

## 3. HVAC Predictive Setback Strategy
Predictive setbacks dynamically adjust heating/cooling power output:
- **Occupied Comfort Mode** ($t_{\text{pred}} \ge 5$ occupants): Set target temperature to $22.0^\circ\text{C}$ ($100\%$ cooling kW).
- **Pre-Conditioning Buffer** ($t+1$ upcoming class): Ramp target temperature to $23.0^\circ\text{C}$ 30 minutes prior to arrival ($75\%$ cooling kW).
- **Unoccupied Eco Setback** (Room empty): Relax target temperature to $26.0^\circ\text{C}$ in cooling / $18.0^\circ\text{C}$ in heating ($25\%$ baseline idle kW).
- **Target Performance**: Yields $\ge 15\%$ measured energy reduction across campus building footprints.

## 4. API Endpoints
- `POST /api/twin/optimization/predict`
  - Request: `{ "facilityId": "FAC-01", "spaceId": "SEC-101", "forecastHours": 24, "enableHvacOptimization": true }`
  - Response: Returns 24-hour hourly occupancy predictions, confidence bounds, HVAC schedule recommendations, and total kWh/cost savings estimates.
