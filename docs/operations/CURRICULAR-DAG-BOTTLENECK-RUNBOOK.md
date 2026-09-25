# Curricular DAG Solver & Bottleneck Analysis Runbook

## Curricular Complexity Metric
Curricular Complexity Index (CCI) formula:
$$\text{CCI} = \sum_{c \in C} (\text{BlockingFactor}(c) + \text{DelayFactor}(c))$$

## Bottleneck Course Scoring
Composite bottleneck score ($0 - 100$):
$$\text{Score}(c) = \min(100, (\text{InDegree} \times 8) + (\text{BlockingFactor} \times 12) + ((1 - \text{PassRate}) \times 40))$$

## Cycle Prevention
The `POST /api/curriculum/prerequisites` endpoint executes Kahn's and Tarjan's algorithms synchronously prior to persisting any new prerequisite relationship. Any candidate edge that creates a directed cycle is rejected with HTTP `409 Conflict` and the exact cycle trace.
