import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge, { DataStatusBadge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

describe('DataStatusBadge', () => {
  it('labels live data', () => {
    render(<DataStatusBadge status="live" />);
    expect(screen.getByText(/live data/i)).toBeInTheDocument();
  });
  it('labels estimates', () => {
    render(<DataStatusBadge status="estimate" />);
    expect(screen.getByText(/estimate/i)).toBeInTheDocument();
  });
  it('labels curated recommendations', () => {
    render(<DataStatusBadge status="curated" />);
    expect(screen.getByText(/curated/i)).toBeInTheDocument();
  });
  it('falls back to an estimate label instead of a raw unavailable error', () => {
    render(<DataStatusBadge status="unavailable" />);
    expect(screen.getByText(/estimate/i)).toBeInTheDocument();
    expect(screen.queryByText(/live data unavailable/i)).not.toBeInTheDocument();
  });
});
