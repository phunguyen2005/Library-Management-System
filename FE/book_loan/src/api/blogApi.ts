import { apiRequest } from './client';
import type { PaginatedResponse } from '../types/pagination';

export type BlogAuthor = {
  librarian_id: number;
  name: string;
  email?: string | null;
};

export type BlogPostRecord = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  cover_image?: string | null;
  category: string;
  status: 'draft' | 'published' | 'archived';
  is_pinned: boolean;
  views: number;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  author?: BlogAuthor | null;
};

export type BlogFilters = {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
  status?: string;
  pinned?: boolean;
};

export type BlogPostPayload = {
  title: string;
  excerpt?: string;
  content: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  is_pinned: boolean;
  cover_image?: string;
  cover_image_file?: File | null;
  generate_excerpt?: boolean;
};

function buildQuery(filters: BlogFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

function toFormData(payload: BlogPostPayload) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('content', payload.content);
  formData.append('category', payload.category);
  formData.append('status', payload.status);
  formData.append('is_pinned', payload.is_pinned ? '1' : '0');
  formData.append('generate_excerpt', payload.generate_excerpt ? '1' : '0');

  if (payload.excerpt !== undefined) {
    formData.append('excerpt', payload.excerpt);
  }

  if (payload.cover_image) {
    formData.append('cover_image', payload.cover_image);
  }

  if (payload.cover_image_file) {
    formData.append('cover_image_file', payload.cover_image_file);
  }

  return formData;
}

export function fetchBlogPosts(filters: BlogFilters = {}) {
  return apiRequest<PaginatedResponse<BlogPostRecord>>(`/blog/posts${buildQuery(filters)}`, {
    auth: false,
  });
}

export function fetchBlogPost(slug: string) {
  return apiRequest<BlogPostRecord>(`/blog/posts/${encodeURIComponent(slug)}`, {
    auth: false,
  });
}

export function fetchAdminBlogPosts(filters: BlogFilters = {}) {
  return apiRequest<PaginatedResponse<BlogPostRecord>>(`/admin/blog/posts${buildQuery(filters)}`);
}

export function createBlogPost(payload: BlogPostPayload) {
  return apiRequest<BlogPostRecord>('/admin/blog/posts', {
    method: 'POST',
    body: toFormData(payload),
  });
}

export function updateBlogPost(postId: number, payload: BlogPostPayload) {
  return apiRequest<BlogPostRecord>(`/admin/blog/posts/${postId}`, {
    method: 'POST',
    body: toFormData(payload),
  });
}

export function deleteBlogPost(postId: number) {
  return apiRequest<{ message: string }>(`/admin/blog/posts/${postId}`, {
    method: 'DELETE',
  });
}

export function publishBlogPost(postId: number, published: boolean) {
  return apiRequest<BlogPostRecord>(`/admin/blog/posts/${postId}/publish`, {
    method: 'POST',
    body: { published },
  });
}

export function pinBlogPost(postId: number, isPinned: boolean) {
  return apiRequest<BlogPostRecord>(`/admin/blog/posts/${postId}/pin`, {
    method: 'POST',
    body: { is_pinned: isPinned },
  });
}

export function generateBlogExcerpt(postId: number) {
  return apiRequest<BlogPostRecord>(`/admin/blog/posts/${postId}/generate-excerpt`, {
    method: 'POST',
  });
}
