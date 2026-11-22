// @vitest-environment happy-dom
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../engine/enigma';
import { useMachine } from './useMachine';
import type { MachineController } from './useMachine';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function finishPlayback(controller: { current: MachineController }, maxTicks = 100) {
  for (let i = 0; i < maxTicks && (controller.current.playing || controller.current.busy); i++) {
    act(() => {
      vi.advanceTimersByTime(400);
    });
  }
}

describe('shared machine controller', () => {
  it('rejects oversized messages without truncating or clearing the current transmission', () => {
    const { result } = renderHook(useMachine);
    act(() => result.current.press('A'));
    act(() => result.current.runMessage('A'.repeat(2001)));
    expect(result.current.output).toBe('B');
    expect(result.current.busy).toBe(false);
    expect(result.current.notice).toContain('2,000');
  });
  it('accepts rapid keypresses without losing rotor steps or output letters', () => {
    const { result } = renderHook(useMachine);
    act(() => {
      for (let i = 0; i < 5; i++) result.current.press('A');
    });
    expect(result.current.input).toBe('AAAAA');
    expect(result.current.output).toBe('BDZGO');
    expect(result.current.windows).toBe('AAF');
    expect(result.current.result?.output).toBe('O');
    expect(result.current.result?.positions).toEqual(result.current.positions);
    finishPlayback(result);
    expect(result.current.stage).toBe(12);
    expect(result.current.pressed).toBeNull();
  });

  it('physical keyboard shares the same circuit and ignores editable fields and shortcuts', () => {
    const { result } = renderHook(useMachine);
    fireEvent.keyDown(document.body, { key: 'a' });
    expect(result.current.output).toBe('B');
    const textarea = document.createElement('textarea');
    document.body.append(textarea);
    fireEvent.keyDown(textarea, { key: 'a' });
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'a', repeat: true });
    fireEvent.keyDown(document.body, { key: '7' });
    expect(result.current.output).toBe('B');
    textarea.remove();
  });

  it('steps the visualization without advancing the actual machine again', () => {
    const { result } = renderHook(useMachine);
    act(() => result.current.press('A'));
    act(() => result.current.seek(6));
    expect(result.current.stage).toBe(6);
    expect(result.current.playing).toBe(false);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.stage).toBe(6);
    expect(result.current.windows).toBe('AAB');
    expect(result.current.output).toBe('B');
    act(() => result.current.togglePlayback());
    finishPlayback(result);
    expect(result.current.stage).toBe(12);
    expect(result.current.output).toBe('B');
    act(() => result.current.seek(0));
    expect(result.current.windows).toBe('AAB');
  });

  it('processes the laboratory queue sequentially, pauses it, and blocks interleaved keys', () => {
    const { result } = renderHook(useMachine);
    act(() => result.current.runMessage('AA AA! A'));
    expect(result.current.busy).toBe(true);
    expect(result.current.output).toBe('B');
    act(() => result.current.press('Z'));
    act(() => result.current.togglePlayback());
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.input).toBe('A');
    expect(result.current.stage).toBe(0);
    expect(result.current.queue).toBe('AAAA');
    act(() => result.current.togglePlayback());
    finishPlayback(result);
    expect(result.current.output).toBe('BDZGO');
    expect(result.current.input).toBe('AAAAA');
    expect(result.current.windows).toBe('AAF');
    expect(result.current.busy).toBe(false);
  });

  it('decrypts a completed laboratory run from its original windows', () => {
    const { result } = renderHook(useMachine);
    act(() => result.current.runMessage('HELLO WORLD'));
    finishPlayback(result, 160);
    expect(result.current.output).toBe('ILBDAAMTAZ');
    expect(result.current.windows).toBe('AAK');
    const ciphertext = result.current.output;
    act(() => result.current.runMessage(ciphertext));
    expect(result.current.windows).toBe('AAB');
    finishPlayback(result, 160);
    expect(result.current.output).toBe('HELLOWORLD');
  });

  it('cancels a queued run on reset and preserves the selected configuration', () => {
    const { result } = renderHook(useMachine);
    act(() =>
      result.current.updateConfig({
        ...structuredClone(DEFAULT_CONFIG),
        start: [2, 3, 4],
        rings: [5, 6, 7],
        plugs: [['A', 'Z']],
      }),
    );
    act(() => result.current.runMessage('HELLOWORLD'));
    act(() => result.current.reset());
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.windows).toBe('CDE');
    expect(result.current.output).toBe('');
    expect(result.current.result).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(result.current.config.rings).toEqual([5, 6, 7]);
    expect(result.current.config.plugs).toEqual([['A', 'Z']]);
  });

  it('new plugboard settings clear the transmission and immediately change the circuit', () => {
    const { result } = renderHook(useMachine);
    act(() => result.current.press('A'));
    act(() =>
      result.current.updateConfig({
        ...structuredClone(DEFAULT_CONFIG),
        plugs: [
          ['A', 'C'],
          ['B', 'Z'],
        ],
      }),
    );
    expect(result.current.output).toBe('');
    expect(result.current.windows).toBe('AAA');
    act(() => result.current.press('C'));
    expect(result.current.output).toBe('Z');
    expect(result.current.result?.stages[1].output).toBe('A');
    expect(result.current.result?.stages[11].input).toBe('B');
  });

  it('manual adjustment becomes the new reset position without enciphering a letter', () => {
    const { result } = renderHook(useMachine);
    act(() => result.current.press('A'));
    act(() => result.current.adjustRotor(2));
    expect(result.current.windows).toBe('AAC');
    expect(result.current.config.start).toEqual([0, 0, 2]);
    expect(result.current.output).toBe('');
    act(() => result.current.press('A'));
    expect(result.current.output).toBe('Z');
    act(() => result.current.reset());
    expect(result.current.windows).toBe('AAC');
  });
});
