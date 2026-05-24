import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Digital from '../pages/student/Digital';

const { fetchDigitalDocumentsMock, fetchReadingProgressMock } = vi.hoisted(() => ({
  fetchDigitalDocumentsMock: vi.fn(),
  fetchReadingProgressMock: vi.fn(),
}));

vi.mock('../api/bookApi', () => ({
  fetchDigitalDocuments: () => fetchDigitalDocumentsMock(),
}));

vi.mock('../api/readingProgressApi', () => ({
  fetchReadingProgress: () => fetchReadingProgressMock(),
}));

describe('Digital page', () => {
  it('renders digital documents with open and download actions', async () => {
    fetchDigitalDocumentsMock.mockResolvedValueOnce([
      {
        id: 42,
        title: 'Digital Lesson',
        author: 'Library Admin',
        type: 'Lecture',
        format: 'PDF',
        size: '10 KB',
        color: 'bg-red-500',
        cover: null,
        downloads: 3,
        openUrl: 'https://example.com/open',
        downloadUrl: 'https://example.com/download',
        hasAttachedFile: true,
      },
    ]);
    fetchReadingProgressMock.mockResolvedValueOnce([]);

    render(<Digital />);

    await waitFor(() => expect(fetchDigitalDocumentsMock).toHaveBeenCalled());
    expect(await screen.findByText('Digital Lesson')).toBeInTheDocument();
    expect(screen.getByText('Library Admin')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ disabled: false }),
        expect.objectContaining({ disabled: false }),
      ]),
    );
  });
});
