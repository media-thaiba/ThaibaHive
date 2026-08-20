# Multi-Cloud Compute Rightsizing & ESG Sustainability Reporting Guide

## 1. Cloud Cost Rightsizing & Spot Orchestration
- **Rightsizing Heuristics**: Nodes with $< 15\%$ CPU utilization over 7 consecutive days are flagged for downsizing or termination.
- **Spot Pre-Drain Migration**: Listens to AWS/GCP 2-minute termination notices and seamlessly drains active container workloads to reserve nodes.
- **Financial Guardrail**: Maximum cost variance per batch clamped to $\$500$.

## 2. GHG Protocol Carbon Accounting (Scopes 1, 2, 3)

### Scope 1 (Direct Fleet Emissions)
$$E_{\text{Scope1}} = \text{Fuel}_{\text{diesel}} \times 2.68\text{ kg CO}_2\text{e/L} + \text{Fuel}_{\text{gasoline}} \times 2.31\text{ kg CO}_2\text{e/L}$$

### Scope 2 (Indirect Grid Electricity)
$$E_{\text{Scope2}} = \text{Electricity}_{\text{grid, kWh}} \times 0.42\text{ kg CO}_2\text{e/kWh}$$

### Scope 3 (Cloud Compute & Supply Chain)
$$E_{\text{Scope3}} = \sum \text{vCPU-hours} \times 0.0021\text{ kg CO}_2\text{e/hr}$$

## 3. GRI 305 ESG Reporting Standards
- **Intensity Metric**: $\text{kg CO}_2\text{e}$ emitted per enrolled student FTE.
- **Abatement Roadmap**: Prioritized abatement initiatives ranked by Marginal Abatement Cost Curve (MACC) and payback ROI.
