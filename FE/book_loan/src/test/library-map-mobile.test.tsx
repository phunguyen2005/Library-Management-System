import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LibraryMapModal from '../components/LibraryMapModal';

class MockResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  disconnect() {}

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 370, height: 600 },
        } as ResizeObserverEntry,
      ],
      this,
    );
  }

  unobserve() {}
}

function ControlledMapModal() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Mở lại sơ đồ
      </button>
      <LibraryMapModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

describe('LibraryMapModal mobile experience', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
  });

  it('renders mobile tabs with auto-fit scaling and zoom controls', async () => {
    const user = userEvent.setup();
    render(<LibraryMapModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Bản đồ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Chú thích & Chi tiết' })).toHaveAttribute('aria-selected', 'false');

    const mapShell = await screen.findByTestId('library-map-shell');
    const blueprint = screen.getByTestId('library-map-blueprint');

    await waitFor(() => {
      expect(mapShell).toHaveStyle({ width: '370px', height: '340px' });
      expect(blueprint).toHaveStyle({ transform: 'scale(0.5)' });
    });
    expect(screen.getByText('50%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kích thước gốc 100%' }));
    expect(blueprint).toHaveStyle({ transform: 'scale(1)' });
    expect(screen.getByText('100%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vừa màn hình' }));
    await waitFor(() => {
      expect(blueprint).toHaveStyle({ transform: 'scale(0.5)' });
    });
  });

  it('selects zones by tap, shows the mobile detail sheet, and resets after close', async () => {
    const user = userEvent.setup();
    render(<ControlledMapModal />);

    await user.click(screen.getByRole('button', { name: /Chọn kệ A1/i }));

    const sheet = screen.getByTestId('mobile-zone-sheet');
    expect(within(sheet).getByText('Kệ Sách A1')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Xem chi tiết & Chú giải' })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Xem chi tiết & Chú giải' }));
    expect(screen.getByRole('tab', { name: 'Chú thích & Chi tiết' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('complementary', { name: 'Chi tiết khu vực' })).toHaveTextContent('Kệ Sách A1');

    await user.click(screen.getByRole('button', { name: 'Đóng sơ đồ' }));
    expect(screen.queryByRole('dialog', { name: 'Sơ đồ bố trí Thư viện' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mở lại sơ đồ' }));
    expect(screen.getByRole('tab', { name: 'Bản đồ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('mobile-zone-sheet')).not.toBeInTheDocument();
  });
});
