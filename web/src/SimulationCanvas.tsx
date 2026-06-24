import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useTexture, useAnimations } from '@react-three/drei';
import { useStore } from './store';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils';

// ─── Nature decoration config per biome ───────────────────────────────────────
// Each entry: [fbxFile, textureFile, scale, yOffset]
type DecoEntry = { fbx: string; tex: string; scale: number; yOff: number };

const BIOME_DECO: Record<string, DecoEntry[]> = {
  forest: [
    { fbx: '/models/PineTree_1.fbx',    tex: '/textures/PineTree_Leaves.png',   scale: 0.008, yOff: 0 },
    { fbx: '/models/PineTree_2.fbx',    tex: '/textures/PineTree_Leaves.png',   scale: 0.008, yOff: 0 },
    { fbx: '/models/NormalTree_1.fbx',  tex: '/textures/NormalTree_Leaves.png', scale: 0.008, yOff: 0 },
    { fbx: '/models/NormalTree_3.fbx',  tex: '/textures/NormalTree_Leaves.png', scale: 0.008, yOff: 0 },
    { fbx: '/models/Bush.fbx',          tex: '/textures/Bush_Leaves.png',       scale: 0.009, yOff: 0 },
    { fbx: '/models/Bush_Large.fbx',    tex: '/textures/Bush_Leaves.png',       scale: 0.009, yOff: 0 },
  ],
  grassland: [
    { fbx: '/models/Grass_Large.fbx',       tex: '/textures/Grass.png',    scale: 0.009, yOff: 0 },
    { fbx: '/models/Grass_Small.fbx',       tex: '/textures/Grass.png',    scale: 0.009, yOff: 0 },
    { fbx: '/models/Flower_1_Clump.fbx',    tex: '/textures/Flowers.png',  scale: 0.009, yOff: 0 },
    { fbx: '/models/Flower_2_Clump.fbx',    tex: '/textures/Flowers.png',  scale: 0.009, yOff: 0 },
    { fbx: '/models/Bush_Small.fbx',        tex: '/textures/Bush_Leaves.png', scale: 0.009, yOff: 0 },
    { fbx: '/models/Bush_Small_Flowers.fbx',tex: '/textures/Bush_Leaves.png', scale: 0.009, yOff: 0 },
  ],
  mountain: [
    { fbx: '/models/Rock_1.fbx',      tex: '/textures/Rocks.png',  scale: 0.009, yOff: 0 },
    { fbx: '/models/Rock_2.fbx',      tex: '/textures/Rocks.png',  scale: 0.009, yOff: 0 },
    { fbx: '/models/Rock_3.fbx',      tex: '/textures/Rocks.png',  scale: 0.009, yOff: 0 },
    { fbx: '/models/DeadTree_1.fbx',  tex: '/textures/Rocks.png',  scale: 0.008, yOff: 0 },
    { fbx: '/models/DeadTree_3.fbx',  tex: '/textures/Rocks.png',  scale: 0.008, yOff: 0 },
  ],
};

// Simple deterministic pseudo-random from two integers
function seededRand(x: number, y: number, salt: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

// ─── Single nature decoration piece ──────────────────────────────────────────
const NaturePiece: React.FC<{
  entry: DecoEntry;
  position: [number, number, number];
  rotY: number;
}> = ({ entry, position, rotY }) => {
  const fbx = useFBX(entry.fbx);
  const tex = useTexture(entry.tex);

  const cloned = useMemo(() => {
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Preserve original material but inject the correct texture
        const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const mat = (orig as THREE.MeshStandardMaterial).clone();
        mat.map = tex;
        mat.needsUpdate = true;
        mesh.material = mat;
      }
    });
    return clone;
  }, [fbx, tex]);

  return (
    <primitive
      object={cloned}
      position={position}
      rotation={[0, rotY, 0]}
      scale={[entry.scale, entry.scale, entry.scale]}
    />
  );
};

// ─── Decoration layer for a biome group of tiles ──────────────────────────────
// Renders ~30% of tiles with one decoration piece each (deterministic)
const BiomeDecoration: React.FC<{
  biome: string;
  tiles: Array<{ x: number; y: number; elevation: number }>;
}> = ({ biome, tiles }) => {
  const entries = BIOME_DECO[biome];
  if (!entries) return null;

  const decorations = useMemo(() => {
    const result: Array<{ entry: DecoEntry; pos: [number, number, number]; rotY: number; key: string }> = [];
    for (const tile of tiles) {
      // ~8% chance per tile — keep density low
      if (seededRand(tile.x, tile.y, 0) > 0.08) continue;
      // Pick which decoration
      const idx = Math.floor(seededRand(tile.x, tile.y, 1) * entries.length);
      const entry = entries[idx];
      // Small random offset within tile so it doesn't always center
      const ox = (seededRand(tile.x, tile.y, 2) - 0.5) * 0.5;
      const oz = (seededRand(tile.x, tile.y, 3) - 0.5) * 0.5;
      const rotY = seededRand(tile.x, tile.y, 4) * Math.PI * 2;
      result.push({
        entry,
        pos: [tile.x + ox, GROUND_Y + entry.yOff, tile.y + oz],
        rotY,
        key: `${tile.x}-${tile.y}`,
      });
    }
    return result;
  }, [tiles, entries]);

  return (
    <>
      {decorations.map(({ entry, pos, rotY, key }) => (
        <Suspense key={key} fallback={null}>
          <NaturePiece entry={entry} position={pos} rotY={rotY} />
        </Suspense>
      ))}
    </>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────
// Flat ground — all animals and decorations sit at Y = 0
const GROUND_Y = 0;
const tileTopY = (_elevation: number) => GROUND_Y;
const animalGroundY = (_elevation: number) => GROUND_Y;

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

// Maps agent action strings to animation name patterns
function resolveAnimName(action: string, moving: boolean, names: string[]): string | undefined {
  const find = (patterns: RegExp[]) =>
    names.find(n => patterns.some(p => p.test(n)));

  if (action.includes('flee') || action.includes('escaping')) {
    return find([/run/i, /walk/i]) ?? names[0];
  }
  if (action.includes('hunting') || action.includes('attack')) {
    return find([/attack/i, /run/i, /walk/i]) ?? names[0];
  }
  if (action.includes('foraging') || action.includes('eating food') || action.includes('eating water')) {
    return find([/eat/i, /idle/i]) ?? names[0];
  }
  if (action.includes('resting') || action.includes('sleeping')) {
    return find([/idle/i, /sleep/i]) ?? names[0];
  }
  if (action.includes('repro') || action.includes('mate')) {
    return find([/idle/i]) ?? names[0];
  }
  // Default: walk if moving, idle otherwise
  if (moving) return find([/walk/i, /run/i]) ?? names[0];
  return find([/idle/i]) ?? names[0];
}

// ─── FBX Animal Model with animations ────────────────────────────────────────
const FBXModel: React.FC<{
  path: string;
  isSelected: boolean;
  moving: React.MutableRefObject<boolean>;
  currentAction: string;
}> = ({ path, isSelected, moving, currentAction }) => {
  const fbxSource = useFBX(path);
  const colormap = useTexture('/textures/colormap.png');

  // skeletonClone duplicates the scene graph and re-binds all SkinnedMesh bones.
  // We also clone each AnimationClip so the mixer targets the cloned skeleton tracks.
  const { cloned, clips } = useMemo(() => {
    const c = skeletonClone(fbxSource) as THREE.Group;
    const cl = fbxSource.animations.map(a => a.clone());
    return { cloned: c, clips: cl };
  }, [fbxSource]);

  // Apply colormap to cloned materials
  useEffect(() => {
    colormap.flipY = false;
    colormap.colorSpace = THREE.SRGBColorSpace;
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        // FBX uses MeshPhongMaterial — create a fresh MeshStandardMaterial instead of cloning
        const mat = new THREE.MeshStandardMaterial({
          map: colormap,
          color: new THREE.Color('#ffffff'),
          emissive: new THREE.Color(isSelected ? '#0369a1' : '#000000'),
          emissiveIntensity: isSelected ? 0.4 : 0,
          roughness: 0.8,
          metalness: 0.0,
        });
        mesh.material = mat;
      }
    });
  }, [cloned, colormap, isSelected]);

  // useAnimations from drei: pass cloned clips + cloned scene root ref
  const groupRef = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(clips, groupRef);

  const lastAnim = useRef<string | undefined>(undefined);

  // Start initial animation once actions are ready
  useEffect(() => {
    if (!names.length) return;
    const desired = resolveAnimName(currentAction, moving.current, names);
    const chosen = desired ?? names[0];
    if (chosen && actions[chosen]) {
      actions[chosen]!.reset().fadeIn(0.2).play();
      lastAnim.current = chosen;
    }
  }, [actions, names]);

  // Update animation every frame based on current action
  useFrame(() => {
    if (!names.length) return;
    const desired = resolveAnimName(currentAction, moving.current, names);
    if (desired && desired !== lastAnim.current && actions[desired]) {
      Object.values(actions).forEach(a => a?.fadeOut(0.3));
      actions[desired]!.reset().fadeIn(0.3).play();
      lastAnim.current = desired;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
};

// ─── Single Animal ────────────────────────────────────────────────────────────
const AnimalAgent: React.FC<{
  agent: any;
  isSelected: boolean;
  groundY: number;
  onClick: () => void;
}> = ({ agent, isSelected, groundY, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);

  const target = useRef({ x: agent.x, z: agent.y, y: groundY });
  const moving  = useRef(false);

  const getAgeGroup = (age: number) => {
    if (age < 50) return "young";
    if (age < 170) return "adult";
    return "old";
  };

  const getScaleFactor = (age: number) => {
    const ag = getAgeGroup(age);
    if (ag === "young") return 0.0045;
    if (ag === "adult") return 0.007;
    return 0.0065;
  };

  const scaleFactor = getScaleFactor(agent.age ?? 0);
  const ageGroup = getAgeGroup(agent.age ?? 0);

  // FBX models from Kenney are in centimeters, scale ~0.007 brings them to ~1 unit
  const modelPath = agent.species_id === 'predator'
    ? '/models/animal-fox.fbx'
    : '/models/animal-deer.fbx';

  useEffect(() => {
    target.current.x = agent.x;
    target.current.z = agent.y;
    target.current.y = groundY;
  }, [agent.x, agent.y, groundY]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const lf = 1 - Math.pow(0.01, delta);

    const px = groupRef.current.position.x;
    const pz = groupRef.current.position.z;
    const dx = target.current.x - px;
    const dz = target.current.z - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    moving.current = dist > 0.02;

    groupRef.current.position.x += dx * lf;
    groupRef.current.position.z += dz * lf;
    groupRef.current.position.y += (target.current.y - groupRef.current.position.y) * lf;

    // Face movement direction
    if (moving.current) {
      const angle = Math.atan2(dx, dz);
      let diff = angle - groupRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      groupRef.current.rotation.y += diff * 0.12;
    }

    // Subtle body bob on the model group
    if (modelRef.current) {
      const walkSpeed = agent.species_id === 'predator' ? 8.0 : 6.0;
      if (moving.current) {
        modelRef.current.position.y = Math.abs(Math.sin(t * walkSpeed)) * 0.05;
      } else {
        modelRef.current.position.y = Math.sin(t * 1.3) * 0.015;
      }
    }
  });

  const color = isSelected ? '#7dd3fc' : agent.color;

  return (
    <group
      ref={groupRef}
      position={[agent.x, groundY, agent.y]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* ── Selection ring ── */}
      {isSelected && <SelectionRing />}

      {/* ── FBX model container ── */}
      <Suspense fallback={
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={agent.species_id === 'predator' ? 'orange' : 'cyan'} />
        </mesh>
      }>
        <group ref={modelRef} scale={[scaleFactor, scaleFactor, scaleFactor]}>
          <FBXModel path={modelPath} isSelected={isSelected} moving={moving} currentAction={agent.current_action ?? ''} />
        </group>
      </Suspense>
    </group>
  );
};

// ─── Resource: food = Grass_Large FBX model, water = hidden ──────────────────
const FoodResource: React.FC<{ res: any; tileY: number }> = ({ res, tileY }) => {
  const fbx = useFBX('/models/Grass_Large.fbx');
  const tex = useTexture('/textures/Grass.png');
  const groupRef = useRef<THREE.Group>(null);

  const cloned = useMemo(() => {
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const mat = (orig as THREE.MeshStandardMaterial).clone();
        mat.map = tex;
        mat.transparent = true;
        mat.opacity = Math.max(0.4, Math.min(1, res.amount / 40));
        mat.needsUpdate = true;
        mesh.material = mat;
      }
    });
    return clone;
  }, [fbx, tex]);

  return (
    <group ref={groupRef} position={[res.x, tileY, res.y]}>
      <primitive object={cloned} scale={[0.007, 0.007, 0.007]} />
    </group>
  );
};

const ResourceBubble: React.FC<{ res: any; tileY: number }> = ({ res, tileY }) => {
  if (res.type === 'food') {
    return (
      <Suspense fallback={null}>
        <FoodResource res={res} tileY={tileY} />
      </Suspense>
    );
  }
  // Water resources are not rendered visually
  return null;
};

// ─── Flat biome floor (single plane per biome color zone) ────────────────────
// Instead of voxel boxes with varying elevation, we render flat 1x1 planes
// so animals always sit at Y=0 without any clipping issues.
const FlatBiomeTiles: React.FC<{ tiles: Array<any>; biome: string }> = ({ tiles, biome }) => {
  const biomeColors: Record<string, string> = {
    water:     '#1e3a8a',
    grassland: '#3a7d44',
    forest:    '#1a4a2e',
    mountain:  '#6b7280',
  };
  const color = biomeColors[biome] ?? '#3a7d44';
  return (
    <>
      {tiles.map(tile => (
        <mesh key={`${tile.x}-${tile.y}`} position={[tile.x, -0.05, tile.y]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.98, 0.98]} />
          <meshStandardMaterial color={color} roughness={biome === 'mountain' ? 0.9 : 0.75} metalness={biome === 'mountain' ? 0.3 : 0} />
        </mesh>
      ))}
    </>
  );
};

const GrassFloorTiles: React.FC<{ tiles: Array<any> }> = ({ tiles }) => {
  const tex = useTexture('/textures/Grass.png');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <>
      {tiles.map(tile => (
        <mesh key={`${tile.x}-${tile.y}`} position={[tile.x, -0.05, tile.y]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.98, 0.98]} />
          <meshStandardMaterial map={tex} roughness={0.85} />
        </mesh>
      ))}
    </>
  );
};

// ─── Main Scene ───────────────────────────────────────────────────────────────
export const SimulationCanvas: React.FC = () => {
  const { worldTiles, agents, resources, selectedAgentId, selectAgent } = useStore();

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



  return (
    <group position={[-15, 0, -15]}>

      {/* ── Biome floor tiles (flat planes, no elevation) ── */}
      {Object.entries(biomeGroups).map(([biome, tiles]) => {
        if (biome === 'grassland' || biome === 'forest') {
          return (
            <Suspense key={biome} fallback={<FlatBiomeTiles tiles={tiles} biome={biome} />}>
              <GrassFloorTiles tiles={tiles} />
            </Suspense>
          );
        }
        return <FlatBiomeTiles key={biome} tiles={tiles} biome={biome} />;
      })}

      {/* ── Nature decoration (trees, rocks, bushes) ── */}
      {Object.entries(biomeGroups).map(([biome, tiles]) => (
        <BiomeDecoration key={`deco-${biome}`} biome={biome} tiles={tiles} />
      ))}

      {/* ── Resource floating bubbles ── */}
      {resources.map((res, idx) => (
        <ResourceBubble
          key={`r-${idx}-${res.x}-${res.y}`}
          res={res}
          tileY={GROUND_Y}
        />
      ))}

      {/* ── Animals ── */}
      {agents.length === 0 && (
        <mesh position={[15, 1, 15]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      )}
      {agents.map(agent => (
        <AnimalAgent
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          groundY={GROUND_Y}
          onClick={() => selectAgent(agent.id)}
        />
      ))}

    </group>
  );
};
