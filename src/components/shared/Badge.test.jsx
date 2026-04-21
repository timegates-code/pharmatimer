import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from './Badge.jsx';
import { TapBadge } from './TapBadge.jsx';

describe('Badge', () => {
  it('renders the label and applies the provided style tokens', () => {
    render(<Badge label="3 presi" bg="#DCFCE7" text="#14532D" border="#22C55E" />);
    const el = screen.getByText('3 presi');
    expect(el).toBeInTheDocument();
    // `toHaveStyle` normalises colours; verify one explicit inline value
    // rather than asserting the full string to keep the test robust.
    expect(el.style.background).toBe('rgb(220, 252, 231)');
  });
});

describe('TapBadge', () => {
  it('fires onClick when the button is pressed', () => {
    const onClick = vi.fn();
    render(<TapBadge label="tap me" bg="#fff" text="#000" border="#ccc" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the provided icon slot', () => {
    render(
      <TapBadge
        label="with icon"
        bg="#fff"
        text="#000"
        border="#ccc"
        icon={<span data-testid="ic">★</span>}
        onClick={() => {}}
      />
    );
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });
});
