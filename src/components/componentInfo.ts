import type { ComponentId } from '../engine/enigma';

export const COMPONENTS: Record<
  ComponentId,
  { name: string; german: string; description: string; detail: string }
> = {
  keyboard: {
    name: 'Mechanical keyboard',
    german: 'Tastatur',
    description:
      'Each key first engages the stepping mechanism, then closes an electrical switch. Only one circuit is energized for each keypress.',
    detail: '26 keys · German QWERTZ layout',
  },
  lampboard: {
    name: 'Lampboard',
    german: 'Lampenfeld',
    description:
      'A small incandescent lamp identifies the enciphered letter. Operators transcribed these letters by hand. Here the last lamp is held for inspection.',
    detail: '26 incandescent lamp circuits',
  },
  plugboard: {
    name: 'Plugboard',
    german: 'Steckerbrett',
    description:
      'A cable swaps two letters on both the outward and return journeys. Click a socket, then another to connect them. Click a patched socket or cable to remove it.',
    detail: 'Up to 10 operational cable pairs',
  },
  etw: {
    name: 'Entry wheel',
    german: 'Eintrittswalze · ETW',
    description:
      'This stationary disc connects the keyboard and plugboard circuits to the rightmost rotor. The Enigma I entry wheel has alphabetical wiring.',
    detail: 'Fixed · ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  'rotor-0': {
    name: 'Left rotor',
    german: 'Langsame Walze',
    description:
      'The slow rotor advances when the middle rotor reaches its turnover notch. Each of its 26 wires connects a different contact on the opposite face.',
    detail: 'Slow rotor · 26 positions',
  },
  'rotor-1': {
    name: 'Middle rotor',
    german: 'Mittlere Walze',
    description:
      'The middle rotor advances when the right rotor is at its notch, and again when its own notch is engaged. This creates the characteristic double step.',
    detail: 'Middle rotor · double stepping',
  },
  'rotor-2': {
    name: 'Right rotor',
    german: 'Schnelle Walze',
    description:
      'The fast rotor advances before every letter is enciphered. Its turnover notch engages the middle rotor’s pawl at a fixed window position.',
    detail: 'Fast rotor · steps with every key',
  },
  reflector: {
    name: 'Reflector',
    german: 'Umkehrwalze · UKW',
    description:
      'Thirteen fixed wire pairs turn the current back through the rotors. This reciprocal circuit enables the same operation to encrypt and decrypt, and prevents a letter from enciphering to itself.',
    detail: 'Stationary · reciprocal wiring',
  },
  lid: {
    name: 'Wooden lid',
    german: 'Transportdeckel',
    description:
      'The transport lid protects the machine and carries operating notes and spare cables. Click it, or use the lid control, to open and close the case.',
    detail: 'Hinged wooden transport cover',
  },
  case: {
    name: 'Wooden transport case',
    german: 'Holzkasten',
    description:
      'A sturdy wooden case protects the metal chassis. Cutaway mode makes the walls translucent to expose the electrical and mechanical assembly.',
    detail: 'Wood case · metal corner fittings',
  },
  cover: {
    name: 'Rotor cover',
    german: 'Walzendeckel',
    description:
      'The metal cover exposes three numbered position windows and adjustment wheels. Cutaway mode reveals the rotor stack beneath it. On Enigma I, 01–26 correspond to A–Z.',
    detail: 'Three windows · numeric index rings',
  },
};
