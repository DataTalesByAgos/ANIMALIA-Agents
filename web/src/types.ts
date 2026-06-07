export interface Agent {
  id: string;
  name: string;
  species_id: string;
  x: number;
  y: number;
  age: number;
  energy: number;
  hunger: number;
  thirst: number;
  alive: boolean;
  color: string;
  current_action: string;
}

export interface Resource {
  x: number;
  y: number;
  type: string;
  amount: number;
}

export interface WorldTile {
  x: number;
  y: number;
  biome: string;
  elevation: number;
}

export interface DetailedAgent extends Agent {
  generation: number;
  memories: Array<{ type: string; x: number; y: number; strength: number }>;
  goals: Array<{ name: string; priority: number }>;
}
