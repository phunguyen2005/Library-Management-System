import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Digital from '../pages/student/Digital';

const { authState, emitToastMock, fetchDigitalDocumentsMock, fetchReadingProgressMock } = vi.hoisted(() => ({
  authState: {
    user: { id: 1, level: 5 },
    role: 'student',
  },
  emitToastMock: vi.fn(),
  fetchDigitalDocumentsMock: vi.fn(),
  fetchReadingProgressMock: vi.fn(),
}));

vi.mock('../api/bookApi', () => ({
  fetchDigitalDocuments: () => fetchDigitalDocumentsMock(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../api/readingProgressApi', () => ({
  fetchReadingProgress: () => fetchReadingProgressMock(),
}));

vi.mock('../notifications/events', () => ({
  emitToast: (...args: unknown[]) => emitToastMock(...args),
}));

vi.mock('../api/favoriteApi', () => ({
  fetchFavoriteBooks: vi.fn(async () => []),
  addFavoriteBook: vi.fn(),
  removeFavoriteBook: vi.fn(),
}));

describe('Digital page', () => {
  beforeEach(() => {
    authState.user = { id: 1, level: 5 };
    authState.role = 'student';
    emitToastMock.mockReset();
    fetchDigitalDocumentsMock.mockReset();
    fetchReadingProgressMock.mockReset();
  });

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

    render(
      <MemoryRouter>
        <Digital />
      </MemoryRouter>,
    );

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

  it('hides AI tags for audio documents', async () => {
    fetchDigitalDocumentsMock.mockResolvedValueOnce([
      {
        id: 43,
        title: 'Audio Lesson',
        author: 'Library Admin',
        type: 'Audio Book',
        format: 'AUDIO',
        size: '10 KB',
        color: 'bg-purple-500',
        cover: null,
        downloads: 0,
        openUrl: 'https://example.com/audio',
        downloadUrl: 'https://example.com/audio-download',
        hasAttachedFile: true,
        aiSummary: 'Legacy audio summary should be hidden',
        aiTags: ['legacy-audio'],
      },
    ]);
    fetchReadingProgressMock.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Digital />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Audio Lesson')).toBeInTheDocument();
    expect(screen.queryByText('legacy-audio')).not.toBeInTheDocument();
  });

  it('blocks document downloads for students below level five', async () => {
    authState.user = { id: 1, level: 4 };
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
    fetchDigitalDocumentsMock.mockResolvedValueOnce([
      {
        id: 44,
        title: 'Restricted Digital Lesson',
        author: 'Library Admin',
        type: 'Lecture',
        format: 'PDF',
        size: '10 KB',
        color: 'bg-red-500',
        cover: null,
        downloads: 0,
        openUrl: 'https://example.com/open',
        downloadUrl: 'https://example.com/download',
        hasAttachedFile: true,
      },
    ]);
    fetchReadingProgressMock.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Digital />
      </MemoryRouter>,
    );

    const title = await screen.findByText('Restricted Digital Lesson');
    const card = title.closest('.group');
    expect(card).not.toBeNull();

    const cardButtons = within(card as HTMLElement).getAllByRole('button');
    fireEvent.click(cardButtons[cardButtons.length - 1]);

    expect(emitToastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: 'warning' }));
    expect(openMock).not.toHaveBeenCalled();

    openMock.mockRestore();
  });
});
