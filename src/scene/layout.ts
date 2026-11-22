import { KEY_ROWS } from '../engine/keyboard';
import type { ComponentId } from '../engine/enigma';

export type Vec = [number, number, number];
export const ROTOR_XS = [-0.96, 0, 0.96];
export interface AssemblyView {
  exploded: boolean;
  selected: ComponentId | null;
  inspectAngle: number;
}
export function keyPosition(c: string): Vec {
  const row = KEY_ROWS.findIndex((r) => r.includes(c));
  const col = KEY_ROWS[row].indexOf(c);
  return [(col - (KEY_ROWS[row].length - 1) / 2) * 0.56, 1.1 - row * 0.13, 0.88 + row * 0.59];
}
export function lampPosition(c: string): Vec {
  const row = KEY_ROWS.findIndex((r) => r.includes(c));
  const col = KEY_ROWS[row].indexOf(c);
  return [(col - (KEY_ROWS[row].length - 1) / 2) * 0.56, 1.19 - row * 0.035, -1.06 + row * 0.48];
}
export function socketPosition(c: string): Vec {
  const row = KEY_ROWS.findIndex((r) => r.includes(c));
  const col = KEY_ROWS[row].indexOf(c);
  return [(col - (KEY_ROWS[row].length - 1) / 2) * 0.56, 0.68 - row * 0.2, 2.65];
}
export function partPose(
  id: ComponentId,
  view: AssemblyView,
): { center: Vec; offset: Vec; angle: number } {
  const centers: Record<ComponentId, Vec> = {
    keyboard: [0, 0.95, 1.5],
    lampboard: [0, 1.12, -0.55],
    plugboard: [0, 0.46, 2.6],
    etw: [1.86, 0.8, -1.97],
    reflector: [-1.86, 0.8, -1.97],
    cover: [0, 1.33, -2.13],
    'rotor-0': [-0.96, 0.8, -1.97],
    'rotor-1': [0, 0.8, -1.97],
    'rotor-2': [0.96, 0.8, -1.97],
    case: [0, 0.5, 0],
    lid: [0, 0.99, -2.9],
  };
  const center = centers[id];
  let offset: Vec = [0, 0, 0];
  if (view.exploded) {
    if (id === 'keyboard') offset = [0, 0.65, 0.4];
    else if (id === 'lampboard') offset = [0, 0.9, 0];
    else if (id === 'plugboard') offset = [0, 0, 0.9];
    else if (id === 'cover') offset = [0, 2.5, -0.3];
    else if (id === 'etw' || id === 'reflector' || id.startsWith('rotor-'))
      offset = [center[0] * 0.6, 1.45, 0];
  }
  return { center, offset, angle: view.exploded && view.selected === id ? view.inspectAngle : 0 };
}

/** Same rigid transform used by rendered parts and by their signal endpoints. */
export function partPoint(point: Vec, id: ComponentId, view: AssemblyView): Vec {
  const { center, offset, angle } = partPose(id, view);
  const dx = point[0] - center[0],
    dz = point[2] - center[2];
  return [
    center[0] + offset[0] + Math.cos(angle) * dx + Math.sin(angle) * dz,
    point[1] + offset[1],
    center[2] + offset[2] - Math.sin(angle) * dx + Math.cos(angle) * dz,
  ];
}
