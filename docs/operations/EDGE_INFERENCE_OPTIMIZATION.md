# Edge-Native Model Inference Optimization & Simulation Guide

## Post-Training Quantization (INT8)
Models are quantized from 32-bit floating point down to 8-bit signed integers:
$$q = \text{round}\left(\frac{w}{\text{scale}}\right) + \text{zeroPoint}$$
This delivers a **75% reduction** in memory and bandwidth footprint with negligible accuracy loss (<0.5%).

## Running the Multi-Campus Simulation
Execute the autonomous cross-campus federated simulation harness:
```bash
pnpm afed:simulate
```

### Simulated Capabilities:
1. Multi-campus topology initialization (4 edge campus servers)
2. 3-round FedAvg with $(\epsilon=1.0, \delta=10^{-5})$ DP noise and SecAgg masking
3. Covariate shift drift detection on student attendance and automated retraining triggers
4. INT8 quantized edge ONNX inference with latency profiling
5. Privacy-preserving IPEDS institutional rankings and percentiles
