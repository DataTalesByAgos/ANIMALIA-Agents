import random
import math

class World:
    def __init__(self, width: int = 30, height: int = 30, seed: int = 42):
        self.width  = width
        self.height = height
        self.seed   = seed
        self.tiles     = {}
        self.resources = {}
        self._grassland_tiles = []
        self._tick_counter = 0
        self.generate()

    def generate(self):
        random.seed(self.seed)

        for x in range(self.width):
            for y in range(self.height):
                d_center = math.sqrt((x - self.width / 2)**2 + (y - self.height / 2)**2)
                max_dist  = math.sqrt((self.width / 2)**2 + (self.height / 2)**2)
                norm_d    = d_center / max_dist

                noise  = random.random() * 0.22
                noise += random.random() * 0.08

                val = norm_d + noise

                if val < 0.22:
                    biome, elevation = "water",     0.2
                elif val < 0.55:
                    biome, elevation = "grassland", 0.8
                elif val < 0.78:
                    biome, elevation = "forest",    1.2
                else:
                    biome, elevation = "mountain",  2.0

                self.tiles[(x, y)] = {"biome": biome, "elevation": elevation}

        self._grassland_tiles = [pos for pos, t in self.tiles.items() if t["biome"] == "grassland"]

        # ── Seed food patches: finite, varied amounts ─────────────────
        # Each patch has a random "abundance" — how many bites it provides
        for pos in self._grassland_tiles:
            if random.random() < 0.14:
                self._spawn_food_patch(pos)

        # ── Water tiles: plentiful but not infinite ───────────────────
        for pos, tile in self.tiles.items():
            if tile["biome"] == "water":
                self.resources[pos] = {
                    "type": "water",
                    "amount": 500.0,
                    "max_amount": 500.0,
                }

    def _spawn_food_patch(self, pos):
        """Spawn a new food patch with random abundance at the given tile."""
        # Bites × amount_per_bite gives total food energy
        bites          = random.randint(3, 9)          # how many full bites this patch yields
        amount_per_bite = random.uniform(14.0, 24.0)   # energy per bite
        total          = bites * amount_per_bite
        self.resources[pos] = {
            "type":       "food",
            "amount":     total,
            "max_amount": total,
            "bites_left": bites,   # tracked separately for UI richness
        }

    def replenish_resources(self):
        self._tick_counter += 1

        # ── Remove fully depleted food patches ────────────────────────
        depleted = [pos for pos, r in list(self.resources.items())
                    if r["type"] == "food" and r["amount"] <= 0]
        for pos in depleted:
            del self.resources[pos]

        # ── Refill water (nearly infinite wells) ─────────────────────
        for res in self.resources.values():
            if res["type"] == "water":
                res["amount"] = min(res["max_amount"], res["amount"] + 40.0)

        # ── Spawn new food patches every ~8 ticks in random locations ─
        # Rate adjusts so the world stays ~12 % green even after heavy grazing
        food_count = sum(1 for r in self.resources.values() if r["type"] == "food")
        target     = int(len(self._grassland_tiles) * 0.12)

        if self._tick_counter % 8 == 0 and food_count < target:
            spawns = min(3, target - food_count)
            candidates = [p for p in self._grassland_tiles if p not in self.resources]
            random.shuffle(candidates)
            for pos in candidates[:spawns]:
                self._spawn_food_patch(pos)
