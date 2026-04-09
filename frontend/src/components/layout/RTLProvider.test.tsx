import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RTLProvider, useDirection } from './RTLProvider';

function DirectionDisplay() {
  const { dir, isRtl } = useDirection();
  return <div data-testid="display" data-dir={dir} data-is-rtl={String(isRtl)} />;
}

function DirectionButton() {
  const { dir, setDir } = useDirection();
  return (
    <button onClick={() => setDir(dir === 'ltr' ? 'rtl' : 'ltr')}>
      Toggle
    </button>
  );
}

describe('RTLProvider', () => {
  afterEach(() => {
    // Reset document direction after each test
    document.documentElement.dir = '';
  });

  it('provides ltr direction by default', () => {
    render(
      <RTLProvider>
        <DirectionDisplay />
      </RTLProvider>
    );
    expect(screen.getByTestId('display')).toHaveAttribute('data-dir', 'ltr');
    expect(screen.getByTestId('display')).toHaveAttribute('data-is-rtl', 'false');
  });

  it('provides rtl direction when defaultDir is rtl', () => {
    render(
      <RTLProvider defaultDir="rtl">
        <DirectionDisplay />
      </RTLProvider>
    );
    expect(screen.getByTestId('display')).toHaveAttribute('data-dir', 'rtl');
    expect(screen.getByTestId('display')).toHaveAttribute('data-is-rtl', 'true');
  });

  it('setDir updates direction', async () => {
    render(
      <RTLProvider>
        <DirectionDisplay />
        <DirectionButton />
      </RTLProvider>
    );
    expect(screen.getByTestId('display')).toHaveAttribute('data-dir', 'ltr');
    await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('display')).toHaveAttribute('data-dir', 'rtl');
  });

  it('setDir updates document.documentElement.dir', async () => {
    render(
      <RTLProvider>
        <DirectionButton />
      </RTLProvider>
    );
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('sets document.dir on mount from defaultDir', () => {
    render(<RTLProvider defaultDir="ltr"><div /></RTLProvider>);
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('useDirection returns ltr defaults outside provider', () => {
    render(<DirectionDisplay />);
    expect(screen.getByTestId('display')).toHaveAttribute('data-dir', 'ltr');
  });
});
