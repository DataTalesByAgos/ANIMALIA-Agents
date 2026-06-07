import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from './store';
import { SimulationCanvas } from './SimulationCanvas';

// Voxel Icon Components (Pixel Art SVGs)
const PlayIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
    <rect x="2" y="2" width="3" height="12" fill="currentColor"/>
    <rect x="6" y="4" width="3" height="8" fill="currentColor"/>
    <rect x="10" y="6" width="3" height="4" fill="currentColor"/>
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
    <rect x="2" y="2" width="3" height="12" fill="currentColor"/>
    <rect x="11" y="2" width="3" height="12" fill="currentColor"/>
  </svg>
);

const ResetIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.5">
    <path d="M13 3c1.5 2 1.5 5 0 7s-5 2-7 0m2-5l-2 2l2 2"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.5">
    <rect x="2" y="2" width="12" height="12" rx="1"/>
    <line x1="8" y1="4" x2="8" y2="8"/>
    <line x1="8" y1="8" x2="11" y2="8"/>
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
    <rect x="2" y="1" width="3" height="3" fill="currentColor"/>
    <rect x="2" y="5" width="3" height="7" fill="currentColor"/>
    <rect x="11" y="1" width="3" height="3" fill="currentColor"/>
    <rect x="11" y="5" width="3" height="7" fill="currentColor"/>
  </svg>
);

const SpeedIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
    <rect x="2" y="6" width="12" height="4" fill="currentColor"/>
    <rect x="8" y="4" width="2" height="8" fill="currentColor"/>
  </svg>
);

const BrainIcon = () => (
  <svg viewBox="0 0 16 16" className="w-5 h-5 fill-current">
    <circle cx="4" cy="4" r="2" fill="currentColor"/>
    <circle cx="12" cy="4" r="2" fill="currentColor"/>
    <circle cx="8" cy="10" r="2" fill="currentColor"/>
    <line x1="4" y1="6" x2="8" y2="10" stroke="currentColor" strokeWidth="1"/>
    <line x1="12" y1="6" x2="8" y2="10" stroke="currentColor" strokeWidth="1"/>
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
    <rect x="4" y="4" width="2" height="2" fill="currentColor"/>
    <rect x="10" y="4" width="2" height="2" fill="currentColor"/>
    <rect x="5" y="6" width="6" height="6" fill="currentColor"/>
  </svg>
);

const WaterIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
    <rect x="6" y="2" width="4" height="12" fill="currentColor"/>
    <line x1="6" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const FoodIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
    <rect x="3" y="3" width="10" height="10" fill="currentColor"/>
    <rect x="5" y="5" width="6" height="6" fill="#0a0e1a"/>
  </svg>
);

const CompassIcon = () => (
  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
    <rect x="6" y="2" width="4" height="12" fill="currentColor"/>
    <rect x="2" y="6" width="12" height="4" fill="currentColor"/>
  </svg>
);

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
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#1a1a1a] text-[#e8e8e8] selection:bg-[#7fb069]/30">
      
      {/* Top Header Bar - Voxel Style */}
      <header className="h-20 flex items-center justify-between px-6 border-b-4 border-[#7fb069] bg-[#2a2a2a] shadow-lg" style={{boxShadow: '0 4px 0 #5a5a5a'}}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#7fb069] to-[#a0714f] border-2 border-[#e8e8e8] shadow-lg" style={{boxShadow: '4px 4px 0 rgba(0,0,0,0.5)'}}>
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#1a1a1a]">
              <rect x="4" y="4" width="16" height="16" fill="currentColor"/>
              <rect x="6" y="6" width="12" height="12" fill="#1a1a1a"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-[#7fb069]" style={{fontFamily: "'Press Start 2P', cursive", textShadow: '0 0 10px rgba(127, 176, 105, 0.3)'}}>
              ANIMALIA
            </h1>
            <p className="text-sm text-[#c9b88d] tracking-widest uppercase font-bold">:: ECOSYSTEM SIM ::</p>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-6 text-base border-l-2 border-r-2 border-[#a0714f] px-6 py-2" style={{boxShadow: 'inset 0 0 10px rgba(160, 113, 79, 0.1)'}}>
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span className="text-[#c9b88d] font-bold text-sm">TICK</span>
            <span className="font-mono text-[#e8e8e8] font-bold text-lg">{tick}</span>
          </div>
          <div className="flex items-center gap-2">
            <PeopleIcon />
            <span className="text-[#c9b88d] font-bold text-sm">AGENTS</span>
            <span className="font-mono text-[#e8e8e8] font-bold text-lg">{agentCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <SpeedIcon />
            <span className="text-[#c9b88d] font-bold text-sm">SPEED</span>
            <span className="font-mono text-[#e8e8e8] font-bold text-lg">{speed}x</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={togglePlay}
            className="voxel-btn border-[#a0714f] bg-[#2a2a2a] text-[#a0714f] hover:text-[#e8e8e8]"
          >
            {running ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button 
            onClick={handleReset}
            className="voxel-btn border-[#7fb069] bg-[#2a2a2a] text-[#7fb069] hover:text-[#e8e8e8]"
            title="Reset with a new procedural seed"
          >
            <ResetIcon />
          </button>
          <div className="flex border-2 border-[#c9b88d] overflow-hidden bg-[#1a1a1a]">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedFactor(s)}
                className={`px-4 py-2 text-sm font-mono font-bold transition-all border-r border-[#c9b88d] last:border-0 ${
                  speed === s 
                    ? 'bg-[#c9b88d] text-[#1a1a1a]' 
                    : 'bg-[#2a2a2a] text-[#c9b88d] hover:bg-[#3a3a3a]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Workspace Panels */}
      <div className="flex-1 flex relative overflow-hidden gap-3 p-3" style={{background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a2a 100%)'}}>
        
        {/* LEFT PANEL: Selected Agent Inspector */}
        <aside className="w-80 glass-panel flex flex-col overflow-hidden z-10" style={{border: '3px solid #7fb069', boxShadow: '0 0 20px rgba(127, 176, 105, 0.2), 6px 6px 0 rgba(90, 90, 90, 0.3)'}}>
          <div className="p-4 border-b-2 border-[#a0714f] bg-[#2a2a2a] flex items-center justify-between" style={{boxShadow: 'inset 0 0 10px rgba(160, 113, 79, 0.1)'}}>
            <div className="flex items-center gap-3">
              <BrainIcon className="text-[#7fb069]" />
              <h2 className="font-bold tracking-widest text-[#e8e8e8] text-base" style={{fontFamily: "'VT323', monospace"}}>AGENT DATA</h2>
            </div>
            {selectedAgentId && (
              <button 
                onClick={() => selectAgent(null)}
                className="text-sm text-[#e8e8e8] hover:text-[#7fb069] px-3 py-1 border-2 border-[#c9b88d] bg-[#1a1a1a] font-bold"
              >
                CLEAR
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {selectedAgentDetails ? (
              <>
                <div className="flex items-center gap-3 bg-[#1a1a1a] p-3 border-2 border-[#a0714f]" style={{boxShadow: 'inset 0 0 10px rgba(160, 113, 79, 0.1)'}}>
                  <div className="w-4 h-4 border border-current" style={{ backgroundColor: selectedAgentDetails.color }} />
                  <div>
                    <div className="font-bold text-[#e8e8e8] text-base" style={{fontFamily: "'VT323', monospace"}}>{selectedAgentDetails.name}</div>
                    <div className="text-[11px] text-[#c9b88d] font-bold uppercase tracking-widest">
                      GEN {selectedAgentDetails.generation} | {selectedAgentDetails.species_id}
                    </div>
                  </div>
                </div>

                {/* Vitals */}
                <div className="space-y-3 p-3 border-2 border-[#7fb069] bg-[#1a1a1a]" style={{boxShadow: 'inset 0 0 10px rgba(127, 176, 105, 0.1)'}}>
                  <h3 className="text-sm font-bold text-[#e8e8e8] uppercase tracking-wider">VITALS</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1 font-bold">
                        <span className="text-[#e8e8e8]">HEALTH</span>
                        <span className="font-mono text-[#d94d4d]">{selectedAgentDetails.energy}%</span>
                      </div>
                      <div className="w-full bg-[#2a2a2a] border border-[#c9b88d] h-2 overflow-hidden">
                        <div className="bg-[#d94d4d] h-full transition-all duration-300" style={{ width: `${selectedAgentDetails.energy}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1 font-bold">
                        <span className="text-[#e8e8e8]">HUNGER</span>
                        <span className="font-mono text-[#d4a574]">{selectedAgentDetails.hunger}%</span>
                      </div>
                      <div className="w-full bg-[#2a2a2a] border border-[#c9b88d] h-2 overflow-hidden">
                        <div className="bg-[#d4a574] h-full transition-all duration-300" style={{ width: `${selectedAgentDetails.hunger}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1 font-bold">
                        <span className="text-[#e8e8e8]">THIRST</span>
                        <span className="font-mono text-[#4fa3d1]">{selectedAgentDetails.thirst}%</span>
                      </div>
                      <div className="w-full bg-[#2a2a2a] border border-[#c9b88d] h-2 overflow-hidden">
                        <div className="bg-[#4fa3d1] h-full transition-all duration-300" style={{ width: `${selectedAgentDetails.thirst}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-2 p-3 border-2 border-[#a0714f] bg-[#1a1a1a]" style={{boxShadow: 'inset 0 0 10px rgba(160, 113, 79, 0.1)'}}>
                  <h3 className="text-sm font-bold text-[#e8e8e8] uppercase tracking-wider">GOALS</h3>
                  <div className="space-y-1">
                    {selectedAgentDetails.goals.map((g, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-2 bg-[#2a2a2a] border-2 border-[#7fb069] font-bold">
                        <span className="text-[#e8e8e8]">{g.name}</span>
                        <span className="font-mono text-[#7fb069]">P:{g.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action details */}
                <div className="space-y-2 p-3 border-2 border-[#c9b88d] bg-[#1a1a1a]">
                  <h3 className="text-sm font-bold text-[#e8e8e8] uppercase tracking-wider">ACTION</h3>
                  <div className="p-3 bg-[#2a2a2a] border-2 border-[#a0714f] text-sm flex items-center justify-between text-[#e8e8e8] font-bold">
                    <span className="font-mono">{selectedAgentDetails.current_action}</span>
                    <span className="px-3 py-1 bg-[#a0714f] text-[#1a1a1a] text-[11px] uppercase font-bold">RUN</span>
                  </div>
                </div>

                {/* Memories */}
                <div className="space-y-2 p-3 border-2 border-[#7fb069] bg-[#1a1a1a]">
                  <h3 className="text-sm font-bold text-[#e8e8e8] uppercase tracking-wider">MEMORY</h3>
                  {selectedAgentDetails.memories.length === 0 ? (
                    <div className="text-sm text-[#c9b88d] italic p-3 text-center bg-[#2a2a2a] border-2 border-dashed border-[#a0714f] font-bold">
                      SCANNING...
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                      {selectedAgentDetails.memories.map((m, idx) => (
                        <div key={idx} className="p-2 bg-[#2a2a2a] border-2 border-[#a0714f] text-sm flex justify-between font-bold">
                          <span className="text-[#e8e8e8] capitalize">{m.type}</span>
                          <span className="font-mono text-[#c9b88d]">({m.x},{m.y})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <BrainIcon className="w-12 h-12 text-[#7fb069]" />
                <p className="text-sm leading-relaxed text-[#c9b88d] font-bold" style={{fontFamily: "'VT323', monospace"}}>
                  CLICK CREATURE TO SCAN
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* 3D CANVAS VIEW */}
        <main className="flex-1 h-full relative bg-[#1a1a1a] border-2 border-[#a0714f]" style={{boxShadow: 'inset 0 0 20px rgba(160, 113, 79, 0.1)'}}>
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
          <div className="absolute top-4 right-4 pointer-events-none bg-[#2a2a2a] border-2 border-[#c9b88d] px-4 py-3 text-sm text-[#e8e8e8] flex items-center gap-2 font-bold" style={{boxShadow: 'inset 0 0 10px rgba(201, 184, 141, 0.1)'}}>
            <CompassIcon />
            <span>RIGHT-CLICK + DRAG | SCROLL</span>
          </div>

          {/* Aura Legend - Minecraft Colors */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-[#2a2a2a] border-3 border-[#7fb069] px-4 py-3 flex items-center gap-4 text-[11px] font-bold" style={{boxShadow: '0 0 20px rgba(127, 176, 105, 0.2), 4px 4px 0 rgba(90, 90, 90, 0.3)'}}>
            <span className="text-[#c9b88d] tracking-widest uppercase">AURA</span>
            {[
              { color: '#7fb069', label: 'FORAGE' },
              { color: '#4fa3d1', label: 'DRINK' },
              { color: '#d4a574', label: 'FLEE' },
              { color: '#d94d4d', label: 'HUNT' },
              { color: '#9b6b3b', label: 'MATE' },
              { color: '#8fbc8f', label: 'REST' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 border border-[#c9b88d]" style={{backgroundColor: color}} />
                <span className="text-[#e8e8e8]">{label}</span>
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT PANEL: Live Log Console */}
        <aside className="glass-panel flex flex-col overflow-hidden z-10 w-80" style={{border: '3px solid #a0714f', boxShadow: '0 0 20px rgba(160, 113, 79, 0.2), 6px 6px 0 rgba(90, 90, 90, 0.3)'}}>
          <div className="p-4 border-b-2 border-[#7fb069] bg-[#2a2a2a] flex items-center gap-3" style={{boxShadow: 'inset 0 0 10px rgba(127, 176, 105, 0.1)'}}>
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-current text-[#7fb069]">
              <rect x="2" y="2" width="12" height="12" fill="currentColor"/>
              <rect x="4" y="4" width="8" height="8" fill="#2a2a2a"/>
            </svg>
            <h2 className="font-bold tracking-widest text-[#e8e8e8] text-sm" style={{fontFamily: "'VT323', monospace"}}>ECOSYSTEM</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-sm space-y-2 bg-[#1a1a1a] font-bold">
            {logs.length === 0 ? (
              <div className="text-[#c9b88d] italic text-sm">SYSTEM READY...</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-1 border-b border-[#2a2a2a] last:border-0 ${
                    log.includes('died') 
                      ? 'text-[#d94d4d]' 
                      : log.includes('reproduced') 
                      ? 'text-[#7fb069]' 
                      : log.includes('hunted') 
                      ? 'text-[#d4a574]' 
                      : 'text-[#c9b88d]'
                  }`}
                >
                  <span className="text-[#a0714f] font-semibold mr-2">[{tick}]</span>
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
