# ANIMALIA Agents

![ANIMALIA Agents](Animalia%20Agents.png)

## Description
Progressive multi-agent ecosystem simulation and Agentic AI laboratory.

## Core Features Implemented (Phases 1-5)
1. **Procedural Voxel World**: Simple biome-generation (Water, Grassland, Forest, Mountains) with deterministic seed support.
2. **Autonomous Agent Architecture**: Deer (Herbivore) and Wolf (Predator) agents with internal perception, vitals degradation (hunger, thirst, age, energy), and state loops.
3. **Behavioral AI Logic**:
   - Herbivores locate and consume grass, flee when predators approach, and seek partners to reproduce.
   - Predators actively hunt herbivores, search for water, and manage vitals.
4. **Local Memory (Phase 5)**: Agents remember positions of resource discoveries and navigate back to them if necessary.
5. **Observability Dashboard**:
   - Real-time 3D rendering (React Three Fiber) with smooth orbit controls.
   - Comprehensive left inspector panel showing select agent vitals, goal stack, current actions, and memory items.
   - Right panel streaming births, deaths, hunter logs, and dynamic speed scales.

## Architecture Ports Mapping (Custom Ports Configuration)
- **Frontend App**: `http://localhost:5180` (mapped to container internal port `5173`)
- **FastAPI backend**: `http://localhost:8010` (mapped to container internal port `8000`)
- **MySQL Database**: `localhost:3316` (mapped to container internal port `3306`)
- **Adminer DB Console**: `http://localhost:8090` (mapped to container internal port `8080`)

## Getting Started
Build and run the stack using Docker Compose:
```bash
docker-compose up --build
```
