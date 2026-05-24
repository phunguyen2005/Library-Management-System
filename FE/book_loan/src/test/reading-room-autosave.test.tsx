import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReadingRoom from '../components/ReadingRoom';
import type { DigitalDocument } from '../types/book';

const { syncReadingProgressMock } = vi.hoisted(() => ({
  syncReadingProgressMock: vi.fn(),
}));

vi.mock('../api/readingProgressApi', () => ({
  syncReadingProgress: (...args: unknown[]) => syncReadingProgressMock(...args),
}));

vi.mock('../notifications/events', () => ({
  emitToast: vi.fn(),
}));

const pdfDocument: DigitalDocument = {
  id: 42,
  title: 'Digital Lesson',
  author: 'Library Admin',
  type: 'Lecture',
  format: 'PDF',
  size: '10 KB',
  color: 'bg-red-500',
  cover: null,
  downloads: 3,
  openUrl: 'https://example.com/open.pdf',
  downloadUrl: 'https://example.com/download.pdf',
  hasAttachedFile: true,
  readingProgress: {
    progress_id: 7,
    book_id: 42,
    member_id: 1,
    current_page: 2,
    total_pages: 20,
    progress_percent: 10,
    last_read_at: '2026-05-23T00:00:00Z',
    updated_at: '2026-05-23T00:00:00Z',
  },
};

describe('ReadingRoom auto-save progress', () => {
  it('hides the manual save button and saves when the page changes', async () => {
    syncReadingProgressMock.mockResolvedValueOnce({
      ...pdfDocument.readingProgress,
      current_page: 7,
      progress_percent: 35,
    });

    const onProgressSaved = vi.fn();
    render(
      <ReadingRoom
        document={pdfDocument}
        onClose={vi.fn()}
        onProgressSaved={onProgressSaved}
      />,
    );

    expect(screen.queryByRole('button', { name: /lưu tiến độ/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Trang'), { target: { value: '7' } });

    await waitFor(() => {
      expect(syncReadingProgressMock).toHaveBeenCalledWith(42, {
        current_page: 7,
        total_pages: 20,
      });
    });
    expect(onProgressSaved).toHaveBeenCalledWith(
      expect.objectContaining({ book_id: 42, current_page: 7 }),
    );
  });
});
