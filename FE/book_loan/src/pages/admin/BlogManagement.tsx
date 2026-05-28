import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  deleteBlogPost,
  fetchAdminBlogPosts,
  pinBlogPost,
  publishBlogPost,
  type BlogPostRecord,
} from '../../api/blogApi';
import BlogEditor from './BlogEditor';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { BLOG_CATEGORY_OPTIONS, getBlogCategoryMeta } from '../../lib/blog';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { useDebounce } from '../../hooks/useDebounce';
import { emitToast } from '../../notifications/events';

type EditorState = {
  isOpen: boolean;
  post: BlogPostRecord | null;
};

const STATUS_LABELS: Record<BlogPostRecord['status'], string> = {
  draft: 'Nháp',
  published: 'Đã xuất bản',
  archived: 'Lưu trữ',
};

export default function BlogManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [editorState, setEditorState] = useState<EditorState>({ isOpen: false, post: null });
  const [postToDelete, setPostToDelete] = useState<BlogPostRecord | null>(null);

  const currentPage = Number(searchParams.get('page') || '1');
  const query = searchParams.get('query') || '';
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const debouncedQuery = useDebounce(query, 300);

  const loadPosts = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const response = await fetchAdminBlogPosts({
        page: currentPage,
        limit: 10,
        query: debouncedQuery,
        status,
        category,
      });
      setPosts(response.data);
      setTotalPages(response.meta?.last_page || 1);
    } catch (error: unknown) {
      if (!isUnauthorizedError(error)) {
        emitToast({
          tone: 'error',
          title: 'Không thể tải blog',
          message: getErrorMessage(error, 'Vui lòng thử lại.'),
        });
      }
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadPosts();
  }, [currentPage, debouncedQuery, status, category]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.set('page', '1');
    setSearchParams(params, { replace: true });
  };

  const handleSaved = async () => {
    setEditorState({ isOpen: false, post: null });
    await loadPosts(false);
  };

  const handlePublishToggle = async (post: BlogPostRecord) => {
    try {
      await publishBlogPost(post.id, post.status !== 'published');
      await loadPosts(false);
    } catch (error: unknown) {
      emitToast({ tone: 'error', title: 'Không thể đổi trạng thái', message: getErrorMessage(error, 'Vui lòng thử lại.') });
    }
  };

  const handlePinToggle = async (post: BlogPostRecord) => {
    try {
      await pinBlogPost(post.id, !post.is_pinned);
      await loadPosts(false);
    } catch (error: unknown) {
      emitToast({ tone: 'error', title: 'Không thể ghim bài', message: getErrorMessage(error, 'Vui lòng thử lại.') });
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) {
      return;
    }

    const target = postToDelete;
    setPostToDelete(null);

    try {
      await deleteBlogPost(target.id);
      await loadPosts(false);
      emitToast({ tone: 'success', title: 'Đã xóa bài viết', message: target.title });
    } catch (error: unknown) {
      emitToast({ tone: 'error', title: 'Không thể xóa bài viết', message: getErrorMessage(error, 'Vui lòng thử lại.') });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Quản lý Blog</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Viết thông báo, tin tức, review sách, sự kiện và hướng dẫn cho sinh viên.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditorState({ isOpen: true, post: null })}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined text-[18px]">edit_square</span>
          Viết bài mới
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="flex flex-col gap-3 border-b border-surface-container bg-slate-50/50 p-5 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder="Tìm theo tiêu đề, tóm tắt, nội dung..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(event) => updateFilter('status', event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="archived">Lưu trữ</option>
            </select>
            <select
              value={category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tất cả phân loại</option>
              {BLOG_CATEGORY_OPTIONS.map((option) => {
                const meta = getBlogCategoryMeta(option.value);
                return (
                  <option key={option.value} value={option.value}>
                    {meta.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left">
            <thead>
              <tr className="border-b border-surface-container bg-white text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Bài viết</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Tác giả</th>
                <th className="px-6 py-4">Ngày xuất bản</th>
                <th className="px-6 py-4">Lượt xem</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Đang tải danh sách bài viết...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10">
                    <EmptyState icon="article" title="Chưa có bài blog nào" message="Tạo bài viết đầu tiên để hiển thị trên Landing và trang Blog." />
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const meta = getBlogCategoryMeta(post.category);
                  return (
                    <tr key={post.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container">
                            {post.cover_image ? (
                              <img src={post.cover_image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-slate-400">article</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-bold text-slate-800">{post.title}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{post.excerpt || post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold ${meta.color}`}>
                          <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          post.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : post.status === 'archived'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {STATUS_LABELS[post.status]}
                        </span>
                        {post.is_pinned ? (
                          <span className="ml-2 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                            Ghim
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{post.author?.name || 'HCMUE Library'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatDisplayDate(post.published_at, 'Chưa xuất bản')}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{post.views.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {post.status === 'published' ? (
                            <Link
                              to={`/blog/${post.slug}`}
                              target="_blank"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary"
                              title="Xem bài viết"
                            >
                              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setEditorState({ isOpen: true, post })}
                            className="rounded-lg p-2 text-primary transition hover:bg-primary-container"
                            title="Chỉnh sửa"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePublishToggle(post)}
                            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50"
                            title={post.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {post.status === 'published' ? 'visibility_off' : 'publish'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePinToggle(post)}
                            className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                            title={post.is_pinned ? 'Bỏ ghim' : 'Ghim'}
                          >
                            <span className={`material-symbols-outlined text-[18px] ${post.is_pinned ? 'filled' : ''}`}>push_pin</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPostToDelete(post)}
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            title="Xóa"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              const params = new URLSearchParams(searchParams);
              params.set('page', String(page));
              setSearchParams(params);
            }}
          />
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(postToDelete)}
        title="Xác nhận xóa bài viết"
        message={`Bạn có chắc chắn muốn xóa "${postToDelete?.title}"?`}
        confirmLabel="Xóa bài viết"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setPostToDelete(null)}
      />

      {editorState.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <BlogEditor
            post={editorState.post}
            onSaved={handleSaved}
            onCancel={() => setEditorState({ isOpen: false, post: null })}
          />
        </div>
      ) : null}
    </div>
  );
}
