# ESG Sustainability & Carbon Reporting Guide

## Standards Compliance
- **GHG Protocol Corporate Standard**: Scope 1 (Direct Fleet Combustion), Scope 2 (Purchased Electricity), Scope 3 (Cloud Data Center Compute).
- **GRI 305 Emissions**: Disclosures on absolute emissions ($t\text{CO}_2\text{e}$), emissions intensity ($kg/\text{student}$), and renewable energy consumption percentages.

## Audit & Verification
- All carbon calculations and ESG reports are cryptographically signed and recorded to the Merkle audit trail (`aims_carbon_metrics`).
- Prometheus metrics are exported at `aims_carbon_emissions_kg_co2e_total` for Grafana dashboard integration.
