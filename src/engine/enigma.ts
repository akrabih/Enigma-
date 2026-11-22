/** Enigma I conventions: rotors and settings are always listed LEFT to RIGHT.
 * Index 0 = A = 01. The pawls step BEFORE the electrical circuit closes.
 * Wiring and turnover data: https://www.cryptomuseum.com/crypto/enigma/wiring.htm
 */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ROTORS = {
  I: { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II: { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  IV: { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V: { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
} as const;
export const REFLECTORS = {
  B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
} as const;
export type RotorId = keyof typeof ROTORS;
export type ReflectorId = keyof typeof REFLECTORS;
export type Triple<T> = [T, T, T];
export type PlugPair = [string, string];
export interface Configuration {
  rotors: Triple<RotorId>;
  rings: Triple<number>;
  start: Triple<number>;
  reflector: ReflectorId;
  plugs: PlugPair[];
}
export type ComponentId =
  | 'keyboard'
  | 'plugboard'
  | 'etw'
  | 'rotor-0'
  | 'rotor-1'
  | 'rotor-2'
  | 'reflector'
  | 'lampboard'
  | 'lid'
  | 'case'
  | 'cover';
export interface SignalStage {
  component: ComponentId;
  name: string;
  direction: 'input' | 'forward' | 'reflect' | 'reverse' | 'output';
  input: string;
  output: string;
  explanation: string;
  /** Contacts within the rotating wiring core, before subtracting the offset. */
  coreInput?: number;
  coreOutput?: number;
  offset?: number;
}
export interface LetterResult {
  input: string;
  output: string;
  before: Triple<number>;
  positions: Triple<number>;
  stepped: Triple<boolean>;
  stages: SignalStage[];
}
export const mod = (n: number) => ((n % 26) + 26) % 26;
export const letter = (n: number) => ALPHABET[mod(n)];
export const index = (s: string) => ALPHABET.indexOf(s);
export const normalize = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '');
export const DEFAULT_CONFIG: Configuration = {
  rotors: ['I', 'II', 'III'],
  rings: [0, 0, 0],
  start: [0, 0, 0],
  reflector: 'B',
  plugs: [],
};

export function validateConfiguration(config: Configuration) {
  if (
    config.rotors.length !== 3 ||
    new Set(config.rotors).size !== 3 ||
    config.rotors.some((id) => !(id in ROTORS))
  )
    throw new Error('Choose three different rotors.');
  if (!(config.reflector in REFLECTORS)) throw new Error('Unknown reflector.');
  for (const setting of [config.rings, config.start]) {
    if (setting.length !== 3 || setting.some((n) => !Number.isInteger(n) || n < 0 || n > 25))
      throw new Error('Rotor settings must be between A and Z.');
  }
  if (config.plugs.length > 10)
    throw new Error('The operational setup supports a maximum of ten plug pairs.');
  const used = new Set<string>();
  for (const pair of config.plugs) {
    if (pair.length !== 2 || pair.some((c) => !/^[A-Z]$/.test(c)))
      throw new Error('Plug pairs must contain two letters A–Z.');
    for (const c of pair) {
      if (used.has(c)) throw new Error('Each plugboard letter can be used only once.');
      used.add(c);
    }
  }
}

export function stepRotors(
  rotors: Triple<RotorId>,
  before: Triple<number>,
): { positions: Triple<number>; stepped: Triple<boolean> } {
  // Notches belong to the index ring: their WINDOW letters do not shift with Ringstellung.
  const middleAtNotch = letter(before[1]) === ROTORS[rotors[1]].notch;
  const rightAtNotch = letter(before[2]) === ROTORS[rotors[2]].notch;
  const stepped: Triple<boolean> = [middleAtNotch, middleAtNotch || rightAtNotch, true];
  return {
    positions: before.map((n, i) => mod(n + Number(stepped[i]))) as Triple<number>,
    stepped,
  };
}

export function throughRotor(
  value: number,
  rotor: RotorId,
  position: number,
  ring: number,
  reverse = false,
) {
  const wiring = ROTORS[rotor].wiring;
  const offset = mod(position - ring);
  const coreInput = mod(value + offset);
  const coreOutput = reverse ? wiring.indexOf(letter(coreInput)) : index(wiring[coreInput]);
  return { value: mod(coreOutput - offset), coreInput, coreOutput, offset };
}

/** Pure calculation shared by the physical keyboard, computer keyboard and laboratory. */
export function pressKey(
  config: Configuration,
  before: Triple<number>,
  input: string,
): LetterResult {
  validateConfiguration(config);
  if (!/^[A-Z]$/.test(input)) throw new Error('Press one letter from A to Z.');
  if (before.length !== 3 || before.some((n) => !Number.isInteger(n) || n < 0 || n > 25))
    throw new Error('Invalid current rotor positions.');
  const { positions, stepped } = stepRotors(config.rotors, before);
  const stages: SignalStage[] = [];
  let value = index(input);
  const add = (
    component: ComponentId,
    name: string,
    direction: SignalStage['direction'],
    next: number,
    explanation: string,
    contacts?: ReturnType<typeof throughRotor>,
  ) => {
    stages.push({
      component,
      name,
      direction,
      input: letter(value),
      output: letter(next),
      explanation,
      ...(contacts
        ? {
            coreInput: contacts.coreInput,
            coreOutput: contacts.coreOutput,
            offset: contacts.offset,
          }
        : {}),
    });
    value = next;
  };
  const plug = (n: number) => {
    const c = letter(n);
    const pair = config.plugs.find((p) => p.includes(c));
    return pair ? index(pair[0] === c ? pair[1] : pair[0]) : n;
  };
  add(
    'keyboard',
    'Keyboard',
    'input',
    value,
    `The ${input} key advances the pawls before closing its electrical contact. Windows move from ${before.map(letter).join('')} to ${positions.map(letter).join('')}.`,
  );
  let next = plug(value);
  add(
    'plugboard',
    'Plugboard',
    'forward',
    next,
    next === value
      ? `${letter(value)} has no cable, so its normally closed contact passes it unchanged.`
      : `A physical patch cable exchanges ${letter(value)} with ${letter(next)}.`,
  );
  add(
    'etw',
    'Entry wheel · ETW',
    'forward',
    value,
    'The fixed entry wheel on Enigma I connects the keyboard to the rotor stack in alphabetical order.',
  );
  for (const i of [2, 1, 0]) {
    const transform = throughRotor(value, config.rotors[i], positions[i], config.rings[i]);
    add(
      `rotor-${i}` as ComponentId,
      `Rotor ${config.rotors[i]}`,
      'forward',
      transform.value,
      `Right to left through Rotor ${config.rotors[i]}, window ${letter(positions[i])}, ring ${letter(config.rings[i])} (${String(config.rings[i] + 1).padStart(2, '0')}). The wiring core connects ${letter(transform.coreInput)} to ${letter(transform.coreOutput)}; the position/ring offset is then removed.`,
      transform,
    );
  }
  next = index(REFLECTORS[config.reflector][value]);
  add(
    'reflector',
    `Reflector ${config.reflector}`,
    'reflect',
    next,
    `Reflector ${config.reflector} pairs ${letter(value)} with ${letter(next)} and sends the current back through a different rotor contact. It does not step.`,
  );
  for (const i of [0, 1, 2]) {
    const transform = throughRotor(value, config.rotors[i], positions[i], config.rings[i], true);
    add(
      `rotor-${i}` as ComponentId,
      `Rotor ${config.rotors[i]}`,
      'reverse',
      transform.value,
      `Left to right through the inverse wiring of Rotor ${config.rotors[i]}. Core contact ${letter(transform.coreInput)} returns through ${letter(transform.coreOutput)}. The rotor has not moved during this return journey.`,
      transform,
    );
  }
  add(
    'etw',
    'Entry wheel · ETW',
    'reverse',
    value,
    'The return current leaves the rotor assembly through the same stationary, alphabetically wired entry wheel.',
  );
  next = plug(value);
  add(
    'plugboard',
    'Plugboard',
    'reverse',
    next,
    next === value
      ? `${letter(value)} is unpatched and passes directly to its lamp circuit.`
      : `The return journey uses the same reciprocal cable, exchanging ${letter(value)} for ${letter(next)}.`,
  );
  add(
    'lampboard',
    'Lampboard',
    'output',
    value,
    `The ${letter(value)} lamp lights. The reflector makes this circuit reciprocal: resetting the initial settings and typing ${letter(value)} recovers ${input}.`,
  );
  return { input, output: letter(value), before: [...before], positions, stepped, stages };
}

export function processMessage(
  config: Configuration,
  text: string,
  initial: Triple<number> = config.start,
) {
  validateConfiguration(config);
  let positions: Triple<number> = [...initial];
  const results = [...normalize(text)].map((c) => {
    const result = pressKey(config, positions, c);
    positions = result.positions;
    return result;
  });
  return { output: results.map((r) => r.output).join(''), positions, results };
}
