import { ChevronDown, RotateCcw, Settings2, Unplug, X } from 'lucide-react';
import { ALPHABET, letter } from '../engine/enigma';
import type { RotorId, Triple } from '../engine/enigma';
import type { MachineController } from '../hooks/useMachine';
import { KEY_ROWS } from '../engine/keyboard';

export default function ConfigurationPanel({
  machine: m,
  selectedSocket,
  onSocket,
  expanded,
  setExpanded,
}: {
  machine: MachineController;
  selectedSocket: string | null;
  onSocket: (c: string) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const changeRotor = (i: number, rotor: RotorId) => {
    const rotors = [...m.config.rotors] as Triple<RotorId>;
    const other = rotors.indexOf(rotor);
    if (other !== -1) rotors[other] = rotors[i];
    rotors[i] = rotor;
    m.updateConfig({ ...m.config, rotors });
  };
  const changeSetting = (kind: 'rings' | 'start', i: number, value: number) => {
    const settings = [...m.config[kind]] as Triple<number>;
    settings[i] = value;
    m.updateConfig({ ...m.config, [kind]: settings });
  };
  return (
    <aside className="config-panel panel">
      <div className="panel-heading">
        <span className="eyebrow">MACHINE SETTINGS</span>
        <Settings2 size={15} />
      </div>
      <div className="setting-group">
        <div className="section-label">
          Rotor assembly <span>LEFT TO RIGHT</span>
        </div>
        <div className="rotor-cards">
          {m.config.rotors.map((rotor, i) => (
            <div className="rotor-card" key={i}>
              <label className="rotor-select">
                <span className="sr-only">{['Left', 'Middle', 'Right'][i]} rotor</span>
                <select
                  aria-label={`${['Left', 'Middle', 'Right'][i]} rotor`}
                  value={rotor}
                  disabled={m.busy}
                  onChange={(e) => changeRotor(i, e.target.value as RotorId)}
                >
                  {['I', 'II', 'III'].map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
                <ChevronDown size={10} />
              </label>
              <button
                className={`rotor-window ${m.result?.stepped[i] ? 'has-stepped' : ''}`}
                aria-label={`Advance ${['left', 'middle', 'right'][i]} rotor, current position ${letter(m.positions[i])}`}
                disabled={m.busy}
                onClick={() => m.adjustRotor(i)}
              >
                {letter(m.positions[i])}
              </button>
              <span className="rotor-number">{String(m.positions[i] + 1).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
        <p className="microcopy">Click a window to turn its thumbwheel.</p>
        <div className="setting-row">
          <label htmlFor="reflector">Reflector</label>
          <span className="select-wrap">
            <select
              id="reflector"
              value={m.config.reflector}
              disabled={m.busy}
              onChange={(e) =>
                m.updateConfig({ ...m.config, reflector: e.target.value as 'B' | 'C' })
              }
            >
              <option value="B">UKW B</option>
              <option value="C">UKW C</option>
            </select>
            <ChevronDown size={12} />
          </span>
        </div>
        <button
          className="disclosure"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <Settings2 size={13} />
          Ring & starting positions
          <ChevronDown size={13} className={expanded ? 'flipped' : ''} />
        </button>
        {expanded && (
          <div className="advanced-settings">
            {(['start', 'rings'] as const).map((kind) => (
              <div className="triple-setting" key={kind}>
                <span>{kind === 'start' ? 'Start · Grundstellung' : 'Ring · Ringstellung'}</span>
                <div>
                  {m.config[kind].map((value, i) => (
                    <select
                      key={i}
                      aria-label={`${['Left', 'Middle', 'Right'][i]} ${kind === 'start' ? 'starting position' : 'ring setting'}`}
                      disabled={m.busy}
                      value={value}
                      onChange={(e) => changeSetting(kind, i, Number(e.target.value))}
                    >
                      {[...ALPHABET].map((c, n) => (
                        <option key={c} value={n}>
                          {c} · {String(n + 1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            ))}
            <p className="microcopy">Changing settings starts a fresh transmission.</p>
          </div>
        )}
      </div>
      <div className="setting-group plug-group">
        <div className="section-label">
          Plugboard <span>{m.config.plugs.length} / 10 PAIRS</span>
        </div>
        <p className="setting-description">Connect two letters to exchange them.</p>
        <div className="plugboard-2d">
          {KEY_ROWS.map((row) => (
            <div className="plug-row" key={row}>
              {[...row].map((c) => {
                const pairIndex = m.config.plugs.findIndex((p) => p.includes(c));
                const paired = pairIndex >= 0;
                return (
                  <button
                    key={c}
                    title={
                      paired ? `Disconnect ${m.config.plugs[pairIndex].join('–')}` : `Connect ${c}`
                    }
                    aria-label={
                      paired
                        ? `Disconnect ${m.config.plugs[pairIndex].join('–')}`
                        : `Plug socket ${c}`
                    }
                    aria-pressed={selectedSocket === c}
                    disabled={m.busy}
                    className={`plug-socket ${paired ? 'connected' : ''} ${selectedSocket === c ? 'selected' : ''}`}
                    style={
                      paired
                        ? ({
                            '--pair-color': ['#c8a76b', '#82aa98', '#ad9dba', '#bba080', '#91a2ba'][
                              pairIndex % 5
                            ],
                          } as React.CSSProperties)
                        : undefined
                    }
                    onClick={() => onSocket(c)}
                  >
                    {c}
                    <i />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="plug-pairs">
          {m.config.plugs.map((pair) => (
            <button
              key={pair.join('')}
              onClick={() => onSocket(pair[0])}
              disabled={m.busy}
              aria-label={`Remove cable ${pair.join('–')}`}
            >
              {pair.join(' — ')}
              <X size={10} />
            </button>
          ))}
        </div>
        {selectedSocket && (
          <div className="patch-prompt">
            <span>{selectedSocket} selected. Choose its partner.</span>
            <button aria-label="Cancel cable" onClick={() => onSocket(selectedSocket)}>
              <X size={12} />
            </button>
          </div>
        )}
        <button
          className="text-button"
          disabled={!m.config.plugs.length || m.busy}
          onClick={() => m.updateConfig({ ...m.config, plugs: [] })}
        >
          <Unplug size={13} />
          Clear connections
        </button>
      </div>
      <div className="config-footer">
        <div>
          <i className="status-dot" />
          {m.busy ? 'PROCESSING MESSAGE' : 'CIRCUIT READY'}
        </div>
        <p>Enigma I · 3 rotors · 26 contacts</p>
        <button className="text-button" disabled={m.busy} onClick={m.reset}>
          <RotateCcw size={12} />
          Reset to {m.config.start.map(letter).join('')}
        </button>
      </div>
    </aside>
  );
}
