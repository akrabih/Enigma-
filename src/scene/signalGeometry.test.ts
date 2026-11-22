import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, index, pressKey } from '../engine/enigma';
import type { ComponentId } from '../engine/enigma';
import { keyPosition, lampPosition, partPoint, partPose, ROTOR_XS, socketPosition } from './layout';
import type { AssemblyView, Vec } from './layout';
import { contactPoint, stagePath } from './signalGeometry';

const view: AssemblyView = { exploded: false, selected: null, inspectAngle: 0 };
const closePoint = (actual: Vec, expected: Vec) =>
  actual.forEach((n, i) => expect(n).toBeCloseTo(expected[i], 8));

describe('physical signal coordinates', () => {
  it('starts on the actual key and ends at the actual output lamp', () => {
    const result = pressKey(DEFAULT_CONFIG, [0, 0, 0], 'A');
    closePoint(stagePath(result.stages[0], DEFAULT_CONFIG, view)[0], keyPosition('A'));
    const lamp = lampPosition('B');
    closePoint(stagePath(result.stages[12], DEFAULT_CONFIG, view).at(-1)!, [
      lamp[0],
      lamp[1] + 0.07,
      lamp[2],
    ]);
  });

  it('matches both rotor contact letters after the actual ring and position rotations', () => {
    const config = {
      ...structuredClone(DEFAULT_CONFIG),
      rings: [7, 19, 3] as [number, number, number],
    };
    const result = pressKey(config, [13, 4, 21], 'K');
    for (const s of result.stages.filter((s) => s.component.startsWith('rotor-'))) {
      const i = Number(s.component.at(-1));
      const direction = s.direction === 'reverse' ? -1 : 1;
      const path = stagePath(s, config, view);
      const physicalPoint = (core: number, x: number): Vec => {
        const angle = ((core - s.offset!) * Math.PI * 2) / 26;
        return [x, 0.8 + Math.cos(angle) * 0.54, -1.97 + Math.sin(angle) * 0.54];
      };
      closePoint(path[1], physicalPoint(s.coreInput!, ROTOR_XS[i] + 0.33 * direction));
      closePoint(path.at(-1)!, physicalPoint(s.coreOutput!, ROTOR_XS[i] - 0.33 * direction));
      expect((s.coreInput! - s.offset! + 26) % 26).toBe(index(s.input));
    }
  });

  it('follows the visible physical patch cable on both journeys', () => {
    const config = {
      ...structuredClone(DEFAULT_CONFIG),
      plugs: [
        ['A', 'C'],
        ['B', 'Z'],
      ] as [string, string][],
    };
    const result = pressKey(config, [0, 0, 0], 'C');
    for (const i of [1, 11]) {
      const s = result.stages[i];
      const path = stagePath(s, config, view);
      closePoint(path[0], socketPosition(s.input));
      closePoint(path.at(-1)!, socketPosition(s.output));
    }
    expect(stagePath(result.stages[11], config, view)[2][2]).toBeCloseTo(3.125);
  });

  it('moves socket, key and lamp endpoints with the exploded assemblies', () => {
    const exploded = { ...view, exploded: true };
    const result = pressKey(DEFAULT_CONFIG, [0, 0, 0], 'A');
    const key = stagePath(result.stages[0], DEFAULT_CONFIG, exploded);
    closePoint(key[0], partPoint(keyPosition('A'), 'keyboard', exploded));
    closePoint(key.at(-1)!, partPoint(socketPosition('A'), 'plugboard', exploded));
    expect(key.at(-1)![2]).toBeCloseTo(3.55);
    const lamp = lampPosition('B');
    closePoint(
      stagePath(result.stages[12], DEFAULT_CONFIG, exploded).at(-1)!,
      partPoint([lamp[0], lamp[1] + 0.07, lamp[2]], 'lampboard', exploded),
    );
  });

  it('keeps the selected rotor path attached while independently rotating its assembly', () => {
    const angled: AssemblyView = { exploded: true, selected: 'rotor-2', inspectAngle: Math.PI / 2 };
    const result = pressKey(DEFAULT_CONFIG, [0, 0, 0], 'A');
    const s = result.stages[3];
    closePoint(
      stagePath(s, DEFAULT_CONFIG, angled)[1],
      partPoint(contactPoint(ROTOR_XS[2] + 0.33, s.input), 'rotor-2', angled),
    );
    closePoint(
      stagePath(s, DEFAULT_CONFIG, angled).at(-1)!,
      partPoint(contactPoint(ROTOR_XS[2] - 0.33, s.output), 'rotor-2', angled),
    );
  });

  it('joins consecutive rotor/reflector stages continuously in either direction', () => {
    const result = pressKey(DEFAULT_CONFIG, [0, 0, 0], 'A');
    for (const exploded of [false, true]) {
      const state = { ...view, exploded, selected: 'rotor-1' as ComponentId, inspectAngle: 0.85 };
      for (let n = 3; n < 9; n++)
        closePoint(
          stagePath(result.stages[n], DEFAULT_CONFIG, state).at(-1)!,
          stagePath(result.stages[n + 1], DEFAULT_CONFIG, state)[0],
        );
    }
  });

  it('provides an independent inspection pivot for every selectable component', () => {
    for (const id of [
      'keyboard',
      'lampboard',
      'plugboard',
      'etw',
      'reflector',
      'rotor-0',
      'rotor-1',
      'rotor-2',
      'lid',
      'case',
      'cover',
    ] as ComponentId[]) {
      const pose = partPose(id, { exploded: true, selected: id, inspectAngle: 1.2 });
      expect(pose.angle).toBe(1.2);
      expect(partPose(id, { ...view, selected: id, inspectAngle: 1.2 }).angle).toBe(0);
    }
  });
});
