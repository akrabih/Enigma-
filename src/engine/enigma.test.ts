import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  DEFAULT_CONFIG,
  REFLECTORS,
  ROTORS,
  letter,
  mod,
  pressKey,
  processMessage,
  stepRotors,
  throughRotor,
  validateConfiguration,
} from './enigma';
import type { Configuration, RotorId, Triple } from './enigma';

const configured = (overrides: Partial<Configuration> = {}): Configuration => ({
  ...structuredClone(DEFAULT_CONFIG),
  ...overrides,
});

describe('historical Enigma I vectors', () => {
  it('AAA / I-II-III / UKW B / rings AAA gives AAAAA → BDZGO', () => {
    expect(processMessage(configured(), 'AAAAA').output).toBe('BDZGO');
  });
  it('matches the HELLOWORLD → ILBDAAMTAZ vector', () => {
    expect(processMessage(configured(), 'HELLOWORLD').output).toBe('ILBDAAMTAZ');
  });
  it('decrypts from the original positions, not the final positions', () => {
    const config = configured({
      rotors: ['V', 'III', 'II'],
      reflector: 'C',
      rings: [17, 5, 25],
      start: [23, 4, 19],
      plugs: [
        ['A', 'Z'],
        ['B', 'Y'],
        ['C', 'X'],
        ['D', 'W'],
        ['E', 'V'],
      ],
    });
    const input = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG'.repeat(20);
    const encrypted = processMessage(config, input);
    expect(processMessage(config, encrypted.output).output).toBe(input);
    expect(encrypted.positions).not.toEqual(config.start);
  });
});

describe('rotor and reflector wiring', () => {
  it('each rotor is a complete permutation', () => {
    for (const rotor of Object.values(ROTORS))
      expect([...rotor.wiring].sort().join('')).toBe(ALPHABET);
  });
  it('forward and inverse cancel for every rotor, ring, position and input', () => {
    for (const id of Object.keys(ROTORS) as RotorId[]) {
      for (let position = 0; position < 26; position++) {
        for (let ring = 0; ring < 26; ring++) {
          for (let input = 0; input < 26; input++) {
            const forward = throughRotor(input, id, position, ring);
            expect(throughRotor(forward.value, id, position, ring, true).value).toBe(input);
          }
        }
      }
    }
  });
  it('ring offsets follow the independently stated wiring equation', () => {
    // Rotor I: physical input A at window D/ring B reaches core C → M; offset C yields K.
    expect(throughRotor(0, 'I', 3, 1)).toMatchObject({ coreInput: 2, coreOutput: 12, value: 10 });
    expect(throughRotor(0, 'I', 0, 0).value).toBe(4);
    expect(throughRotor(0, 'I', 1, 1).value).toBe(4);
  });
  it('both reflectors are fixed-point-free involutions', () => {
    for (const wiring of Object.values(REFLECTORS)) {
      for (let i = 0; i < 26; i++) {
        const j = ALPHABET.indexOf(wiring[i]);
        expect(j).not.toBe(i);
        expect(wiring[j]).toBe(letter(i));
      }
    }
  });
});

describe('pawls and turnover', () => {
  it('steps before encrypting and advances the fast rotor on every key', () => {
    const result = pressKey(configured(), [0, 0, 0], 'A');
    expect(result.before).toEqual([0, 0, 0]);
    expect(result.positions).toEqual([0, 0, 1]);
    expect(result.stepped).toEqual([false, false, true]);
  });
  it('reproduces double stepping ADU → ADV → AEW → BFX', () => {
    let positions: Triple<number> = [0, 3, 20];
    const windows = [];
    for (let n = 0; n < 3; n++) {
      positions = stepRotors(['I', 'II', 'III'], positions).positions;
      windows.push(positions.map(letter).join(''));
    }
    expect(windows).toEqual(['ADV', 'AEW', 'BFX']);
  });
  it('implements all five turnover letters, including Z wrapping', () => {
    for (const right of Object.keys(ROTORS) as RotorId[]) {
      const middle: RotorId = right === 'II' ? 'III' : 'II';
      const left = (Object.keys(ROTORS) as RotorId[]).find((r) => r !== right && r !== middle)!;
      const p = ALPHABET.indexOf(ROTORS[right].notch);
      expect(stepRotors([left, middle, right], [0, 0, p]).positions).toEqual([0, 1, mod(p + 1)]);
    }
  });
  it('ring changes leave window turnover letters unchanged', () => {
    for (let ring = 0; ring < 26; ring++) {
      const config = configured({ rings: [ring, ring, ring] });
      expect(pressKey(config, [0, 3, 21], 'A').positions).toEqual([0, 4, 22]);
      expect(pressKey(config, [0, 4, 22], 'A').positions).toEqual([1, 5, 23]);
    }
  });
});

describe('plugboard, validation and trace consistency', () => {
  it('patches both sides of the exact same circuit', () => {
    const unpatched = pressKey(configured(), [0, 0, 0], 'A');
    expect(unpatched.output).toBe('B');
    const patched = pressKey(
      configured({
        plugs: [
          ['A', 'C'],
          ['B', 'Z'],
        ],
      }),
      [0, 0, 0],
      'C',
    );
    expect(patched.output).toBe('Z');
    expect(patched.stages[1]).toMatchObject({ input: 'C', output: 'A' });
    expect(patched.stages[11]).toMatchObject({ input: 'B', output: 'Z' });
  });
  it('rejects reused sockets, self-pairs, duplicate rotors and invalid settings', () => {
    expect(() => validateConfiguration(configured({ plugs: [['A', 'A']] }))).toThrow();
    expect(() =>
      validateConfiguration(
        configured({
          plugs: [
            ['A', 'B'],
            ['A', 'C'],
          ],
        }),
      ),
    ).toThrow();
    expect(() => validateConfiguration(configured({ rotors: ['I', 'I', 'II'] }))).toThrow();
    expect(() => validateConfiguration(configured({ rings: [-1, 0, 0] }))).toThrow();
    expect(() => pressKey(configured(), [0, 0, 0], '!')).toThrow();
    const pairs = Array.from(
      { length: 11 },
      (_, i) => [letter(i * 2), letter(i * 2 + 1)] as [string, string],
    );
    expect(() => validateConfiguration(configured({ plugs: pairs }))).toThrow();
  });
  it('trace connects all 13 stages with correct order and inverse direction', () => {
    const result = pressKey(configured(), [0, 0, 0], 'A');
    expect(result.stages).toHaveLength(13);
    expect(result.stages.map((s) => s.component)).toEqual([
      'keyboard',
      'plugboard',
      'etw',
      'rotor-2',
      'rotor-1',
      'rotor-0',
      'reflector',
      'rotor-0',
      'rotor-1',
      'rotor-2',
      'etw',
      'plugboard',
      'lampboard',
    ]);
    for (let i = 1; i < 13; i++) expect(result.stages[i].input).toBe(result.stages[i - 1].output);
    expect(result.stages[12].output).toBe(result.output);
    expect(result.stages.slice(7, 10).every((s) => s.direction === 'reverse')).toBe(true);
  });
  it('never enciphers a letter to itself and does not mutate configuration', () => {
    const config = configured({ rings: [2, 15, 9], plugs: [['A', 'B']] });
    const initial = structuredClone(config);
    for (const result of processMessage(config, ALPHABET.repeat(10)).results)
      expect(result.output).not.toBe(result.input);
    expect(config).toEqual(initial);
  });
  it('normalizes messages and leaves an empty message stationary', () => {
    expect(processMessage(configured(), 'Hello, World! 123').output).toBe('ILBDAAMTAZ');
    expect(processMessage(configured(), '').positions).toEqual([0, 0, 0]);
  });
});
