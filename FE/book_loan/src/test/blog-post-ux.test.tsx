import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BlogCard from '../components/BlogCard';
import i18n from '../i18n';
import type { BlogPostRecord } from '../api/blogApi';
import BlogPost from '../pages/public/BlogPost';
import { ThemeProvider } from '../theme/ThemeContext';

const { fetchBlogPostMock, fetchBlogPostsMock } = vi.hoisted(() => ({
  fetchBlogPostMock: vi.fn(),
  fetchBlogPostsMock: vi.fn(),
}));

vi.mock('../api/blogApi', async () => {
  const actual = await vi.importActual<typeof import('../api/blogApi')>('../api/blogApi');

  return {
    ...actual,
    fetchBlogPost: (...args: unknown[]) => fetchBlogPostMock(...args),
    fetchBlogPosts: (...args: unknown[]) => fetchBlogPostsMock(...args),
  };
});

const longArticle = Array.from({ length: 520 }, (_, index) => `word${index}`).join(' ');

const basePost: BlogPostRecord = {
  id: 1,
  title: 'How to use the digital library well',
  slug: 'digital-library-guide',
  excerpt: 'A concise guide for finding resources, saving time, and building better study habits.',
  content: `<h2>Start with your research goal</h2><p>${longArticle}</p><h2>Save useful material</h2><p>Keep references organized.</p>`,
  cover_image: 'https://example.com/library-cover.jpg',
  category: 'guide',
  status: 'published',
  is_pinned: true,
  views: 1280,
  published_at: '2026-05-28T08:00:00Z',
  created_at: '2026-05-28T08:00:00Z',
  updated_at: '2026-05-28T08:00:00Z',
  author: {
    librarian_id: 9,
    name: 'HCMUE Library',
  },
};

function renderBlogPost(path = '/blog/digital-library-guide') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/blog" element={<div>Blog index</div>} />
          <Route path="/" element={<div>Landing page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('blog post editorial UX', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    fetchBlogPostMock.mockResolvedValue(basePost);
    fetchBlogPostsMock.mockResolvedValue({ data: [{ ...basePost, id: 2, slug: 'related-guide' }], meta: { total: 1 } });
  });

  it('labels pinned cards as featured while still showing the category', async () => {
    render(
      <MemoryRouter>
        <BlogCard post={basePost} />
      </MemoryRouter>,
    );

    const card = screen.getByRole('link', { name: /How to use the digital library well/i });

    expect(within(card).getByText('Featured')).toBeInTheDocument();
    expect(within(card).getByText('Guide')).toBeInTheDocument();
  });

  it('shows professional post context and lets readers copy the article link', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderBlogPost();

    expect(await screen.findByRole('heading', { level: 1, name: 'How to use the digital library well' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
    expect(screen.getAllByText('3 min read').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,280 views').length).toBeGreaterThan(0);
    expect(screen.getAllByText(basePost.excerpt as string).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'In this article' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('http://localhost:3000/blog/digital-library-guide'));
    expect(screen.getByText('Link copied')).toBeInTheDocument();
  });
});
