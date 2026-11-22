import { CornerDownRight, FastForward, Pause, Play, RotateCcw, StepForward, X } from 'lucide-react';
import type { MachineController } from '../hooks/useMachine';
import type { ComponentId } from '../engine/enigma';
import { COMPONENTS } from './componentInfo';

export function Inspector({
  selected,
  close,
  machine: m,
  exploded,
  inspectAngle,
  setInspectAngle,
}: {
  selected: ComponentId;
  close: () => void;
  machine: MachineController;
  exploded: boolean;
  inspectAngle: number;
  setInspectAngle: (v: number) => void;
}) {
  const info = COMPONENTS[selected];
  const rotorIndex = selected.startsWith('rotor-') ? Number(selected.at(-1)) : null;
  return (
    <section className="inspector">
      <div className="panel-heading">
        <span className="eyebrow">COMPONENT INSPECTOR</span>
        <button className="icon-button" aria-label="Close component inspector" onClick={close}>
          <X size={14} />
        </button>
      </div>
      <h3>{rotorIndex !== null ? `Rotor ${m.config.rotors[rotorIndex]}` : info.name}</h3>
      <span className="inspector-subtitle">{info.german}</span>
      <p>{info.description}</p>
      <div className="inspector-value">
        {rotorIndex !== null
          ? `Window ${m.windows[rotorIndex]} · Ring ${String(m.config.rings[rotorIndex] + 1).padStart(2, '0')}`
          : selected === 'plugboard'
            ? `${m.config.plugs.length} cable pairs connected`
            : selected === 'reflector'
              ? `UKW ${m.config.reflector} · 13 fixed pairs`
              : selected === 'lampboard'
                ? m.result
                  ? `Output lamp: ${m.result.output}`
                  : 'No output yet'
                : info.detail}
      </div>
      {rotorIndex !== null && (
        <>
          <button
            className="small-button"
            disabled={m.busy}
            onClick={() => m.adjustRotor(rotorIndex)}
          >
            Advance rotor one position
          </button>
        </>
      )}
      {exploded && (
        <label className="inspection-range">
          Rotate isolated component
          <input
            type="range"
            min={-3.14}
            max={3.14}
            step={0.05}
            value={inspectAngle}
            onChange={(e) => setInspectAngle(Number(e.target.value))}
          />
        </label>
      )}
    </section>
  );
}

const emptyNames = [
  'Keyboard',
  'Plugboard',
  'Entry wheel · ETW',
  'Rotor III',
  'Rotor II',
  'Rotor I',
  'Reflector B',
  'Rotor I',
  'Rotor II',
  'Rotor III',
  'Entry wheel · ETW',
  'Plugboard',
  'Lampboard',
];
export default function SignalPanel({ machine: m }: { machine: MachineController }) {
  const current = m.result?.stages[m.stage];
  const names = [...emptyNames];
  names[3] = names[9] = `Rotor ${m.config.rotors[2]}`;
  names[4] = names[8] = `Rotor ${m.config.rotors[1]}`;
  names[5] = names[7] = `Rotor ${m.config.rotors[0]}`;
  names[6] = `Reflector ${m.config.reflector}`;
  return (
    <div className="signal-panel">
      <div className="panel-heading">
        <span className="eyebrow">ELECTRICAL PATH</span>
        <span className="live-label">
          <i className={m.playing ? 'status-dot pulsing' : 'status-dot'} />
          LIVE
        </span>
      </div>
      <div className="signal-summary">
        <div>
          <span>KEY IN</span>
          <strong>{m.result?.input ?? '—'}</strong>
        </div>
        <div className="signal-summary-line">
          <span>13 stages</span>
          <i />
        </div>
        <div>
          <span>LAMP OUT</span>
          <strong className={m.stage === 12 && m.result ? 'lit-letter' : ''}>
            {m.result?.output ?? '—'}
          </strong>
        </div>
      </div>
      <div className="signal-direction">
        <span className="gold-line" />
        OUTBOUND
        <span className="sage-line" />
        RETURN
      </div>
      <div className="signal-stages" aria-label="Electrical transformation stages">
        {names.map((name, i) => {
          const s = m.result?.stages[i];
          return (
            <button
              key={i}
              disabled={!m.result}
              aria-label={`Inspect stage ${i + 1}: ${name}`}
              aria-current={m.result && i === m.stage ? 'step' : undefined}
              className={`signal-stage ${i > 6 ? 'return-stage' : ''} ${i === 6 ? 'reflect-stage' : ''} ${m.result && i === m.stage ? 'current-stage' : ''} ${m.result && i < m.stage ? 'visited' : ''}`}
              onClick={() => m.seek(i)}
            >
              <span className="stage-track">
                <i />
              </span>
              <span className="stage-name">{name}</span>
              <span className="stage-transform">
                {s ? (
                  <>
                    {s.input}
                    <CornerDownRight size={10} />
                    <b>{s.output}</b>
                  </>
                ) : (
                  <span className="empty-transform">···</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="playback-controls">
        <button
          className="icon-button"
          disabled={!m.result}
          aria-label="Reset signal visualization"
          onClick={() => m.seek(0)}
        >
          <RotateCcw size={14} />
        </button>
        <button
          className="play-button"
          disabled={!m.result}
          aria-label={m.playing ? 'Pause signal animation' : 'Play signal animation'}
          onClick={m.togglePlayback}
        >
          {m.playing ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
        <button
          className="icon-button"
          disabled={!m.result || m.stage === 12}
          aria-label="Step through one signal stage"
          onClick={() => m.seek(m.stage + 1)}
        >
          <StepForward size={16} />
        </button>
        <button
          className={`speed-button ${m.slow ? 'selected' : ''}`}
          aria-pressed={m.slow}
          onClick={() => m.setSlow(!m.slow)}
          title="Toggle slow motion"
        >
          <FastForward size={12} />
          {m.slow ? '0.25×' : '1×'}
        </button>
      </div>
      <div className="stage-explanation" aria-live="polite">
        <span className="eyebrow">
          {current
            ? `${String(m.stage + 1).padStart(2, '0')} / 13 · ${current.direction.toUpperCase()}`
            : 'FOLLOW THE CURRENT'}
        </span>
        <p>
          {current?.explanation ??
            'Press a letter on the machine or your keyboard. Follow its actual journey through the circuit, one contact at a time.'}
        </p>
      </div>
    </div>
  );
}
