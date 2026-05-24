import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmptyState from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders an accessible empty or error message with an optional action', () => {
    render(
      <EmptyState
        icon="info"
        title="No records"
        message="Try changing the filters."
        action={<button type="button">Reload</button>}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No records');
    expect(screen.getByRole('status')).toHaveTextContent('Try changing the filters.');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });
});
