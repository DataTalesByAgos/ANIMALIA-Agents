import { create } from 'zustand';
import { Agent, Resource, WorldTile, DetailedAgent } from './types';

interface AppState {
  tick: number;
  running: boolean;
  speed: number;
  agentCount: number;
  logs: string[];
  agents: Agent[];
  resources: Resource[];
  worldTiles: WorldTile[];
  selectedAgentId: string | null;
  selectedAgentDetails: DetailedAgent | null;
  
  // Actions
  fetchState: () => Promise<void>;
  fetchWorld: () => Promise<void>;
  togglePlay: () => Promise<void>;
  resetSim: (seed?: number) => Promise<void>;
  setSpeedFactor: (val: number) => Promise<void>;
  selectAgent: (id: string | null) => void;
  fetchAgentDetails: () => Promise<void>;
}

// Target the configured backend API on port 8010
const API_BASE = 'http://localhost:8010';

export const useStore = create<AppState>((set, get) => ({
  tick: 0,
  running: false,
  speed: 1.0,
  agentCount: 0,
  logs: [],
  agents: [],
  resources: [],
  worldTiles: [],
  selectedAgentId: null,
  selectedAgentDetails: null,

  fetchState: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/simulation/state`);
      const data = await res.json();
      set({
        tick: data.tick,
        running: data.running,
        speed: data.speed,
        agentCount: data.agent_count,
        logs: data.logs,
        agents: data.agents,
        resources: data.resources,
      });

      // Update inspector details if an agent is selected
      const { selectedAgentId } = get();
      if (selectedAgentId) {
        await get().fetchAgentDetails();
      }
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  },

  fetchWorld: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/simulation/world`);
      const data = await res.json();
      set({ worldTiles: data.tiles });
    } catch (err) {
      console.error('Error fetching world tiles:', err);
    }
  },

  togglePlay: async () => {
    const { running } = get();
    const endpoint = running ? 'pause' : 'start';
    try {
      await fetch(`${API_BASE}/api/simulation/${endpoint}`, { method: 'POST' });
      set({ running: !running });
    } catch (err) {
      console.error(err);
    }
  },

  resetSim: async (seed = 42) => {
    try {
      await fetch(`${API_BASE}/api/simulation/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed }),
      });
      set({ selectedAgentId: null, selectedAgentDetails: null });
      await get().fetchState();
    } catch (err) {
      console.error(err);
    }
  },

  setSpeedFactor: async (val: number) => {
    try {
      await fetch(`${API_BASE}/api/simulation/speed?speed=${val}`, { method: 'POST' });
      set({ speed: val });
    } catch (err) {
      console.error(err);
    }
  },

  selectAgent: (id: string | null) => {
    set({ selectedAgentId: id, selectedAgentDetails: null });
    if (id) {
      get().fetchAgentDetails();
    }
  },

  fetchAgentDetails: async () => {
    const { selectedAgentId } = get();
    if (!selectedAgentId) return;
    try {
      const res = await fetch(`${API_BASE}/api/agents/${selectedAgentId}`);
      const data = await res.json();
      if (!data.error) {
        set({ selectedAgentDetails: data });
      } else {
        set({ selectedAgentId: null, selectedAgentDetails: null });
      }
    } catch (err) {
      console.error(err);
    }
  },
}));
