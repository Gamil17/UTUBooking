import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<Input placeholder="Search hotels…" />);
    expect(screen.getByPlaceholderText('Search hotels…')).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    render(<Input helperText="We will send your confirmation here." />);
    expect(screen.getByText('We will send your confirmation here.')).toBeInTheDocument();
  });

  it('shows error message and sets aria-invalid', () => {
    render(<Input error="This field is required." />);
    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('This field is required.');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('hides helper text when error is shown', () => {
    render(<Input helperText="Helper" error="Error" />);
    expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts user input', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Makkah');
    expect(input).toHaveValue('Makkah');
  });

  it('calls onChange handler', async () => {
    const handler = vi.fn();
    render(<Input onChange={handler} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(handler).toHaveBeenCalled();
  });

  it('renders left icon slot', () => {
    render(<Input leftIcon={<span data-testid="left-icon" />} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon slot', () => {
    render(<Input rightIcon={<span data-testid="right-icon" />} />);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('label is associated with input via htmlFor', () => {
    render(<Input label="Destination" id="dest" />);
    const label = screen.getByText('Destination');
    expect(label).toHaveAttribute('for', 'dest');
  });

  it('error message is linked to input via aria-describedby', () => {
    render(<Input id="phone" error="Invalid number" />);
    const input = screen.getByRole('textbox');
    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent('Invalid number');
  });
});
