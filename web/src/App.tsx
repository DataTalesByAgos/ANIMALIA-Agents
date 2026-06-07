import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { 
  Play, Pause, RotateCcw, Activity, Users, Layers, Shield, Compass, BrainCircuit, Heart, Droplet, Clock
} from 'lucide-react';
import { useStore } from './store';
import { SimulationCanvas } from './SimulationCanvas';

const App: React.FC = () => {
  const {
    tick, running, speed, agentCount, logs, selectedAgentId, selectedAgentDetails,
    fetchState, fetchWorld, togglePlay, resetSim, setSpeedFactor, selectAgent
  } = useStore();

  const [simSeed, setSimSeed] = useState(42);

  // Poll simulator state regularly when running
  useEffect(() => {
    fetchWorld();
    fetchState();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) {
      // Poll every 500ms — matches the base tick interval at 1x speed.
      // This means the UI is always showing data from the most recent tick,
      // while Three.js lerp fills in the motion between polls.
      interval = setInterval(() => {
        fetchState();
      }, 500);
    } else {
      interval = setInterval(() => {
        fetchState();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [running]);

  const handleReset = () => {
    const nextSeed = Math.floor(Math.random() * 1000);
    setSimSeed(nextSeed);
    resetSim(nextSeed);
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#070a13] text-slate-100 selection:bg-cyan-500/30">
      
      {/* Top Header Bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg shadow-lg shadow-emerald-500/20">
            <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide font-sans bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              ANIMALIA AGENTS
            </h1>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Multi-Agent AI Lab</p>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Tick:</span>
            <span className="font-mono font-bold text-slate-100">{tick}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Population:</span>
            <span className="font-mono font-bold text-slate-100">{agentCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400">Speed:</span>
            <span className="font-mono font-bold text-slate-100">{speed}x</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={togglePlay}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
              running 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button 
            onClick={handleReset}
            className="p-2.5 rounded-lg bg-slate-800/40 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 transition-all"
            title="Reset with a new procedural seed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex rounded-lg border border-slate-700/50 overflow-hidden bg-slate-900/40">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedFactor(s)}
                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                  speed === s 
                    ? 'bg-cyan-500/20 text-cyan-400 border-r border-slate-700/50' 
                    : 'text-slate-400 hover:text-slate-200 border-r border-slate-700/50 last:border-0'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Workspace Panels */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* LEFT PANEL: Selected Agent Inspector */}
        <aside className="w-80 glass-panel m-4 rounded-xl flex flex-col overflow-hidden z-10">
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold tracking-wide">Agent Inspector</h2>
            </div>
            {selectedAgentId && (
              <button 
                onClick={() => selectAgent(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700/30"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
            {selectedAgentDetails ? (
              <>
                <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedAgentDetails.color }} />
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{selectedAgentDetails.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Gen {selectedAgentDetails.generation} • {selectedAgentDetails.species_id}
                    </div>
                  </div>
                </div>

                {/* Vitals */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vitals</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> Energy</span>
                        <span className="font-mono">{selectedAgentDetails.energy}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${selectedAgentDetails.energy}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-amber-500" /> Hunger</span>
                        <span className="font-mono">{selectedAgentDetails.hunger}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${selectedAgentDetails.hunger}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1"><Droplet className="w-3.5 h-3.5 text-blue-500" /> Thirst</span>
                        <span className="font-mono">{selectedAgentDetails.thirst}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${selectedAgentDetails.thirst}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Goal Stack (GOAP-Ready)</h3>
                  <div className="space-y-1.5">
                    {selectedAgentDetails.goals.map((g, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/30 border border-slate-800/50">
                        <span className="text-slate-300">{g.name}</span>
                        <span className="font-mono text-cyan-400 font-semibold">Priority {g.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action details */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Executing Tool/Action</h3>
                  <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-xs flex items-center justify-between text-cyan-300">
                    <span className="font-semibold">{selectedAgentDetails.current_action}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-[10px] uppercase font-bold">In Progress</span>
                  </div>
                </div>

                {/* Memories */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Local Memories</h3>
                  {selectedAgentDetails.memories.length === 0 ? (
                    <div className="text-xs text-slate-500 italic p-3 text-center bg-slate-900/10 rounded-lg border border-dashed border-slate-800">
                      No memories yet. Searching surroundings...
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {selectedAgentDetails.memories.map((m, idx) => (
                        <div key={idx} className="p-2 bg-slate-900/30 rounded border border-slate-800/50 text-[11px] flex justify-between">
                          <span className="text-slate-300 capitalize">{m.type} found</span>
                          <span className="font-mono text-slate-400">({m.x}, {m.y})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <BrainCircuit className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                <p className="text-xs leading-relaxed">
                  Click on any voxel creature in the 3D map to inspect its real-time perception state, GOAP goals, memory stack, and decisions.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* 3D CANVAS VIEW */}
        <main className="flex-1 h-full relative">
          <Canvas
            shadows
            camera={{ position: [15, 18, 22], fov: 40 }}
            gl={{ antialias: true, toneMapping: 3 /* ACESFilmic */ }}
          >
            {/* Warm golden sunlight from top-right */}
            <directionalLight
              position={[20, 40, 10]}
              intensity={1.8}
              color="#ffe8b0"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.5}
              shadow-camera-far={80}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
              shadow-bias={-0.0005}
            />
            {/* Cool sky fill from opposite side */}
            <directionalLight position={[-10, 15, -15]} intensity={0.45} color="#b0d4ff" />
            {/* Soft ambient so shadows aren't pitch black */}
            <ambientLight intensity={0.55} color="#dde8ff" />
            {/* Atmospheric depth */}
            <fog attach="fog" args={['#131b2e', 35, 70]} />
            <SimulationCanvas />
            <OrbitControls
              enableDamping
              dampingFactor={0.06}
              maxPolarAngle={Math.PI / 2 - 0.04}
              minDistance={8}
              maxDistance={55}
            />
          </Canvas>

          {/* Controls hint */}
          <div className="absolute top-4 right-4 pointer-events-none bg-slate-950/65 backdrop-blur px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Right-click &amp; Drag to Orbit | Scroll to Zoom</span>
          </div>

          {/* Aura Legend */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-950/70 backdrop-blur px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-4 text-[10px] font-semibold">
            <span className="text-slate-400 tracking-widest uppercase">Aura</span>
            {[
              { color: 'bg-green-400',  label: 'Foraging' },
              { color: 'bg-sky-400',    label: 'Drinking' },
              { color: 'bg-orange-400', label: 'Fleeing' },
              { color: 'bg-red-400',    label: 'Hunting' },
              { color: 'bg-fuchsia-400',label: 'Mating' },
              { color: 'bg-lime-400',   label: 'Resting' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
                <span className="text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT PANEL: Live Log Console */}
        <aside className="w-80 glass-panel m-4 rounded-xl flex flex-col overflow-hidden z-10">
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold tracking-wide">Ecosystem Live Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-[11px] space-y-2 bg-[#090d16]/60">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">Console starting...</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-1 border-b border-slate-900/80 last:border-0 ${
                    log.includes('died') 
                      ? 'text-rose-400' 
                      : log.includes('reproduced') 
                      ? 'text-emerald-400' 
                      : log.includes('hunted') 
                      ? 'text-amber-400' 
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 font-semibold mr-1.5">[{tick}]</span>
                  {log}
                </div>
              ))
            )}
          </div>
        </aside>

      </div>
    </div>
  );
};

export default App;
