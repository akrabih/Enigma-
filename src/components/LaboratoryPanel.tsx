import { FlaskConical, Play, RotateCcw, Square } from 'lucide-react';
import { DEFAULT_CONFIG, letter, normalize } from '../engine/enigma';
import type { MachineController } from '../hooks/useMachine';

export default function LaboratoryPanel({
  machine: m,
  text,
  setText,
}: {
  machine: MachineController;
  text: string;
  setText: (s: string) => void;
}) {
  const total = m.input.length + m.queue.length;
  return (
    <aside className="panel laboratory-panel">
      <div className="panel-heading">
        <span className="eyebrow">ENCRYPTION LABORATORY</span>
        <FlaskConical size={16} />
      </div>
      <h2>
        Words into
        <br />
        <em>secrets.</em>
      </h2>
      <p className="setting-description">
        Send a message through the same circuit as the physical keyboard.
      </p>
      <label className="textarea-label" htmlFor="message">
        YOUR MESSAGE<span>{normalize(text).length} LETTERS</span>
      </label>
      <textarea
        id="message"
        placeholder="Type your message…"
        maxLength={3000}
        value={text}
        disabled={m.busy}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="microcopy">
        A–Z only. Spaces, punctuation and numbers are omitted. Maximum 2,000 letters per run.
      </p>
      <button
        className="primary-button"
        disabled={m.busy || !normalize(text)}
        onClick={() => m.runMessage(text)}
      >
        <Play size={14} />
        Run message
      </button>
      {m.busy && (
        <div className="batch-progress">
          <div>
            <span>
              {m.playing ? 'Processing' : 'Paused'} {m.input.length} / {total}
            </span>
            <button className="text-button" onClick={m.stop}>
              <Square size={10} />
              Stop
            </button>
          </div>
          <progress value={m.input.length} max={total} />
        </div>
      )}
      <div className="lab-settings">
        <span className="eyebrow">RUN CONFIGURATION</span>
        <dl>
          <dt>Rotor order</dt>
          <dd>{m.config.rotors.join(' · ')}</dd>
          <dt>Initial windows</dt>
          <dd>{m.config.start.map(letter).join(' ')}</dd>
          <dt>Rings</dt>
          <dd>{m.config.rings.map((n) => String(n + 1).padStart(2, '0')).join(' ')}</dd>
          <dt>Reflector</dt>
          <dd>UKW {m.config.reflector}</dd>
          <dt>Plug pairs</dt>
          <dd>{m.config.plugs.map((p) => p.join('')).join(' ') || 'None'}</dd>
        </dl>
      </div>
      <div className="lab-note">
        <span>THE SAME KEY UNLOCKS IT</span>
        <p>
          Every run resets to your initial windows. To recover a message, use the same settings and
          process its ciphertext.
        </p>
        <button
          className="small-button"
          disabled={!m.output || m.busy}
          onClick={() => {
            const ciphertext = m.output;
            setText(ciphertext);
            m.runMessage(ciphertext);
          }}
        >
          Decrypt current output
        </button>
      </div>
      <button
        className="text-button"
        disabled={m.busy}
        onClick={() => {
          m.updateConfig(structuredClone(DEFAULT_CONFIG));
          setText('AAAAA');
          m.setNotice('Test loaded: I–II–III, AAA / AAA, UKW B. Run to obtain BDZGO.');
        }}
      >
        <FlaskConical size={13} />
        Load known test vector
      </button>
      <button className="text-button" onClick={m.reset}>
        <RotateCcw size={13} />
        Reset transmission
      </button>
    </aside>
  );
}
