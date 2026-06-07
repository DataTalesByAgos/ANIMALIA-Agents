import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from './store';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────
// Tile top-surface Y formula (matches world.py elevation values):
//   Tile box center = elevation/2 - 0.5
//   Tile box height = elevation
//   → top surface  = (elevation/2 - 0.5) + elevation/2 = elevation - 0.5
const tileTopY = (elevation: number) => Math.max(0, elevation - 0.5);

// Animal model sits so that the bottom of its legs touch the tile surface.
// Leg bottom = groupY - 0.35 - 0.15 (leg half-height) = groupY - 0.5
// So groupY = tileTopY + 0.5 → the animal group Y
const animalGroundY = (elevation: number) => tileTopY(elevation) + 0.5;

// ─── State Aura (floating effect above animal head) ───────────────────────────
const StateAura: React.FC<{ action: string }> = ({ action }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.MeshStandardMaterial>(null);

  // Map action text to color + shape
  let color     = '#94a3b8';
  let emissive  = '#334155';
  let scale     = 0.0;   // 0 = hidden
  let yOffset   = 0.95;

  if (action.includes('foraging') || action.includes('eating food')) {
    color = '#4ade80'; emissive = '#166534'; scale = 1.0;
  } else if (action.includes('water') || action.includes('eating water')) {
    color = '#38bdf8'; emissive = '#0c4a6e'; scale = 1.0;
  } else if (action.includes('flee') || action.includes('escaping')) {
    color = '#f97316'; emissive = '#7c2d12'; scale = 1.2;
  } else if (action.includes('hunting')) {
    color = '#ef4444'; emissive = '#7f1d1d'; scale = 1.1;
  } else if (action.includes('repro') || action.includes('mate')) {
    color = '#e879f9'; emissive = '#701a75'; scale = 1.0;
  } else if (action.includes('resting')) {
    color = '#a3e635'; emissive = '#3f6212'; scale = 0.8;
  }

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || scale === 0) return;
    const t = state.clock.elapsedTime;
    // Float up and down, pulse opacity
    meshRef.current.position.y = yOffset + Math.sin(t * 3.0) * 0.06;
    meshRef.current.scale.setScalar(scale * (0.85 + Math.sin(t * 4.0) * 0.15));
    matRef.current.emissiveIntensity = 0.6 + Math.sin(t * 5.0) * 0.3;
    matRef.current.opacity = scale > 0 ? 0.85 : 0;
  });

  if (scale === 0) return null;

  return (
    <mesh ref={meshRef} position={[0, yOffset, 0]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={emissive}
        emissiveIntensity={0.8}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
};

// ─── Selection Ring ────────────────────────────────────────────────────────────
const SelectionRing: React.FC = () => {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) {
      // Rotate ring continuously
      ringRef.current.rotation.z = state.clock.elapsedTime * 1.5;
      const pulse = 0.9 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      ringRef.current.scale.setScalar(pulse);
    }
  });
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
      <torusGeometry args={[0.55, 0.04, 8, 32]} />
      <meshStandardMaterial color="#38bdf8" emissive="#0369a1" emissiveIntensity={2.0} />
    </mesh>
  );
};

// ─── Leg mesh (ref-animated) ──────────────────────────────────────────────────
const AnimatedLeg: React.FC<{
  position: [number, number, number];
  color: string;
  phaseOffset: number;
  legRef: React.RefObject<THREE.Mesh | null>;
}> = ({ position, color, legRef }) => (
  <mesh ref={legRef} position={position} castShadow>
    <boxGeometry args={[0.1, 0.28, 0.1]} />
    <meshStandardMaterial color={color} roughness={0.7} />
  </mesh>
);

// ─── Single Animal ────────────────────────────────────────────────────────────
const AnimalAgent: React.FC<{
  agent: any;
  isSelected: boolean;
  groundY: number;
  onClick: () => void;
}> = ({ agent, isSelected, groundY, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Mesh>(null);

  // Four leg refs for walk cycle
  const legFL = useRef<THREE.Mesh>(null);
  const legFR = useRef<THREE.Mesh>(null);
  const legBL = useRef<THREE.Mesh>(null);
  const legBR = useRef<THREE.Mesh>(null);

  // Target position tracked via ref (avoids re-renders)
  const target = useRef({ x: agent.x, z: agent.y, y: groundY });
  const prev   = useRef({ x: agent.x, z: agent.y });
  const moving = useRef(false);

  useEffect(() => {
    target.current.x = agent.x;
    target.current.z = agent.y;
    target.current.y = groundY;
  }, [agent.x, agent.y, groundY]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // ── Position lerp ──────────────────────────────────────────────
    const lf = 1 - Math.pow(0.01, delta);  // smooth expo lerp
    const px = groupRef.current.position.x;
    const pz = groupRef.current.position.z;

    const dx = target.current.x - px;
    const dz = target.current.z - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    moving.current = dist > 0.02;

    groupRef.current.position.x += dx * lf;
    groupRef.current.position.z += dz * lf;

    // ── Ground Y lerp (terrain height) ─────────────────────────────
    groupRef.current.position.y += (target.current.y - groupRef.current.position.y) * lf;

    // ── Rotation: face movement direction ──────────────────────────
    if (moving.current) {
      const angle = Math.atan2(dx, dz);
      let rot = groupRef.current.rotation.y;
      let diff = angle - rot;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      groupRef.current.rotation.y += diff * 0.14;
    }

    // ── Body bounce (hop when moving) ──────────────────────────────
    if (bodyRef.current) {
      const walkSpeed = agent.species_id === 'predator' ? 8.0 : 6.0;
      if (moving.current) {
        // Hop: abs-sine gives double-peak bounce per step cycle
        const hop = Math.abs(Math.sin(t * walkSpeed)) * 0.07;
        bodyRef.current.position.y = hop;
      } else {
        // Idle: very gentle breath sway
        bodyRef.current.position.y = Math.sin(t * 1.8) * 0.015;
      }
    }

    // ── Leg walk cycle (alternate front/back pairs) ─────────────────
    const walkSpeed = agent.species_id === 'predator' ? 8.0 : 6.0;
    const legSwing = moving.current ? Math.sin(t * walkSpeed) * 0.14 : 0;

    if (legFL.current) legFL.current.rotation.x =  legSwing;
    if (legBR.current) legBR.current.rotation.x =  legSwing;
    if (legFR.current) legFR.current.rotation.x = -legSwing;
    if (legBL.current) legBL.current.rotation.x = -legSwing;
  });

  const color     = isSelected ? '#38bdf8' : agent.color;
  const bodyColor = isSelected ? '#7dd3fc' : agent.color;

  const legColor = agent.species_id === 'predator'
    ? (isSelected ? '#93c5fd' : '#b91c1c')
    : (isSelected ? '#6ee7b7' : '#047857');

  return (
    <group
      ref={groupRef}
      position={[agent.x, groundY, agent.y]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* ── Selection ring ── */}
      {isSelected && <SelectionRing />}

      {/* ── State aura (floating colored orb) ── */}
      <StateAura action={agent.current_action ?? ''} />

      {/* ── Body (ref for hop animation) ── */}
      <mesh ref={bodyRef} castShadow>
        <boxGeometry args={[0.48, 0.42, 0.68]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          emissive={isSelected ? '#0369a1' : '#000'}
          emissiveIntensity={isSelected ? 0.6 : 0}
        />
      </mesh>

      {/* ── Head ── */}
      <mesh position={[0, 0.26, 0.36]} castShadow>
        <boxGeometry args={[0.3, 0.28, 0.3]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} />
      </mesh>

      {/* ── Species-specific details ── */}
      {agent.species_id === 'herbivore' ? (
        // Deer: two antler stubs
        <group position={[0, 0.42, 0.36]}>
          <mesh position={[-0.1, 0.12, 0]}>
            <boxGeometry args={[0.05, 0.22, 0.05]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
          </mesh>
          <mesh position={[0.1, 0.12, 0]}>
            <boxGeometry args={[0.05, 0.22, 0.05]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
          </mesh>
          {/* Nose dot */}
          <mesh position={[0, -0.27, 0.16]}>
            <boxGeometry args={[0.08, 0.07, 0.07]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ) : (
        // Wolf: snout + pointed ears
        <group>
          <mesh position={[0, 0.21, 0.51]} castShadow>
            <boxGeometry args={[0.15, 0.13, 0.18]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-0.11, 0.43, 0.31]}>
            <boxGeometry args={[0.07, 0.14, 0.07]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.11, 0.43, 0.31]}>
            <boxGeometry args={[0.07, 0.14, 0.07]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.1, -0.45]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.28]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* ── 4 animated legs ── */}
      <AnimatedLeg position={[-0.17, -0.34, 0.22]}  color={legColor} phaseOffset={0}   legRef={legFL} />
      <AnimatedLeg position={[ 0.17, -0.34, 0.22]}  color={legColor} phaseOffset={Math.PI} legRef={legFR} />
      <AnimatedLeg position={[-0.17, -0.34, -0.22]} color={legColor} phaseOffset={Math.PI} legRef={legBL} />
      <AnimatedLeg position={[ 0.17, -0.34, -0.22]} color={legColor} phaseOffset={0}   legRef={legBR} />
    </group>
  );
};

// ─── Animated resource bubble (float up/down) ─────────────────────────────────
const ResourceBubble: React.FC<{ res: any; tileY: number }> = ({ res, tileY }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseY = tileY + 0.3;
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 2.2 + res.x) * 0.06;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.8;
    }
  });

  const isFood = res.type === 'food';
  // Fade out resources that are nearly depleted
  const opacity = Math.min(1, res.amount / 40);

  return (
    <mesh ref={meshRef} position={[res.x, baseY, res.y]} castShadow>
      <sphereGeometry args={[0.16, 8, 8]} />
      <meshStandardMaterial
        color={isFood ? '#86efac' : '#7dd3fc'}
        emissive={isFood ? '#166534' : '#0c4a6e'}
        emissiveIntensity={0.7}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

// ─── Main Scene ───────────────────────────────────────────────────────────────
export const SimulationCanvas: React.FC = () => {
  const { worldTiles, agents, resources, selectedAgentId, selectAgent } = useStore();

  // Build an O(1) lookup: "x,y" → tileTopY
  const elevationMap = useMemo(() => {
    const map = new Map<string, number>();
    worldTiles.forEach(tile => {
      map.set(`${Math.round(tile.x)},${Math.round(tile.y)}`, tile.elevation);
    });
    return map;
  }, [worldTiles]);

  const getGroundY = (ax: number, ay: number): number => {
    const key = `${Math.round(ax)},${Math.round(ay)}`;
    const elev = elevationMap.get(key) ?? 0.8;   // default to grassland if unknown
    return animalGroundY(elev);
  };

  const getResourceY = (rx: number, ry: number): number => {
    const key = `${Math.round(rx)},${Math.round(ry)}`;
    const elev = elevationMap.get(key) ?? 0.8;
    return tileTopY(elev);
  };

  // Group tiles by biome for batch rendering
  const biomeGroups = useMemo(() => {
    const map: Record<string, typeof worldTiles> = {
      water: [], grassland: [], forest: [], mountain: [],
    };
    worldTiles.forEach(tile => {
      if (map[tile.biome]) map[tile.biome].push(tile);
    });
    return map;
  }, [worldTiles]);

  const biomeColors: Record<string, string> = {
    water:     '#1e3a8a',
    grassland: '#14532d',
    forest:    '#052e16',
    mountain:  '#374151',
  };

  const biomeMetal: Record<string, number> = {
    water: 0.1, grassland: 0.0, forest: 0.0, mountain: 0.3,
  };

  return (
    <group position={[-15, 0, -15]}>

      {/* ── Biome floor tiles ── */}
      {Object.entries(biomeGroups).map(([biome, tiles]) => (
        <group key={biome}>
          {tiles.map(tile => (
            <mesh
              key={`${tile.x}-${tile.y}`}
              position={[tile.x, tile.elevation / 2 - 0.5, tile.y]}
              receiveShadow
            >
              <boxGeometry args={[0.96, tile.elevation || 0.1, 0.96]} />
              <meshStandardMaterial
                color={biomeColors[biome]}
                roughness={biome === 'mountain' ? 0.9 : 0.75}
                metalness={biomeMetal[biome] ?? 0}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Resource floating bubbles ── */}
      {resources.map((res, idx) => (
        <ResourceBubble
          key={`r-${idx}-${res.x}-${res.y}`}
          res={res}
          tileY={getResourceY(res.x, res.y)}
        />
      ))}

      {/* ── Animals ── */}
      {agents.map(agent => (
        <AnimalAgent
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          groundY={getGroundY(agent.x, agent.y)}
          onClick={() => selectAgent(agent.id)}
        />
      ))}

    </group>
  );
};
