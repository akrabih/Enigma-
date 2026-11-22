// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// These integration tests exercise the real controls and controller. A DOM
// environment cannot render WebGL, so the Canvas surface alone is substituted.
vi.mock('./scene/MachineScene', () => ({
  default: () => <div aria-label="WebGL scene test substitute" />,
}));
import App from './App';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function openApp() {
  render(<App />);
  await act(async () => {});
}
function finishMessage() {
  for (let i = 0; i < 170 && document.querySelector('progress'); i++)
    act(() => {
      vi.advanceTimersByTime(400);
    });
}
const ciphertext = () =>
  screen.getByLabelText('Ciphertext output').textContent?.split(' ').join('');

describe('operator controls connected to the cipher', () => {
  it('connects and removes real plug pairs from the socket controls', async () => {
    await openApp();
    fireEvent.click(screen.getByRole('button', { name: 'Plug socket A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plug socket C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plug socket B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plug socket Z' }));
    fireEvent.keyDown(document.body, { key: 'c' });
    expect(ciphertext()).toBe('Z');
    expect(screen.getByRole('button', { name: 'Remove cable A–C' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove cable A–C' }));
    expect(screen.queryByRole('button', { name: 'Remove cable A–C' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Plug socket A' })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'a' });
    expect(ciphertext()).toBe('Z'); // remaining B–Z cable patches unsteckered A → B → Z
  });

  it('selects an electrical stage and steps it without enciphering another letter', async () => {
    await openApp();
    fireEvent.keyDown(document.body, { key: 'a' });
    const reflector = screen.getByRole('button', { name: 'Inspect stage 7: Reflector B' });
    fireEvent.click(reflector);
    expect(reflector.getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('button', { name: 'Play signal animation' })).toBeTruthy();
    expect(ciphertext()).toBe('B');
    fireEvent.click(screen.getByRole('button', { name: 'Step through one signal stage' }));
    expect(
      screen.getByRole('button', { name: 'Inspect stage 8: Rotor I' }).getAttribute('aria-current'),
    ).toBe('step');
    expect(ciphertext()).toBe('B');
  });

  it('runs and decrypts a message through the laboratory controls', async () => {
    await openApp();
    fireEvent.click(screen.getByRole('button', { name: 'Laboratory' }));
    fireEvent.change(screen.getByLabelText(/YOUR MESSAGE/), { target: { value: 'HELLO WORLD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run message' }));
    finishMessage();
    expect(ciphertext()).toBe('ILBDAAMTAZ');
    fireEvent.click(screen.getByRole('button', { name: 'Decrypt current output' }));
    finishMessage();
    expect(ciphertext()).toBe('HELLOWORLD');
    fireEvent.click(screen.getByRole('button', { name: 'Reset transmission' }));
    expect(screen.getByLabelText('Ciphertext output').textContent).toContain(
      'Waiting for a keypress',
    );
  }, 15000);
});
