from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import threading
import time
from typing import List, Dict, Any

from simulation.world.world import World
from simulation.agents.agent import Agent

app = FastAPI(title="ANIMALIA Agents API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulation Engine State
class SimulationState:
    def __init__(self):
        self.world = None
        self.agents: List[Agent] = []
        self.tick_count = 0
        self.is_running = False
        self.speed_factor = 1.0  # 1x to 8x
        self.logs: List[str] = []
        self.lock = threading.Lock()
        self.reset()

    def reset(self, seed: int = 42):
        with self.lock:
            self.world = World(width=30, height=30, seed=seed)
            self.agents = []
            self.tick_count = 0
            self.logs = ["Simulation initialized."]
            
            # Spawn initial standard population (e.g. 25 herbivores, 3 predators)
            for i in range(25):
                rx = random.uniform(2, 28)
                ry = random.uniform(2, 28)
                self.agents.append(Agent(None, "herbivore", f"Deer-{i}", rx, ry))
            for i in range(3):
                rx = random.uniform(2, 28)
                ry = random.uniform(2, 28)
                self.agents.append(Agent(None, "predator", f"Wolf-{i}", rx, ry))

    def tick(self):
        with self.lock:
            self.tick_count += 1
            # Replenish resources in world
            self.world.replenish_resources()
            
            # Tick each alive agent
            alive_agents = [a for a in self.agents if a.alive]
            # Copy to allow additions (reproduction) inside loop safely
            for agent in list(alive_agents):
                if agent.alive:
                    # Prevent births if we exceed max population cap of 100
                    current_living = len([a for a in self.agents if a.alive])
                    agent.tick(self.world, self.agents, self.logs, allow_birth=(current_living < 100))

            # Prune dead agents if they grow too large
            if len(self.agents) > 120:
                self.agents = [a for a in self.agents if a.alive]

            # Limit log sizes
            if len(self.logs) > 80:
                self.logs = self.logs[-80:]

state = SimulationState()

# Background task loop
def run_simulation_loop():
    while True:
        if state.is_running:
            state.tick()
            # 1x = 0.5s per tick → visually comfortable observation pace
            # 2x = 0.25s, 4x = 0.125s, 8x = 0.0625s
            sleep_time = max(0.06, 0.5 / state.speed_factor)
            time.sleep(sleep_time)
        else:
            time.sleep(0.2)

# Start background thread
thread = threading.Thread(target=run_simulation_loop, daemon=True)
thread.start()

class ResetRequest(BaseModel):
    seed: int = 42

@app.post("/api/simulation/start")
def start_sim():
    state.is_running = True
    return {"status": "running"}

@app.post("/api/simulation/pause")
def pause_sim():
    state.is_running = False
    return {"status": "paused"}

@app.post("/api/simulation/reset")
def reset_sim(req: ResetRequest):
    state.reset(req.seed)
    return {"status": "reset", "seed": req.seed}

@app.post("/api/simulation/speed")
def set_speed(speed: float):
    state.speed_factor = max(1.0, min(8.0, speed))
    return {"speed_factor": state.speed_factor}

@app.get("/api/simulation/state")
def get_state():
    with state.lock:
        return {
            "tick": state.tick_count,
            "running": state.is_running,
            "speed": state.speed_factor,
            "agent_count": len([a for a in state.agents if a.alive]),
            "logs": state.logs,
            "agents": [
                {
                    "id": a.id,
                    "name": a.name,
                    "species_id": a.species_id,
                    "x": round(a.x, 2),
                    "y": round(a.y, 2),
                    "age": round(a.age, 1),
                    "energy": round(a.energy, 1),
                    "hunger": round(a.hunger, 1),
                    "thirst": round(a.thirst, 1),
                    "alive": a.alive,
                    "color": a.color,
                    "current_action": a.current_action,
                    "gender": a.gender
                } for a in state.agents if a.alive
            ],
            "resources": [
                {
                    "x": pos[0],
                    "y": pos[1],
                    "type": r["type"],
                    "amount": round(r["amount"], 1)
                } for pos, r in state.world.resources.items() if r["amount"] > 1.0
            ]
        }

@app.get("/api/simulation/world")
def get_world():
    with state.lock:
        return {
            "width": state.world.width,
            "height": state.world.height,
            "tiles": [
                {
                    "x": pos[0],
                    "y": pos[1],
                    "biome": tile["biome"],
                    "elevation": tile["elevation"]
                } for pos, tile in state.world.tiles.items()
            ]
        }

@app.get("/api/agents/{agent_id}")
def get_agent_details(agent_id: str):
    with state.lock:
        agent = next((a for a in state.agents if a.id == agent_id), None)
        if not agent:
            return {"error": "Agent not found"}
        return {
            "id": agent.id,
            "name": agent.name,
            "species_id": agent.species_id,
            "x": round(agent.x, 2),
            "y": round(agent.y, 2),
            "age": round(agent.age, 1),
            "energy": round(agent.energy, 1),
            "hunger": round(agent.hunger, 1),
            "thirst": round(agent.thirst, 1),
            "generation": agent.generation,
            "alive": agent.alive,
            "current_action": agent.current_action,
            "gender": agent.gender,
            "_births": agent._births,
            "memories": agent.memories,
            "goals": [
                {"name": "Stay Alive", "priority": 1.0},
                {"name": "Find Food", "priority": round(agent.hunger / 100.0, 2)},
                {"name": "Find Water", "priority": round(agent.thirst / 100.0, 2)}
            ]
        }
