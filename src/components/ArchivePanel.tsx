import { BookOpen, Cable, Disc3, Keyboard, Lightbulb, ScanEye } from 'lucide-react';
import type { ComponentId } from '../engine/enigma';
import { COMPONENTS } from './componentInfo';

export function ComponentsPanel({
  selected,
  onInspect,
}: {
  selected: ComponentId | null;
  onInspect: (id: ComponentId) => void;
}) {
  const items = [
    { id: 'keyboard', icon: Keyboard },
    { id: 'lampboard', icon: Lightbulb },
    { id: 'plugboard', icon: Cable },
    { id: 'rotor-2', icon: Disc3 },
    { id: 'rotor-1', icon: Disc3 },
    { id: 'rotor-0', icon: Disc3 },
    { id: 'reflector', icon: Disc3 },
    { id: 'etw', icon: Disc3 },
    { id: 'cover', icon: ScanEye },
    { id: 'lid', icon: BookOpen },
    { id: 'case', icon: ScanEye },
  ] as const;
  return (
    <div className="component-list">
      <div className="panel-heading">
        <span className="eyebrow">EXPLORE THE ASSEMBLY</span>
      </div>
      <p className="setting-description">Select a part here or directly on the model.</p>
      {items.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className={selected === id ? 'selected' : ''}
          onClick={() => onInspect(id)}
        >
          <Icon size={17} />
          <span>
            {COMPONENTS[id].name}
            <small>{COMPONENTS[id].german}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
export function ArchivePanel() {
  return (
    <div className="archive-panel">
      <div className="panel-heading">
        <span className="eyebrow">FROM THE ARCHIVE</span>
        <BookOpen size={15} />
      </div>
      <span className="archive-year">1930</span>
      <h2>
        A machine.
        <br />
        Millions of possibilities.
      </h2>
      <p>
        The three-rotor Enigma I turned a keypress into a new electrical path. Before each letter,
        its rotor mechanism changed the circuit again.
      </p>
      <p>
        Operators needed matching rotor choices, ring settings, initial windows, and plugboard pairs
        to read each other’s messages.
      </p>
      <blockquote>
        Every letter changes
        <br />
        the next letter.
      </blockquote>
      <p>
        The reflector made encryption reciprocal. It also ensured that a letter could never become
        itself, a property exploited by cryptanalysts.
      </p>
      <p>
        Polish mathematicians Marian Rejewski, Jerzy Różycki and Henryk Zygalski made pioneering
        advances against military Enigma. Their work helped the later Allied effort at Bletchley
        Park.
      </p>
      <div className="archive-detail">
        <span>ABOUT THIS RECONSTRUCTION</span>
        <p>
          A procedural model inspired by the supplied photograph. Cutaway routes and exploded
          spacing are educational views; rotor wiring, stepping and transformations are calculated
          from the historical circuit.
        </p>
        <p>
          The ten-pair limit follows the wartime operating setup; the physical board could accept
          thirteen pairs.
        </p>
      </div>
      <a
        href="https://www.cryptomuseum.com/crypto/enigma/working.htm"
        target="_blank"
        rel="noreferrer"
      >
        How the circuit works · Crypto Museum
      </a>
      <a
        href="https://www.cryptomuseum.com/crypto/enigma/wiring.htm"
        target="_blank"
        rel="noreferrer"
      >
        Historical wiring tables · Crypto Museum
      </a>
      <a href="https://enigmamuseum.com/rotwirg.htm" target="_blank" rel="noreferrer">
        Rotor measurements · Enigma Museum
      </a>
      <a href="https://www.tnmoc.org/bh-3-the-polish-connection" target="_blank" rel="noreferrer">
        The Polish connection · Computing Museum
      </a>
    </div>
  );
}
