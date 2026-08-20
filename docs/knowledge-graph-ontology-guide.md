# Campus Knowledge Graph & Ontology Architecture Guide

## Overview
The ThaibaHive Campus Knowledge Graph provides a unified semantic representation of academic programs, course prerequisites, faculty expertise, campus regulations, and institutional policies.

## Graph Schema
- **Nodes (`KmNode`):** `course`, `major`, `department`, `instructor`, `policy`, `facility`, `requirement`, `career_path`.
- **Directed Edges (`KmEdge`):** `prerequisite_of`, `co_requisite`, `offered_by`, `fulfills_requirement`, `governed_by`, `taught_by`, `leads_to_career`.

## Multi-Hop Traversal
The traversal engine executes BFS/DFS path lookups to resolve transitive prerequisite chains, compute shortest academic roadmaps (Dijkstra algorithm), and detect cyclic dependencies.
