# Enigma — The cipher room

A browser-based, interactive 3D reconstruction of the Enigma I cipher machine. Operate the keyboard, configure rotors **I, II, and III**, connect plugboard cables, and follow each letter through the actual encryption circuit.

Built with **React 19, TypeScript, Three.js, React Three Fiber, and Drei**. The procedural machine model is inspired by a historical photograph. The physical keyboard, computer keyboard, and message laboratory share one independent encryption engine.

## Features

| Area | Capabilities |
| --- | --- |
| 3D machine | Wooden case, hinged lid, mechanical keyboard, lampboard, numbered windows, and rotating thumbwheels |
| Configuration | All six orders of rotors I–III, starting positions, ring settings, and reflectors B and C |
| Plugboard | Connect and remove visible cables using the physical sockets or control panel; up to ten pairs |
| Electrical trace | Actual transformations across 13 stages, glowing signal paths, explanations, pause/resume, stepping, and slow motion |
| Inspection | Orbit, zoom, pan, camera presets, cutaway view, and an animated exploded assembly with component inspection |
| Laboratory | Sequential message encryption and decryption, shared machine state, transmission reset, and ciphertext copying |
| Education | Component descriptions, an operator field guide, and historical references |

## Getting started

### Requirements

- Node.js **22.12 or newer**, with npm.
- A modern browser with WebGL support for the 3D machine. Hardware acceleration is recommended.

### Clone and run

```sh
git clone https://github.com/akrabih/Enigma-.git
cd Enigma-
npm ci
npm run dev
```

Open the local URL printed by Vite, normally **http://127.0.0.1:5173/**. Keep the terminal running while using the simulator; press **Ctrl+C** to stop it.

### Windows shortcut

From PowerShell in the project folder:

```powershell
.\start.cmd
```

The launcher installs missing project dependencies and opens the browser. It uses an installed Node.js runtime or the compatible portable runtime if one has already been prepared on the computer. The repository does not bundle Node.js.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm test` | Run the automated test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Type-check the project and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally after building |

The application builds to static files and does not require a backend service.

## Operate the machine

- Click a 3D key or press A–Z. Watch the rotor windows advance, then follow the electrical path to the output lamp. The lamp is held after the signal completes for inspection.
- Drag to orbit, right-drag to pan, and scroll to zoom. Touch supports orbit, pinch zoom and two-finger pan. Choose operator, overhead or rear views from the camera menu.
- Arrange rotors I, II, and III, select reflector B or C, and set the starting windows and ring settings. Selecting an installed rotor swaps its slot rather than creating a duplicate. The thumbwheels and sidebar windows manually advance the rotors.
- Click two plugboard sockets to add a cable. Click an existing cable or connected socket to disconnect it. Both the physical and sidebar sockets operate the same plugboard. Ten operational pairs are supported.
- Open/close the lid, reveal the cutaway, or separate the assembly in exploded view. Click components to inspect their purpose and current settings. In exploded view, each selected component can be rotated independently for inspection.
- Pause, resume, restart or step through the 13 signal stages. Select any trace stage for its actual input, output, direction, and explanation. Slow motion is available. Gold shows the outgoing signal; green shows the return.
- In Laboratory, enter a message and select **Run message**. The machine resets to the configured initial windows, then operates one letter at a time. **Decrypt current output** runs the ciphertext with the same initial setup. Spaces, numbers and punctuation are omitted; runs accept up to 2,000 letters.
- Settings changes start a fresh transmission. Reset restores the configured initial windows without changing rotor choices, rings, reflector or cables. Resetting the signal animation only replays the last trace and does not alter the encryption state.

## Accuracy

The interface deliberately offers **only rotors I, II, and III**, giving **3! = 6** rotor orders. Historical wiring data for IV and V remain in the engine for reference and test coverage; they are not selectable in the interface.

Settings are specified **left to right**, with A = 01 and Z = 26. The model uses the Enigma I numeric window convention, while the sidebar shows both letters and numbers.

The engine steps before encryption and implements the middle rotor's double step. Turnover is tied to the window index ring, so ring settings offset the wiring without changing the turnover window letter. Return traversal uses the inverse of each rotor permutation.

Tests cover:

- I–II–III, reflector B, rings AAA, start AAA, no plugs: `AAAAA → BDZGO` and `HELLOWORLD → ILBDAAMTAZ`.
- Encryption/decryption reciprocity with nonzero rings, positions, plug pairs and reflector C.
- All rotor permutations, inverse transformations across every ring/position/input combination, both reflectors, all turnover letters, ring-independent turnover, and `ADU → ADV → AEW → BFX` double stepping.
- Plugboard reciprocity on both sides, invalid configurations, trace continuity, input normalization and immutable engine inputs.

### Try a known result

Set the rotor order to **I–II–III**, reflector to **B**, rings to **AAA / 01–01–01**, starting windows to **AAA**, and remove all plugboard cables.

```text
Plaintext     Ciphertext
AAAAA         BDZGO
HELLOWORLD    ILBDAAMTAZ
```

Reset to AAA before each example. To decrypt, reset to the same initial settings and enter the ciphertext. The laboratory also provides a **Load known test vector** control.

### Historical references

- [Crypto Museum: Enigma wiring tables](https://www.cryptomuseum.com/crypto/enigma/wiring.htm)
- [Crypto Museum: operation and double stepping](https://www.cryptomuseum.com/crypto/enigma/working.htm)
- [Enigma Museum: David Hamer's rotor wiring measurements](https://enigmamuseum.com/rotwirg.htm)
- [The National Museum of Computing: the Polish connection](https://www.tnmoc.org/bh-3-the-polish-connection)

The three-dimensional model is an educational reconstruction rather than a measured conservation model. Internal wire curves preserve the real rotor contact mappings, while cable routing, chassis details, material wear, cutaway transparency and exploded spacing are illustrative. The historical machine could physically accept thirteen cable pairs; this simulator applies the requested ten-pair operational limit. Each keystroke's 13-stage trace is a slowed educational view of a circuit that operates essentially instantaneously on the original machine.

## Structure

```text
src/engine/       Pure cipher engine, data, validation and unit tests
src/hooks/        Shared machine state, keyboard events and sequential playback
src/scene/        Procedural model, materials, camera and electrical path
src/components/   Configuration, trace, inspection, laboratory and archive
src/App.tsx       Workspace and coordinated interactions
src/styles.css    Responsive instrument-inspired interface
```

The engine never imports React or Three.js. Every visual signal stage is generated from a `pressKey` result, including the actual rotor core contacts and offsets. WebGL failure leaves the laboratory and computer-keyboard controls usable. Models, labels and textures are generated locally; interface fonts use Google Fonts with local fallbacks. No message content is sent to a server or persisted.

## Validation and limitations

The project includes **35 automated tests** covering the engine, shared controller, interface controls, and signal geometry. Controller and DOM integration tests verify rapid keypresses, ignored editable fields and shortcuts, sequential batch processing, pause/resume, visualization stepping without re-encryption, plugboard controls, manual rotor adjustments, resetting a queued run, message-length validation, and laboratory decryption.

Geometry tests verify that paths match the actual key, lamp, cable, and rotor contacts, including ring offsets, exploded transforms, and independent inspection angles. DOM tests replace the WebGL surface and do not verify GPU rendering. Browser visual verification remains outstanding.

The simulator is intended for historical study and cryptography education. Enigma is not suitable for protecting modern sensitive information.
