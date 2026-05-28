import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BlogManagement from '../pages/admin/BlogManagement';
import type { BlogPostRecord } from '../api/blogApi';

const fetchAdminBlogPostsMock = vi.fn();

vi.mock('../api/blogApi', () => ({
  fetchAdminBlogPosts: (...args: unknown[]) => fetchAdminBlogPostsMock(...args),
  deleteBlogPost: vi.fn(),
  pinBlogPost: vi.fn(),
  publishBlogPost: vi.fn(),
}));

const samplePost: BlogPostRecord = {
  id: 7,
  title: 'Huong dan su dung thu vien so',
  slug: 'huong-dan-su-dung-thu-vien-so',
  excerpt: 'Cac buoc khai thac tai nguyen hoc tap truc tuyen.',
  content: '<p>Noi dung</p>',
  cover_image: null,
  category: 'guide',
  status: 'draft',
  is_pinned: false,
  views: 12,
  published_at: null,
  created_at: '2026-05-28T08:00:00Z',
  updated_at: '2026-05-28T08:00:00Z',
  author: {
    librarian_id: 1,
    name: 'HCMUE Library',
  },
};

function renderBlogManagement() {
  fetchAdminBlogPostsMock.mockResolvedValue({
    data: [samplePost],
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 1,
    },
  });

  return render(
    <MemoryRouter initialEntries={['/admin/blog']}>
      <BlogManagement />
    </MemoryRouter>,
  );
}

describe('BlogManagement theme styling', () => {
  it('uses semantic theme colors for the management filters and table text', async () => {
    document.documentElement.classList.add('dark');
    const { container } = renderBlogManagement();

    expect(await screen.findByText(samplePost.title)).toBeInTheDocument();

    const searchInput = container.querySelector('input[type="search"]');
    expect(searchInput).toHaveClass('bg-surface-bright', 'text-on-surface', 'border-surface-container-high');

    const tableHeader = container.querySelector('thead tr');
    expect(tableHeader).toHaveClass('bg-surface-container-low', 'text-on-surface-variant');

    const postTitle = screen.getByText(samplePost.title);
    expect(postTitle).toHaveClass('text-on-surface');

    const postExcerpt = screen.getByText(samplePost.excerpt as string);
    expect(postExcerpt).toHaveClass('text-on-surface-variant');
  });
});
