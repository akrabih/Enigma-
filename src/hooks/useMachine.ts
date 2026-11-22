import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_CONFIG,
  letter,
  normalize,
  pressKey,
  validateConfiguration,
} from '../engine/enigma';
import type { Configuration, LetterResult, Triple } from '../engine/enigma';

export function useMachine() {
  const [config, setConfig] = useState<Configuration>(structuredClone(DEFAULT_CONFIG));
  const [positions, setPositions] = useState<Triple<number>>([0, 0, 0]);
  const positionsRef = useRef<Triple<number>>([0, 0, 0]);
  const configRef = useRef(config);
  const [result, setResult] = useState<LetterResult | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [pressed, setPressed] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [queue, setQueue] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [sound, setSound] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const tick = useCallback(() => {
    if (!sound) return;
    try {
      const audio = (audioRef.current ??= new AudioContext());
      void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(160, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(45, audio.currentTime + 0.045);
      gain.gain.setValueAtTime(0.12, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.055);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.06);
    } catch {
      setSound(false);
    }
  }, [sound]);

  const operate = useCallback(
    (key: string) => {
      const next = pressKey(configRef.current, positionsRef.current, key);
      positionsRef.current = next.positions;
      setPositions(next.positions);
      setResult(next);
      setInput((v) => v + key);
      setOutput((v) => v + next.output);
      setStage(0);
      setPlaying(true);
      setPressed(key);
      clearTimeout(keyTimer.current);
      keyTimer.current = setTimeout(() => setPressed(null), 150);
      tick();
    },
    [tick],
  );

  const press = useCallback(
    (key: string) => {
      if (busyRef.current || !/^[A-Z]$/.test(key)) return;
      operate(key);
    },
    [operate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat ||
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      )
        return;
      if (/^[a-z]$/i.test(e.key)) {
        e.preventDefault();
        press(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  useEffect(() => {
    if (!result || !playing) return;
    const delay = slow ? 380 : busy ? 32 : 105;
    const timer = setTimeout(
      () => {
        if (stage < 12) setStage((v) => v + 1);
        else if (busy && queue) {
          operate(queue[0]);
          setQueue(queue.slice(1));
        } else {
          setPlaying(false);
          setBusy(false);
          busyRef.current = false;
        }
      },
      stage < 12 ? delay : busy ? 100 : 400,
    );
    return () => clearTimeout(timer);
  }, [result, playing, stage, slow, busy, queue, operate]);

  useEffect(
    () => () => {
      clearTimeout(keyTimer.current);
      if (audioRef.current) void audioRef.current.close();
    },
    [],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const clearSession = useCallback((start: Triple<number>) => {
    positionsRef.current = [...start];
    setPositions([...start]);
    setResult(null);
    setInput('');
    setOutput('');
    setPressed(null);
    setQueue('');
    setBusy(false);
    busyRef.current = false;
    setPlaying(false);
    setStage(0);
  }, []);

  const updateConfig = useCallback(
    (next: Configuration) => {
      if (busyRef.current) return;
      try {
        validateConfiguration(next);
        configRef.current = next;
        setConfig(next);
        clearSession(next.start);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Invalid machine settings.');
      }
    },
    [clearSession],
  );

  const adjustRotor = useCallback(
    (i: number, delta = 1) => {
      const start = [...positionsRef.current] as Triple<number>;
      start[i] = (start[i] + delta + 26) % 26;
      updateConfig({ ...configRef.current, start });
    },
    [updateConfig],
  );

  const runMessage = useCallback(
    (text: string) => {
      const clean = normalize(text);
      if (!clean) {
        setNotice('Enter at least one letter from A to Z.');
        return;
      }
      if (clean.length > 2000) {
        setNotice(
          'Messages can contain at most 2,000 letters. Shorten the message before running it.',
        );
        return;
      }
      clearSession(configRef.current.start);
      busyRef.current = true;
      setBusy(true);
      setQueue(clean.slice(1));
      operate(clean[0]);
    },
    [clearSession, operate],
  );

  const stop = useCallback(() => {
    setQueue('');
    setBusy(false);
    busyRef.current = false;
    setPlaying(false);
  }, []);

  const reset = useCallback(() => clearSession(configRef.current.start), [clearSession]);
  const seek = useCallback((i: number) => {
    setPlaying(false);
    setStage(Math.max(0, Math.min(12, i)));
  }, []);
  const togglePlayback = useCallback(() => {
    if (!result) return;
    if (stage === 12 && !playing) setStage(0);
    setPlaying((v) => !v);
  }, [result, stage, playing]);

  return {
    config,
    positions,
    result,
    input,
    output,
    pressed,
    stage,
    playing,
    slow,
    setSlow,
    busy,
    queue,
    notice,
    setNotice,
    sound,
    setSound,
    press,
    updateConfig,
    adjustRotor,
    runMessage,
    reset,
    stop,
    seek,
    togglePlayback,
    windows: positions.map(letter).join(''),
  };
}
export type MachineController = ReturnType<typeof useMachine>;
