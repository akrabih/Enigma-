import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Activity,
  Aperture,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Disc3,
  Expand,
  Eye,
  EyeOff,
  FlaskConical,
  Focus,
  Keyboard,
  Layers3,
  Maximize2,
  MousePointer2,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import ConfigurationPanel from './components/ConfigurationPanel';
import SignalPanel, { Inspector } from './components/SignalPanel';
import LaboratoryPanel from './components/LaboratoryPanel';
import { ArchivePanel, ComponentsPanel } from './components/ArchivePanel';
import { useMachine } from './hooks/useMachine';
import type { ComponentId } from './engine/enigma';
import type { CameraView } from './scene/MachineScene';
import './styles.css';

const MachineScene = lazy(() => import('./scene/MachineScene'));
type Section = 'machine' | 'configuration' | 'signal' | 'components' | 'laboratory' | 'archive';
const sections = [
  { id: 'machine', label: 'Interactive machine', icon: Aperture },
  { id: 'configuration', label: 'Configuration', icon: Settings2 },
  { id: 'signal', label: 'Signal path', icon: Activity },
  { id: 'components', label: 'Components', icon: Layers3 },
  { id: 'laboratory', label: 'Laboratory', icon: FlaskConical },
  { id: 'archive', label: 'History', icon: BookOpen },
] as const;

function Guide({ close }: { close: () => void }) {
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>('button, a[href]');
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      before?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="icon-button modal-close" aria-label="Close field guide" onClick={close}>
          <X size={20} />
        </button>
        <span className="eyebrow">THE OPERATOR’S FIELD GUIDE</span>
        <h2 id="guide-title">Meet the machine.</h2>
        <p>Set the circuit. Press a key. Follow the current.</p>
        <div className="guide-items">
          <div>
            <MousePointer2 />
            <h3>Take a closer look</h3>
            <p>
              Drag to orbit, scroll or pinch to zoom. Right-drag or two-finger drag to pan. Click a
              physical component to inspect it.
            </p>
          </div>
          <div>
            <Keyboard />
            <h3>Send your first letter</h3>
            <p>
              Click a machine key or type A–Z on your keyboard. The rotors advance, the circuit is
              traced, and the output lamp lights.
            </p>
          </div>
          <div>
            <Disc3 />
            <h3>Make it your own</h3>
            <p>
              Change the rotor order, windows, rings and reflector. Connect plugboard letters in
              pairs. Settings changes clear the transmission.
            </p>
          </div>
          <div>
            <Activity />
            <h3>Watch it happen</h3>
            <p>
              Enable cutaway to see the circuit inside. Pause, select a stage, or step through it.
              Gold travels outward; green is the return.
            </p>
          </div>
        </div>
        <div className="guide-test">
          <span>TRY THE HISTORICAL CHECK</span>
          <p>
            I–II–III · UKW B · rings AAA · start AAA · no cables
            <br />
            <strong>AAAAA becomes BDZGO.</strong>
          </p>
        </div>
        <button className="primary-button" onClick={close}>
          Enter the cipher room
        </button>
      </section>
    </div>
  );
}

export default function App() {
  const m = useMachine();
  const [section, setSection] = useState<Section>('machine');
  const [expanded, setExpanded] = useState(false);
  const [lidOpen, setLidOpen] = useState(true);
  const [internal, setInternal] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [selected, setSelected] = useState<ComponentId | null>(null);
  const [selectedSocket, setSelectedSocket] = useState<string | null>(null);
  const [inspectAngle, setInspectAngle] = useState(0);
  const [view, setView] = useState<CameraView>('perspective');
  const [resetCamera, setResetCamera] = useState(0);
  const [guide, setGuide] = useState(false);
  const [labText, setLabText] = useState('HELLO WORLD');
  const [copied, setCopied] = useState(false);
  const [focus, setFocus] = useState(false);

  const navigate = (id: Section) => {
    setSection(id);
    if (id === 'configuration') setExpanded(true);
    if (id === 'signal' || id === 'components') {
      setInternal(true);
      setLidOpen(true);
    }
    if (id === 'machine') {
      setSelected(null);
    }
  };
  const inspect = (id: ComponentId) => {
    setSelected(id);
    setInspectAngle(0);
  };
  const onSocket = (c: string) => {
    if (m.busy) return;
    setSelected('plugboard');
    const pair = m.config.plugs.find((p) => p.includes(c));
    if (pair) {
      m.updateConfig({ ...m.config, plugs: m.config.plugs.filter((p) => p !== pair) });
      setSelectedSocket(null);
    } else if (selectedSocket === c) setSelectedSocket(null);
    else if (selectedSocket) {
      if (m.config.plugs.length >= 10) {
        m.setNotice('Ten pairs are already connected. Remove a cable first.');
        setSelectedSocket(null);
        return;
      }
      m.updateConfig({ ...m.config, plugs: [...m.config.plugs, [selectedSocket, c]] });
      setSelectedSocket(null);
    } else setSelectedSocket(c);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      m.setNotice('Clipboard access was unavailable. Select and copy the ciphertext below.');
    }
  };
  useEffect(() => {
    if (m.result) setLidOpen(true);
  }, [m.result]);
  useEffect(() => {
    setSelectedSocket(null);
  }, [m.config.rotors, m.config.start, m.config.rings, m.config.reflector]);

  return (
    <div className={`app ${focus ? 'focus-mode' : ''}`}>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          aria-label="Enigma cipher room home"
          onClick={(e) => {
            e.preventDefault();
            navigate('machine');
          }}
        >
          <span className="brand-mark">
            <Aperture size={29} strokeWidth={1.2} />
          </span>
          <span>
            ENIGMA<small>THE CIPHER ROOM</small>
          </span>
        </a>
        <div className="header-caption">
          AN INTERACTIVE STUDY IN SECRECY<span>Enigma I / Germany / 1930</span>
        </div>
        <button className="guide-button" onClick={() => setGuide(true)}>
          <CircleHelp size={16} />
          Field guide
        </button>
      </header>
      <nav className="main-nav" aria-label="Simulator sections">
        <div>
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <span className="nav-edition">
          VIRTUAL COLLECTION <span>№ 001</span>
        </span>
      </nav>
      <main className="workspace">
        {section === 'laboratory' ? (
          <LaboratoryPanel machine={m} text={labText} setText={setLabText} />
        ) : (
          <ConfigurationPanel
            machine={m}
            selectedSocket={selectedSocket}
            onSocket={onSocket}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        )}
        <section
          className="machine-viewport"
          aria-label="Interactive three-dimensional Enigma machine"
        >
          <div className="viewport-heading">
            <div>
              <span className="eyebrow">THE WEHRMACHT ENIGMA</span>
              <h1>
                Complexity,
                <br />
                <em>at your fingertips.</em>
              </h1>
            </div>
            <div className="model-badge">
              <span className="status-dot" />
              LIVE 3D MODEL
            </div>
          </div>
          <Suspense
            fallback={
              <div className="scene-loading">
                <span className="loading-ring" />
                Opening the cipher room…
              </div>
            }
          >
            <MachineScene
              machine={m}
              lidOpen={lidOpen}
              setLidOpen={setLidOpen}
              internal={internal}
              setInternal={setInternal}
              exploded={exploded}
              selected={selected}
              inspectAngle={inspectAngle}
              onInspect={inspect}
              selectedSocket={selectedSocket}
              onSocket={onSocket}
              view={view}
              resetCamera={resetCamera}
            />
          </Suspense>
          <div className="view-tools">
            <button
              className={internal ? 'selected' : ''}
              aria-pressed={internal}
              onClick={() => {
                setInternal(!internal);
                setLidOpen(true);
              }}
            >
              <ScanIcon active={internal} />
              <span>Cutaway</span>
            </button>
            <button
              className={exploded ? 'selected' : ''}
              aria-pressed={exploded}
              onClick={() => {
                setExploded(!exploded);
                setLidOpen(true);
              }}
            >
              <Layers3 size={15} />
              <span>Exploded</span>
            </button>
            <span className="tool-divider" />
            <button aria-pressed={!lidOpen} onClick={() => setLidOpen(!lidOpen)}>
              <Box size={15} />
              <span>{lidOpen ? 'Close lid' : 'Open lid'}</span>
            </button>
          </div>
          <div className="viewport-side-tools">
            <button
              className="icon-button"
              aria-label="Reset camera"
              title="Reset camera"
              onClick={() => {
                setView('perspective');
                setResetCamera((v) => v + 1);
              }}
            >
              <Focus size={17} />
            </button>
            <button
              className={`icon-button ${focus ? 'selected' : ''}`}
              aria-label={focus ? 'Show control panels' : 'Expand machine view'}
              title="Expand machine view"
              aria-pressed={focus}
              onClick={() => setFocus(!focus)}
            >
              {focus ? <Maximize2 size={16} /> : <Expand size={16} />}
            </button>
            <button
              className={`icon-button ${m.sound ? 'selected' : ''}`}
              aria-label={m.sound ? 'Mute key sound' : 'Enable key sound'}
              title="Mechanical key sound"
              aria-pressed={m.sound}
              onClick={() => m.setSound(!m.sound)}
            >
              {m.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
          <div className="viewport-bottom">
            <div className="camera-hint">
              <MousePointer2 size={13} />
              <span>DRAG TO ROTATE</span>
              <i />
              <span>SCROLL TO ZOOM</span>
            </div>
            <label className="camera-picker">
              <span className="sr-only">Camera view</span>
              <select
                aria-label="Camera view"
                value={view}
                onChange={(e) => setView(e.target.value as CameraView)}
              >
                <option value="perspective">Perspective view</option>
                <option value="front">Operator view</option>
                <option value="top">Overhead view</option>
                <option value="rear">Rear view</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
          {!m.input && (
            <div className="typing-hint">
              <Keyboard size={14} />
              <span>Press any letter to begin.</span>
              <kbd>A—Z</kbd>
            </div>
          )}
          {selectedSocket && (
            <div className="socket-hint">
              Socket {selectedSocket} selected · click a second socket
              <button aria-label="Cancel selected socket" onClick={() => setSelectedSocket(null)}>
                <X size={13} />
              </button>
            </div>
          )}
        </section>
        <aside className="right-panel panel">
          {selected && (
            <Inspector
              selected={selected}
              close={() => setSelected(null)}
              machine={m}
              exploded={exploded}
              inspectAngle={inspectAngle}
              setInspectAngle={setInspectAngle}
            />
          )}
          {section === 'archive' ? (
            <ArchivePanel />
          ) : section === 'components' ? (
            <ComponentsPanel selected={selected} onInspect={inspect} />
          ) : (
            <SignalPanel machine={m} />
          )}
        </aside>
      </main>
      <section className="transmission" aria-label="Live transmission">
        <div className="transmission-label">
          <Activity size={18} />
          <span>
            LIVE
            <br />
            TRANSMISSION
          </span>
          <button
            className="icon-button"
            aria-label="Reset transmission and initial rotor positions"
            title="Reset transmission"
            onClick={m.reset}
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="message-buffer">
          <div>
            <span>KEYBOARD INPUT</span>
            <span>{m.input.length} LETTERS</span>
          </div>
          <p aria-label="Keyboard input">
            {m.input.match(/.{1,5}/g)?.join(' ') || (
              <span className="buffer-placeholder">Your message begins here…</span>
            )}
          </p>
        </div>
        <div className="message-buffer ciphertext">
          <div>
            <span>LAMPBOARD OUTPUT</span>
            <button className="text-button" disabled={!m.output} onClick={copy}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <p aria-label="Ciphertext output" aria-live="polite">
            {m.output.match(/.{1,5}/g)?.join(' ') || (
              <span className="buffer-placeholder">Waiting for a keypress…</span>
            )}
          </p>
        </div>
        <div className="window-readout">
          <span>ROTOR WINDOWS</span>
          <strong>{m.windows.split('').join(' ')}</strong>
        </div>
      </section>
      <footer className="site-footer">
        <span>HISTORY, MADE TANGIBLE.</span>
        <p>A working reconstruction. Every wire tells a story.</p>
        <span>
          ENIGMA I <i /> ELECTROMECHANICAL CIPHER
        </span>
      </footer>
      {m.notice && (
        <div className="toast" role="status">
          <span>{m.notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => m.setNotice('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {guide && <Guide close={() => setGuide(false)} />}
    </div>
  );
}
function ScanIcon({ active }: { active: boolean }) {
  return active ? <Eye size={15} /> : <EyeOff size={15} />;
}
