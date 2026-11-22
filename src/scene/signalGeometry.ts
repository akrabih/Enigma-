import { index } from '../engine/enigma';
import type { ComponentId, Configuration, SignalStage } from '../engine/enigma';
import { keyPosition, lampPosition, partPoint, ROTOR_XS, socketPosition } from './layout';
import type { AssemblyView, Vec } from './layout';

const TAU = Math.PI * 2;
export function contactPoint(x: number, c: string): Vec {
  const a = (index(c) * TAU) / 26;
  return [x, 0.8 + Math.cos(a) * 0.54, -1.97 + Math.sin(a) * 0.54];
}

/** Paths join the exact contacts from the engine. Curvature is illustrative;
 * substitutions, direction, cable pairing and all endpoint transforms are real. */
export function stagePath(s: SignalStage, config: Configuration, view: AssemblyView): Vec[] {
  const place = (p: Vec, id: ComponentId) => partPoint(p, id, view);
  const socket = (c: string) => place(socketPosition(c), 'plugboard');
  const rotor = (i: number, side: number, c: string) =>
    place(contactPoint(ROTOR_XS[i] + side, c), `rotor-${i}` as ComponentId);
  const fixed = (id: 'reflector' | 'etw', side: number, c: string) =>
    place(contactPoint((id === 'reflector' ? -1.86 : 1.86) + side, c), id);

  if (s.component.startsWith('rotor-')) {
    const i = Number(s.component.at(-1));
    const x = ROTOR_XS[i];
    const reverse = s.direction === 'reverse';
    const dir = reverse ? -1 : 1;
    const a = contactPoint(x + 0.33 * dir, s.input);
    const b = contactPoint(x - 0.33 * dir, s.output);
    const lead = reverse
      ? i === 0
        ? fixed('reflector', 0.14, s.input)
        : rotor(i - 1, 0.33, s.input)
      : i === 2
        ? fixed('etw', -0.14, s.input)
        : rotor(i + 1, -0.33, s.input);
    const inside: Vec[] = [
      a,
      [x + 0.08 * dir, 0.8 + (a[1] - 0.8) * 0.55, -1.97 + (a[2] + 1.97) * 0.55],
      [x - 0.08 * dir, 0.8 + (b[1] - 0.8) * 0.55, -1.97 + (b[2] + 1.97) * 0.55],
      b,
    ];
    return [lead, ...inside.map((p) => place(p, s.component))];
  }
  if (s.component === 'reflector')
    return [
      rotor(0, -0.33, s.input),
      fixed('reflector', 0.14, s.input),
      place([-1.91, 0.8, -1.97], 'reflector'),
      fixed('reflector', 0.14, s.output),
    ];
  if (s.component === 'keyboard') {
    const k = keyPosition(s.input);
    return [
      place(k, 'keyboard'),
      place([k[0], k[1] - 0.2, k[2]], 'keyboard'),
      [0, 0.35, 1.9],
      socket(s.output),
    ];
  }
  if (s.component === 'plugboard') {
    const a = socketPosition(s.input),
      b = socketPosition(s.output);
    if (s.input === s.output)
      return [
        place([a[0], a[1], a[2] + 0.13], 'plugboard'),
        socket(s.input),
        place([a[0], a[1], 2.4], 'plugboard'),
      ];
    const i = Math.max(
      0,
      config.plugs.findIndex((p) => p.includes(s.input)),
    );
    const cable: Vec[] = [
      a,
      [a[0], a[1] - 0.05, 2.97],
      [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 0.3 - i * 0.012, 3.1 + i * 0.025],
      [b[0], b[1] - 0.05, 2.97],
      b,
    ];
    return cable.map((p) => place(p, 'plugboard'));
  }
  if (s.component === 'etw') {
    const path: Vec[] = [
      socket(s.input),
      [2.6, 0.6, 1.7],
      [2.6, 0.6, -1.4],
      fixed('etw', 0.14, s.input),
      fixed('etw', -0.14, s.output),
      rotor(2, 0.33, s.output),
    ];
    return s.direction === 'reverse' ? path.reverse() : path;
  }
  const lamp = lampPosition(s.output);
  return [
    socket(s.input),
    [0, 0.48, 1.4],
    place([lamp[0], lamp[1] - 0.2, lamp[2]], 'lampboard'),
    place([lamp[0], lamp[1] + 0.07, lamp[2]], 'lampboard'),
  ];
}
