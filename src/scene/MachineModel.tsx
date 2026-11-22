import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { ALPHABET, ROTORS, index, mod } from '../engine/enigma';
import type { ComponentId, PlugPair } from '../engine/enigma';
import type { MachineController } from '../hooks/useMachine';
import { getWoodTexture, labelTexture } from './materials';
import { keyPosition, lampPosition, socketPosition, partPose, ROTOR_XS as rotorXs } from './layout';
import type { AssemblyView, Vec } from './layout';
import { stagePath } from './signalGeometry';

const TAU = Math.PI * 2;
const BRASS = '#a99362';
const STEEL = '#696d63';

function Assembly({
  id,
  view,
  children,
}: {
  id: ComponentId;
  view: AssemblyView;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const { center, offset, angle } = partPose(id, view);
  useFrame((_, dt) => {
    if (!ref.current) return;
    for (let i = 0; i < 3; i++)
      ref.current.position.setComponent(
        i,
        THREE.MathUtils.damp(ref.current.position.getComponent(i), center[i] + offset[i], 6, dt),
      );
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, angle, 8, dt);
  });
  return (
    <group ref={ref} position={center}>
      <group position={[-center[0], -center[1], -center[2]]}>{children}</group>
    </group>
  );
}
function useHover() {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);
  return {
    hovered,
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
    },
    onPointerOut: () => setHovered(false),
  };
}
function Label({
  text,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [0.2, 0.2],
  color,
  background,
  serif = false,
}: {
  text: string;
  position?: Vec;
  rotation?: Vec;
  size?: [number, number];
  color?: string;
  background?: string;
  serif?: boolean;
}) {
  const aspect = size[0] / size[1];
  const texture = useMemo(
    () => labelTexture(text, color, background, serif, aspect),
    [text, color, background, serif, aspect],
  );
  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
function Box({
  position,
  size,
  color = '#20251f',
  metalness = 0.5,
  roughness = 0.6,
  radius = 0.035,
  onClick,
  opacity = 1,
  wood = false,
}: {
  position: Vec;
  size: Vec;
  color?: string;
  metalness?: number;
  roughness?: number;
  radius?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  opacity?: number;
  wood?: boolean;
}) {
  return (
    <RoundedBox
      args={size}
      position={position}
      radius={radius}
      smoothness={2}
      castShadow
      receiveShadow
      onClick={onClick}
    >
      <meshStandardMaterial
        color={color}
        map={wood ? getWoodTexture() : undefined}
        metalness={wood ? 0 : metalness}
        roughness={roughness}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity > 0.5}
      />
    </RoundedBox>
  );
}
function Wire({
  points,
  color = '#33342c',
  radius = 0.025,
  emissive = false,
  opacity = 1,
}: {
  points: Vec[];
  color?: string;
  radius?: number;
  emissive?: boolean;
  opacity?: number;
}) {
  const coordinates = points.flat().join(',');
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        28,
        radius,
        6,
        false,
      ),
    [coordinates, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow={!emissive}>
      <meshStandardMaterial
        color={color}
        emissive={emissive ? color : '#000'}
        emissiveIntensity={emissive ? 2 : 0}
        roughness={0.8}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
function Screw({ position, rotation = [0, 0, 0] }: { position: Vec; rotation?: Vec }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.025, 10]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <boxGeometry args={[0.065, 0.012, 0.008]} />
        <meshStandardMaterial color="#252822" />
      </mesh>
    </group>
  );
}

function Key({ c, active, onPress }: { c: string; active: boolean; onPress: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const hover = useHover();
  useFrame((_, dt) => {
    if (ref.current)
      ref.current.position.y = THREE.MathUtils.damp(
        ref.current.position.y,
        active ? -0.13 : 0,
        26,
        dt,
      );
  });
  return (
    <group
      position={keyPosition(c)}
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <group ref={ref}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <cylinderGeometry args={[0.048, 0.055, 0.31, 10]} />
          <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.215, 0.23, 0.075, 24]} />
          <meshStandardMaterial
            color={hover.hovered ? '#dcc598' : '#9b9c8d'}
            metalness={0.75}
            roughness={0.38}
          />
        </mesh>
        <mesh position={[0, 0.044, 0]}>
          <cylinderGeometry args={[0.183, 0.183, 0.025, 24]} />
          <meshStandardMaterial
            color={active ? '#655e40' : '#222922'}
            roughness={0.55}
            metalness={0.15}
          />
        </mesh>
        <Label
          text={c}
          position={[0, 0.059, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          size={[0.225, 0.225]}
          color="#f0edda"
          serif
        />
      </group>
    </group>
  );
}
function Lamp({ c, active, onInspect }: { c: string; active: boolean; onInspect: () => void }) {
  const hover = useHover();
  return (
    <group
      position={lampPosition(c)}
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        onInspect();
      }}
    >
      <mesh>
        <cylinderGeometry args={[0.195, 0.2, 0.025, 24]} />
        <meshStandardMaterial
          color={hover.hovered ? '#c9b278' : '#5d6151'}
          metalness={0.65}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.017, 0]}>
        <cylinderGeometry args={[0.167, 0.167, 0.02, 24]} />
        <meshStandardMaterial
          color={active ? '#e4ca85' : '#aaa888'}
          emissive={active ? '#f6bd43' : '#000'}
          emissiveIntensity={active ? 2 : 0}
          roughness={0.75}
        />
      </mesh>
      <Label
        text={c}
        position={[0, 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[0.21, 0.21]}
        color={active ? '#2c2717' : '#272f27'}
        serif
      />
      {active && (
        <pointLight color="#ffd171" intensity={0.7} distance={1.1} position={[0, 0.2, 0]} />
      )}
    </group>
  );
}

function Lid({ open, inspect }: { open: boolean; inspect: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const hover = useHover();
  useFrame((_, dt) => {
    if (ref.current)
      ref.current.rotation.x = THREE.MathUtils.damp(
        ref.current.rotation.x,
        open ? -1.85 : 0,
        5,
        dt,
      );
  });
  return (
    <group
      position={[0, 0.99, -2.9]}
      ref={ref}
      rotation={[-1.85, 0, 0]}
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        inspect();
      }}
    >
      <Box
        position={[0, 0, 2.9]}
        size={[6.62, 0.18, 5.85]}
        color={hover.hovered ? '#dfc69b' : '#c6af8a'}
        wood
        roughness={0.72}
      />
      <Box
        position={[0, -0.1, 2.9]}
        size={[6.12, 0.04, 5.35]}
        color="#c4a67b"
        wood
        roughness={0.8}
      />
      <Box position={[0, -0.15, 4.6]} size={[4.98, 0.03, 1.15]} color="#1c211a" roughness={1} />
      <Label
        text="ENIGMA"
        position={[0, -0.174, 4.6]}
        rotation={[Math.PI / 2, 0, 0]}
        size={[2.3, 0.57]}
        color="#b1ad92"
        serif
      />
      <Box position={[0, -0.16, 2.15]} size={[4.1, 0.025, 2.35]} color="#bba773" roughness={1} />
      {[
        'GEBRAUCHSANWEISUNG',
        'Vor Gebrauch Walzen einstellen.',
        'Ringstellung und Steckerverbindungen',
        'nach dem Tagesschluessel pruefen.',
        'Taste ganz niederdruecken.',
        'Leuchtzeichen sorgfaeltig ablesen.',
      ].map((t, i) => (
        <Label
          key={t}
          text={t}
          position={[0, -0.18, 2.97 - i * 0.29]}
          rotation={[Math.PI / 2, 0, 0]}
          size={[3.75, 0.22]}
          color="#4e4833"
        />
      ))}
      {[-2.4, 2.4].map((x) => (
        <group key={x}>
          <Box position={[x, -0.22, 2.3]} size={[0.36, 0.17, 0.85]} color="#1a201a" />
          <Wire
            points={[
              [x, -0.34, 2.1],
              [x * 0.95, -0.38, 0.8],
              [x * 0.75, -0.3, 0.57],
              [x * 0.75, -0.3, 3.8],
              [x * 0.8, -0.28, 3.9],
            ]}
            radius={0.038}
            color="#20261f"
          />
          <Box position={[x * 0.75, -0.22, 3.75]} size={[0.33, 0.15, 0.45]} color="#1d231c" />
        </group>
      ))}
    </group>
  );
}

function Thumbwheel({
  i,
  machine,
  inspect,
}: {
  i: number;
  machine: MachineController;
  inspect: () => void;
}) {
  const wheel = useRef<THREE.Group>(null);
  const target = useRef((-machine.positions[i] * TAU) / 26);
  const previous = useRef(machine.positions[i]);
  const hover = useHover();
  useEffect(() => {
    target.current -= (mod(machine.positions[i] - previous.current) * TAU) / 26;
    previous.current = machine.positions[i];
  }, [machine.positions, i]);
  useFrame((_, dt) => {
    if (wheel.current)
      wheel.current.rotation.x = THREE.MathUtils.damp(
        wheel.current.rotation.x,
        target.current,
        35,
        dt,
      );
  });
  return (
    <group
      position={[rotorXs[i] + 0.25, 1.105, -1.97]}
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        machine.adjustRotor(i);
        inspect();
      }}
    >
      <group ref={wheel} rotation={[(-machine.positions[i] * TAU) / 26, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.14, 52]} />
          <meshStandardMaterial
            color={hover.hovered ? '#d0bc88' : '#8a8e77'}
            roughness={0.55}
            metalness={0.7}
          />
        </mesh>
        {Array.from({ length: 52 }, (_, n) => {
          const a = (n * TAU) / 52;
          return (
            <mesh
              key={n}
              position={[0, Math.cos(a) * 0.348, Math.sin(a) * 0.348]}
              rotation={[a, 0, 0]}
            >
              <boxGeometry args={[0.145, 0.028, 0.023]} />
              <meshStandardMaterial color="#525c48" metalness={0.7} roughness={0.6} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Rotor({
  i,
  machine,
  exploded,
  internal,
  selected,
  inspect,
}: {
  i: number;
  machine: MachineController;
  exploded: boolean;
  internal: boolean;
  selected: boolean;
  inspect: () => void;
}) {
  const spin = useRef<THREE.Group>(null);
  const target = useRef((-machine.positions[i] * TAU) / 26);
  const last = useRef(machine.positions[i]);
  const hover = useHover();
  const rotor = machine.config.rotors[i];
  useEffect(() => {
    target.current -= (mod(machine.positions[i] - last.current) * TAU) / 26;
    last.current = machine.positions[i];
  }, [i, machine.positions]);
  useFrame((_, dt) => {
    if (spin.current)
      spin.current.rotation.x = THREE.MathUtils.damp(
        spin.current.rotation.x,
        target.current,
        35,
        dt,
      );
  });
  const activeStage = machine.result?.stages[machine.stage];
  const active = activeStage?.component === `rotor-${i}`;
  return (
    <group
      position={[rotorXs[i], 0.8, -1.97]}
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        inspect();
      }}
    >
      <group ref={spin} rotation={[(-machine.positions[i] * TAU) / 26, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.64, 0.64, 0.62, 52]} />
          <meshStandardMaterial
            color={active || hover.hovered || selected ? '#76664b' : '#3d4033'}
            metalness={0.45}
            roughness={0.55}
            transparent={internal}
            opacity={internal ? 0.18 : 1}
            depthWrite={!internal}
          />
        </mesh>
        {[-0.32, 0.32].map((x) => (
          <group key={x}>
            <mesh position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.63, 0.034, 6, 52]} />
              <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.45} />
            </mesh>
            {Array.from({ length: 26 }, (_, n) => {
              const a = (n * TAU) / 26;
              return (
                <mesh
                  key={n}
                  position={[x, Math.cos(a) * 0.54, Math.sin(a) * 0.54]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.029, 0.029, 0.035, 6]} />
                  <meshStandardMaterial color="#c2ae76" metalness={0.8} roughness={0.4} />
                </mesh>
              );
            })}
          </group>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.653, 0.653, 0.26, 52, 1, true]} />
          <meshStandardMaterial color="#d0c8a5" roughness={0.72} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 26 }, (_, n) => {
          const a = (n * TAU) / 26;
          return (
            <Label
              key={n}
              text={String(n + 1).padStart(2, '0')}
              position={[0, Math.cos(a) * 0.659, Math.sin(a) * 0.659]}
              rotation={[a - Math.PI / 2, 0, 0]}
              size={[0.23, 0.13]}
              color="#32382b"
            />
          );
        })}
        {Array.from({ length: 52 }, (_, n) => {
          const a = (n * TAU) / 52;
          return (
            <mesh
              key={n}
              position={[0.21, Math.cos(a) * 0.67, Math.sin(a) * 0.67]}
              rotation={[a, 0, 0]}
            >
              <boxGeometry args={[0.12, 0.035, 0.037]} />
              <meshStandardMaterial color="#8c8c73" metalness={0.7} roughness={0.6} />
            </mesh>
          );
        })}
        <group rotation={[(machine.config.rings[i] * TAU) / 26, 0, 0]}>
          {internal &&
            [...ALPHABET].map((_, n) => {
              const out = index(ROTORS[rotor].wiring[n]);
              const a = (n * TAU) / 26,
                b = (out * TAU) / 26;
              return (
                <Wire
                  key={n}
                  points={[
                    [0.3, Math.cos(a) * 0.54, Math.sin(a) * 0.54],
                    [0.04, Math.cos(a) * 0.3, Math.sin(a) * 0.3],
                    [-0.04, Math.cos(b) * 0.3, Math.sin(b) * 0.3],
                    [-0.3, Math.cos(b) * 0.54, Math.sin(b) * 0.54],
                  ]}
                  radius={0.007}
                  color={n % 3 === 0 ? '#a58d54' : '#536456'}
                  opacity={0.65}
                />
              );
            })}
        </group>
      </group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.82, 12]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
      </mesh>
      {exploded && (
        <Label text={`ROTOR ${rotor}`} position={[0, 0.88, 0]} size={[0.85, 0.2]} color="#e0cc9f" />
      )}
    </group>
  );
}

function Plugboard({
  machine,
  selectedSocket,
  onSocket,
}: {
  machine: MachineController;
  selectedSocket: string | null;
  onSocket: (c: string) => void;
}) {
  const [cables, setCables] = useState<{ pair: PlugPair; exiting: boolean }[]>(() =>
    machine.config.plugs.map((pair) => ({ pair, exiting: false })),
  );
  useEffect(() => {
    const present = new Set(machine.config.plugs.map((pair) => pair.join('')));
    setCables((previous) => [
      ...machine.config.plugs.map((pair) => ({ pair, exiting: false })),
      ...previous
        .filter((cable) => !present.has(cable.pair.join('')))
        .map((cable) => ({ ...cable, exiting: true })),
    ]);
    const timer = setTimeout(
      () => setCables((previous) => previous.filter((cable) => !cable.exiting)),
      220,
    );
    return () => clearTimeout(timer);
  }, [machine.config.plugs]);
  return (
    <group>
      <Box position={[0, 0.46, 2.6]} size={[5.85, 0.72, 0.08]} color="#151e18" roughness={0.65} />
      {[...ALPHABET].map((c) => {
        const plugged = machine.config.plugs.some((p) => p.includes(c));
        const chosen = selectedSocket === c;
        return (
          <group
            key={c}
            position={socketPosition(c)}
            onClick={(e) => {
              e.stopPropagation();
              onSocket(c);
            }}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.089, 0.089, 0.035, 16]} />
              <meshStandardMaterial
                color={chosen ? '#f1c86e' : plugged ? '#b09a66' : '#8b907b'}
                metalness={0.7}
                roughness={0.5}
                emissive={chosen ? '#ac7024' : '#000'}
                emissiveIntensity={0.5}
              />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <circleGeometry args={[0.054, 14]} />
              <meshBasicMaterial color="#080f0c" />
            </mesh>
            <Label text={c} position={[0, 0.09, 0.012]} size={[0.13, 0.12]} color="#d2d0b7" />
          </group>
        );
      })}
      {cables.map(({ pair, exiting }, i) => (
        <PatchCable
          key={pair.join('')}
          pair={pair}
          i={i}
          exiting={exiting}
          onRemove={() => {
            if (!exiting) onSocket(pair[0]);
          }}
        />
      ))}
    </group>
  );
}
function PatchCable({
  pair,
  i,
  exiting,
  onRemove,
}: {
  pair: PlugPair;
  i: number;
  exiting: boolean;
  onRemove: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const a = socketPosition(pair[0]),
    b = socketPosition(pair[1]);
  useFrame((_, dt) => {
    if (ref.current)
      ref.current.scale.z = THREE.MathUtils.damp(ref.current.scale.z, exiting ? 0.01 : 1, 20, dt);
  });
  return (
    <group
      ref={ref}
      position={[0, 0, 2.65]}
      scale={[1, 1, 0.01]}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
    >
      <Wire
        points={[
          [a[0], a[1], 0],
          [a[0], a[1] - 0.05, 0.32],
          [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 0.3 - i * 0.012, 0.45 + i * 0.025],
          [b[0], b[1] - 0.05, 0.32],
          [b[0], b[1], 0],
        ]}
        color={i % 2 ? '#3b3b2c' : '#262b23'}
        radius={0.045}
      />
      {[a, b].map((p, j) => (
        <mesh key={j} position={[p[0], p[1], 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.082, 0.065, 0.2, 12]} />
          <meshStandardMaterial color="#272d23" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ElectricalSignal({ machine, view }: { machine: MachineController; view: AssemblyView }) {
  const pulse = useRef<THREE.Mesh>(null);
  const stage = machine.result?.stages[machine.stage];
  const points = useMemo(
    () => (stage ? stagePath(stage, machine.config, view) : []),
    [stage, machine.config, view],
  );
  const curve = useMemo(
    () =>
      points.length > 1
        ? new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
        : null,
    [points],
  );
  const completedPaths = useMemo(
    () =>
      machine.result?.stages.slice(0, machine.stage).map((s) => ({
        points: stagePath(s, machine.config, view),
        reverse: s.direction === 'reverse' || s.direction === 'output',
      })) ?? [],
    [machine.result, machine.stage, machine.config, view],
  );
  const progress = useRef(0);
  useEffect(() => {
    progress.current = 0;
  }, [stage]);
  useFrame((_, dt) => {
    if (!pulse.current || !curve) return;
    if (machine.playing)
      progress.current = Math.min(
        1,
        progress.current + dt / (machine.slow ? 0.38 : machine.busy ? 0.032 : 0.105),
      );
    pulse.current.position.copy(curve.getPointAt(machine.playing ? progress.current : 0.5));
  });
  if (!stage || !curve) return null;
  const color =
    stage.direction === 'reverse' || stage.direction === 'output' ? '#8ac5b7' : '#edba59';
  return (
    <group>
      {completedPaths.map((path, i) => (
        <Wire
          key={i}
          points={path.points}
          radius={0.009}
          color={path.reverse ? '#609b7f' : '#a88d4f'}
          opacity={0.38}
        />
      ))}
      <Wire points={points} radius={0.019} color={color} emissive />
      <mesh ref={pulse}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshBasicMaterial color="#fff7d4" toneMapped={false} />
      </mesh>
      {[points[0], points[points.length - 1]].map((p, i) => (
        <Billboard key={i} position={[p[0], p[1] + 0.19, p[2]]}>
          <Label
            text={i ? stage.output : stage.input}
            size={[0.24, 0.24]}
            color={color}
            background="#172318"
          />
        </Billboard>
      ))}
    </group>
  );
}

export interface ModelProps {
  machine: MachineController;
  lidOpen: boolean;
  setLidOpen: (open: boolean) => void;
  internal: boolean;
  exploded: boolean;
  selected: ComponentId | null;
  inspectAngle: number;
  onInspect: (id: ComponentId) => void;
  selectedSocket: string | null;
  onSocket: (c: string) => void;
  setInternal: (v: boolean) => void;
}

export function MachineModel({
  machine,
  lidOpen,
  setLidOpen,
  internal,
  exploded,
  selected,
  inspectAngle,
  onInspect,
  selectedSocket,
  onSocket,
  setInternal,
}: ModelProps) {
  const reveal = internal || exploded;
  const assemblyView = useMemo(
    () => ({ exploded, selected, inspectAngle }),
    [exploded, selected, inspectAngle],
  );
  const inspect = (id: ComponentId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onInspect(id);
  };
  return (
    <group>
      <Assembly id="case" view={assemblyView}>
        <group onClick={inspect('case')}>
          <Box
            position={[0, 0.04, 0]}
            size={[6.62, 0.25, 5.98]}
            wood
            color="#c5a880"
            opacity={reveal ? 0.23 : 1}
          />
          {[-3.18, 3.18].map((x) => (
            <Box
              key={x}
              position={[x, 0.53, 0]}
              size={[0.27, 0.85, 5.95]}
              wood
              color="#bea078"
              opacity={reveal ? 0.13 : 1}
            />
          ))}
          <Box
            position={[0, 0.52, -2.85]}
            size={[6.2, 0.85, 0.27]}
            wood
            color="#a38d6c"
            opacity={reveal ? 0.13 : 1}
          />
          <Box
            position={[0, 0.25, 2.87]}
            size={[6.25, 0.46, 0.27]}
            wood
            color="#c1a17a"
            opacity={reveal ? 0.13 : 1}
          />
          {[-3.05, 3.05].flatMap((x) =>
            [-2.75, 2.75].map((z) => (
              <Box
                key={`${x}-${z}`}
                position={[x, 0.11, z]}
                size={[0.24, 0.4, 0.24]}
                color="#36382b"
                radius={0.025}
              />
            )),
          )}
        </group>
      </Assembly>
      <Assembly id="lid" view={assemblyView}>
        <Lid
          open={lidOpen}
          inspect={() => {
            setLidOpen(!lidOpen);
            onInspect('lid');
          }}
        />
      </Assembly>
      {[-2.2, 2.2].map((x) => (
        <Box
          key={x}
          position={[x, 1.01, -2.83]}
          size={[0.67, 0.12, 0.24]}
          color="#87754d"
          roughness={0.48}
        />
      ))}
      <group visible={lidOpen}>
        <Box
          position={[0, 0.61, 0.05]}
          size={[6.01, 0.44, 4.98]}
          color="#171f18"
          opacity={reveal ? 0.19 : 1}
        />
        <Assembly id="keyboard" view={assemblyView}>
          <Box
            position={[0, 0.83, 1.43]}
            size={[5.82, 0.1, 2.03]}
            color="#232b23"
            onClick={inspect('keyboard')}
            opacity={reveal ? 0.25 : 1}
          />
        </Assembly>
        <Assembly id="lampboard" view={assemblyView}>
          <Box
            position={[0, 1.12, -0.56]}
            size={[5.82, 0.075, 1.6]}
            color="#262e24"
            onClick={inspect('lampboard')}
            opacity={reveal ? 0.3 : 1}
          />
        </Assembly>
        <Assembly id="cover" view={assemblyView}>
          <group
            visible={!internal || exploded}
            onClick={(e) => {
              e.stopPropagation();
              onInspect('cover');
              setInternal(true);
            }}
          >
            <Box
              position={[0, 1.33, -2.13]}
              size={[5.82, 0.12, 1.35]}
              color="#2b3228"
              opacity={exploded ? 0.45 : 1}
            />
            {rotorXs.map((x, i) => (
              <group key={x}>
                <Box
                  position={[x - 0.12, 1.405, -1.91]}
                  size={[0.39, 0.018, 0.55]}
                  color="#898b72"
                />
                <Box
                  position={[x - 0.12, 1.418, -1.91]}
                  size={[0.27, 0.015, 0.37]}
                  color="#dfd6b7"
                  metalness={0.05}
                />
                <Label
                  text={String(machine.positions[i] + 1).padStart(2, '0')}
                  position={[x - 0.12, 1.43, -1.91]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  size={[0.24, 0.29]}
                  color="#30372c"
                />
                <Label
                  text={machine.config.rotors[i]}
                  position={[x - 0.12, 1.405, -2.5]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  size={[0.25, 0.13]}
                  color="#b3b29a"
                />
                <Thumbwheel
                  i={i}
                  machine={machine}
                  inspect={() => onInspect(`rotor-${i}` as ComponentId)}
                />
              </group>
            ))}
            <Label
              text="ENIGMA I"
              position={[-2.15, 1.399, -2.34]}
              rotation={[-Math.PI / 2, 0, 0]}
              size={[0.98, 0.24]}
              color="#b7b59e"
              serif
            />
            <Label
              text="Nr. A 1938"
              position={[-2.15, 1.399, -2.06]}
              rotation={[-Math.PI / 2, 0, 0]}
              size={[0.83, 0.17]}
              color="#a6a88e"
            />
          </group>
        </Assembly>
        {reveal && (
          <>
            <mesh position={[0, 0.8, -1.97]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 5.3, 12]} />
              <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <Assembly key={i} id={`rotor-${i}` as ComponentId} view={assemblyView}>
                <Rotor
                  i={i}
                  machine={machine}
                  exploded={exploded}
                  internal={internal}
                  selected={selected === `rotor-${i}`}
                  inspect={() => onInspect(`rotor-${i}` as ComponentId)}
                />
              </Assembly>
            ))}
            {[-1, 1].map((side) => (
              <Assembly key={side} id={side < 0 ? 'reflector' : 'etw'} view={assemblyView}>
                <group
                  position={[side * 1.86, 0.8, -1.97]}
                  onClick={inspect(side < 0 ? 'reflector' : 'etw')}
                >
                  <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.63, 0.63, 0.23, 40]} />
                    <meshStandardMaterial
                      color={side < 0 ? '#95815a' : '#4e5d47'}
                      metalness={0.6}
                      roughness={0.5}
                    />
                  </mesh>
                  <Label
                    text={side < 0 ? `UKW ${machine.config.reflector}` : 'ETW'}
                    position={[0, 0.78, 0]}
                    size={[0.65, 0.2]}
                    color="#cfc3a2"
                  />
                  {Array.from({ length: 26 }, (_, n) => (
                    <mesh
                      key={n}
                      position={[
                        -side * 0.13,
                        Math.cos((n * TAU) / 26) * 0.54,
                        Math.sin((n * TAU) / 26) * 0.54,
                      ]}
                    >
                      <sphereGeometry args={[0.027, 6, 6]} />
                      <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
                    </mesh>
                  ))}
                </group>
              </Assembly>
            ))}
            {[-2.5, -2.2, -1.9, 1.9, 2.2, 2.5].map((x, i) => (
              <Wire
                key={x}
                points={[
                  [x, 0.75, 1.8],
                  [x, 0.6, 0.8],
                  [x, 0.65, -1.3],
                  [1.85, 1.1, -1.97 + i * 0.06],
                ]}
                radius={0.013}
                color={i % 2 ? '#756745' : '#404f40'}
              />
            ))}
          </>
        )}
        <Assembly id="keyboard" view={assemblyView}>
          {[...ALPHABET].map((c) => (
            <Key
              key={c}
              c={c}
              active={machine.pressed === c}
              onPress={() => {
                machine.press(c);
              }}
            />
          ))}
        </Assembly>
        <Assembly id="lampboard" view={assemblyView}>
          {[...ALPHABET].map((c) => (
            <Lamp
              key={c}
              c={c}
              active={machine.result?.output === c && machine.stage === 12}
              onInspect={() => onInspect('lampboard')}
            />
          ))}
        </Assembly>
        <Assembly id="plugboard" view={assemblyView}>
          <Plugboard machine={machine} selectedSocket={selectedSocket} onSocket={onSocket} />
        </Assembly>
        <Box
          position={[0, 0.835, 2.35]}
          size={[1.55, 0.025, 0.3]}
          color="#9c9d80"
          roughness={0.7}
        />
        <Label
          text="CHIFFRIERMASCHINE"
          position={[0, 0.852, 2.35]}
          rotation={[-Math.PI / 2, 0, 0]}
          size={[1.38, 0.17]}
          color="#3d4435"
        />
        {[-2.77, 2.77].flatMap((x) =>
          [-2.58, -1.44, 0.3, 2.35].map((z) => (
            <Screw
              key={`${x}-${z}`}
              position={[x, z < -1.4 ? 1.4 : 1.11, z]}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          )),
        )}
        {[-2.72, 2.72].map((x) => (
          <group key={x} onClick={inspect('keyboard')}>
            <mesh position={[x, 1.4, -1.03]}>
              <cylinderGeometry args={[0.085, 0.11, 0.19, 14]} />
              <meshStandardMaterial color="#8e7951" roughness={0.5} metalness={0.7} />
            </mesh>
          </group>
        ))}
        <ElectricalSignal machine={machine} view={assemblyView} />
      </group>
      <Box position={[3.37, 0.53, 0.3]} size={[0.12, 0.18, 1.35]} color="#262b22" />
      <Box position={[3.43, 0.57, 0.3]} size={[0.11, 0.11, 0.95]} color="#777a64" metalness={0.8} />
      <Box position={[0, 0.44, 3.035]} size={[0.48, 0.21, 0.06]} color="#91805b" roughness={0.5} />
    </group>
  );
}
