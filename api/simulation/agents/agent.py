import uuid
import random
import math

# ------------------------------------------------------------------
# Life cycle timing reference (at 1x speed = 1 tick every 0.5s)
#
#   Age cap:       200 ticks → ~100 real seconds of life at 1x
#   Hunger fills:  0→100 in ~333 ticks → ~2.7 minutes of neglect
#   Thirst fills:  0→100 in ~250 ticks → ~2 minutes of neglect
#   Energy drains: 0→0   in ~1000 ticks (passive only, eating restores)
#
#   This keeps animals alive long enough to observe their behaviours
#   without requiring constant monitoring.
# ------------------------------------------------------------------

# Wander momentum: animals keep heading the same direction for a few
# ticks before picking a new one (makes wandering look intentional).
WANDER_PERSISTENCE = 8   # ticks before direction changes

class Agent:
    def __init__(self, agent_id: str, species_id: str, name: str, x: float, y: float, generation: int = 1):
        self.id = agent_id or str(uuid.uuid4())[:8]
        self.species_id = species_id  # 'herbivore' or 'predator'
        self.name = name
        self.x = x
        self.y = y
        self.age = 0.0
        self.energy = 100.0
        self.hunger = 0.0   # 0 = full, 100 = starving
        self.thirst = 0.0   # 0 = hydrated, 100 = parched
        self.generation = generation
        self.alive = True
        self.current_action = "idle"

        # Wander momentum state
        self._wander_angle = random.uniform(0, 2 * math.pi)
        self._wander_ticks = 0

        # Extensible Agent Architecture State
        self.memories = []  # {"type": str, "x": int, "y": int, "strength": float}
        self.goals = []
        self.actions = []

        # ── Species config ──────────────────────────────────────────
        if species_id == "predator":
            self.color = "#ef4444"
            self.vision = 7          # tiles visible radius
            self.speed = 0.55        # tiles per tick (smooth, not teleporting)
            self.hunger_rate = 0.28  # hunger per tick
            self.thirst_rate = 0.38  # thirst per tick
            self.energy_drain = 0.08 # energy lost per tick (passive)
            self.max_age = 220.0
        else:
            self.color = "#10b981"
            self.vision = 5
            self.speed = 0.40        # deer are slightly slower than wolves
            self.hunger_rate = 0.22
            self.thirst_rate = 0.32
            self.energy_drain = 0.06
            self.max_age = 240.0

    # ── Main update ─────────────────────────────────────────────────
    def tick(self, world, other_agents, logs, allow_birth=True):
        if not self.alive:
            return

        # 1. Update vitals (slow, observable degradation)
        self.age    += 0.1
        self.hunger  = min(100.0, self.hunger + self.hunger_rate)
        self.thirst  = min(100.0, self.thirst + self.thirst_rate)
        self.energy  = max(0.0,   self.energy - self.energy_drain)

        # Natural death checks
        if self.hunger >= 100.0 or self.thirst >= 100.0 or self.age >= self.max_age or self.energy <= 0.0:
            self.alive = False
            reason = "old age"
            if self.hunger >= 100.0:  reason = "starvation"
            elif self.thirst >= 100.0: reason = "dehydration"
            elif self.energy <= 0.0:   reason = "exhaustion"
            logs.append(f"☠ {self.name} ({self.species_id}) died of {reason} at age {self.age:.0f}")
            return

        # 2. Perception — gather nearby info
        vision_r = self.vision
        nearby_resources = []
        nearby_prey      = []
        nearby_predators = []

        for (rx, ry), res in world.resources.items():
            if res["amount"] > 0:
                dist = math.sqrt((self.x - rx)**2 + (self.y - ry)**2)
                if dist <= vision_r:
                    nearby_resources.append((rx, ry, res, dist))
                    self.add_memory(res["type"], rx, ry)

        for other in other_agents:
            if other.id == self.id or not other.alive:
                continue
            dist = math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)
            if dist <= vision_r:
                if other.species_id == "predator":
                    nearby_predators.append((other, dist))
                else:
                    nearby_prey.append((other, dist))

        # 3. Decision Planner — reactive priority ladder
        if self.species_id == "predator":
            self._decide_predator(nearby_prey, nearby_resources, world, logs)
        else:
            self._decide_herbivore(nearby_predators, nearby_resources, other_agents, world, logs, allow_birth)

    # ── Predator AI ─────────────────────────────────────────────────
    def _decide_predator(self, nearby_prey, nearby_resources, world, logs):
        # Critical thirst overrides hunting
        if self.thirst > 70.0:
            self.current_action = "🌊 seeking water"
            self._approach_resource("water", world, logs)
            return

        if nearby_prey:
            target, dist = min(nearby_prey, key=lambda t: t[1])
            self.current_action = f"🐾 hunting {target.name}"
            self._move_towards(target.x, target.y, sprint=True)

            # Attack if adjacent (within 1.0 tile)
            if dist < 1.0:
                target.alive = False
                self.hunger  = max(0.0, self.hunger - 65.0)
                self.energy  = min(100.0, self.energy + 25.0)
                logs.append(f"🐺 Wolf {self.name} hunted {target.name}!")
            return

        # Moderate hunger sends wolf looking for prey
        if self.hunger > 45.0:
            self.current_action = "👁 patrolling"
            self._wander(world, persist=True)
            return

        self.current_action = "💤 resting"
        # Stay still when content — energy trickle recover
        self.energy = min(100.0, self.energy + 0.15)

    # ── Herbivore AI ────────────────────────────────────────────────
    def _decide_herbivore(self, nearby_predators, nearby_resources, other_agents, world, logs, allow_birth):
        # FLEE — highest priority: predator visible
        if nearby_predators:
            self.current_action = "⚡ fleeing!"
            pred, _ = min(nearby_predators, key=lambda t: t[1])
            dx = self.x - pred.x
            dy = self.y - pred.y
            length = math.sqrt(dx**2 + dy**2)
            if length > 0:
                # Sprint away
                flee_x = self.x + (dx / length) * self.speed * 1.8
                flee_y = self.y + (dy / length) * self.speed * 1.8
                self.x = max(0.0, min(float(world.width - 1),  flee_x))
                self.y = max(0.0, min(float(world.height - 1), flee_y))
            return

        # THIRST — urgent need to drink
        if self.thirst > 60.0:
            self.current_action = "💧 seeking water"
            self._approach_resource("water", world, logs)
            return

        # HUNGER — need to eat
        if self.hunger > 45.0:
            self.current_action = "🌿 foraging"
            self._approach_resource("food", world, logs)
            return

        # REPRODUCE — only when content and population allows
        if self.hunger <= 25.0 and self.thirst <= 25.0 and self.energy > 60.0 and allow_birth:
            candidates = [
                a for a in other_agents
                if a.species_id == "herbivore" and a.id != self.id
                and a.alive and a.hunger < 40.0 and a.thirst < 40.0
                and a.energy > 50.0
            ]
            if candidates:
                partner, p_dist = min(
                    ((a, math.sqrt((self.x - a.x)**2 + (self.y - a.y)**2)) for a in candidates),
                    key=lambda t: t[1]
                )
                if p_dist < 1.2:
                    self.current_action = "🐣 reproducing"
                    # Cost of reproduction for both parents
                    self.energy  -= 30.0
                    partner.energy -= 30.0
                    child_x = self.x + random.uniform(-1.5, 1.5)
                    child_y = self.y + random.uniform(-1.5, 1.5)
                    child = Agent(
                        None, "herbivore",
                        f"Deer-{random.randint(100, 999)}",
                        max(0.5, min(float(world.width - 1.5),  child_x)),
                        max(0.5, min(float(world.height - 1.5), child_y)),
                        self.generation + 1
                    )
                    # Newborns start small / young
                    child.energy = 80.0
                    other_agents.append(child)
                    logs.append(f"🐣 {self.name} & {partner.name} → born {child.name}")
                    return
                else:
                    self.current_action = "💕 seeking mate"
                    self._move_towards(partner.x, partner.y)
                    return

        # GRAZE / WANDER — content animals move lazily
        food_nearby = [r for r in self.memories if r["type"] == "food"]
        if food_nearby and random.random() < 0.3:
            # Drift toward remembered food slowly even when not hungry
            mem = random.choice(food_nearby)
            self.current_action = "🚶 grazing"
            self._move_towards(mem["x"], mem["y"], fraction=0.4)
        else:
            self.current_action = "🚶 wandering"
            self._wander(world, persist=True)

    # ── Resource approach ────────────────────────────────────────────
    def _approach_resource(self, resource_type, world, logs):
        """Move toward nearest known resource of given type; consume if adjacent."""
        targets = [
            (rx, ry, res, math.sqrt((self.x - rx)**2 + (self.y - ry)**2))
            for (rx, ry), res in world.resources.items()
            if res["type"] == resource_type and res["amount"] > 0
        ]

        if targets:
            rx, ry, res, dist = min(targets, key=lambda t: t[3])
            if dist < 1.0:
                # Consume — moderate amount so the world doesn't deplete instantly
                consume = min(res["amount"], 28.0)
                res["amount"] -= consume
                if resource_type == "food":
                    self.hunger = max(0.0, self.hunger - consume)
                else:
                    self.thirst = max(0.0, self.thirst - consume)
                self.energy = min(100.0, self.energy + 10.0)
                self.add_memory(resource_type, rx, ry)
            else:
                self._move_towards(rx, ry)
        else:
            # Fall back to memory
            memories_of_type = [m for m in self.memories if m["type"] == resource_type]
            if memories_of_type:
                mem = random.choice(memories_of_type)
                self._move_towards(mem["x"], mem["y"])
                # Arrived but empty — forget location
                if math.sqrt((self.x - mem["x"])**2 + (self.y - mem["y"])**2) < 1.0:
                    self.memories.remove(mem)
            else:
                self._wander(world, persist=False)

    # ── Memory ───────────────────────────────────────────────────────
    def add_memory(self, m_type, x, y):
        for m in self.memories:
            if m["type"] == m_type and m["x"] == x and m["y"] == y:
                m["strength"] = 1.0
                return
        self.memories.append({"type": m_type, "x": x, "y": y, "strength": 1.0})

    # ── Movement helpers ─────────────────────────────────────────────
    def _move_towards(self, tx, ty, sprint=False, fraction=1.0):
        """Move one step toward target at own speed (optionally sprinting)."""
        dx = tx - self.x
        dy = ty - self.y
        dist = math.sqrt(dx**2 + dy**2)
        if dist < 0.1:
            return
        step = self.speed * (1.5 if sprint else 1.0) * fraction
        step = min(dist, step)
        self.x += (dx / dist) * step
        self.y += (dy / dist) * step

    def _wander(self, world, persist=True):
        """Move in a persistent random direction, only changing occasionally."""
        self._wander_ticks += 1
        if not persist or self._wander_ticks >= WANDER_PERSISTENCE:
            # Pick a new direction, biased toward the center to stop edge-hugging
            cx = world.width / 2
            cy = world.height / 2
            bias_x = (cx - self.x) * 0.05
            bias_y = (cy - self.y) * 0.05
            base_angle = math.atan2(bias_y + random.uniform(-1, 1), bias_x + random.uniform(-1, 1))
            self._wander_angle = base_angle
            self._wander_ticks = 0

        speed = self.speed * 0.6  # wander at 60 % of max speed
        nx = self.x + math.cos(self._wander_angle) * speed
        ny = self.y + math.sin(self._wander_angle) * speed
        self.x = max(0.5, min(float(world.width  - 1.5), nx))
        self.y = max(0.5, min(float(world.height - 1.5), ny))
