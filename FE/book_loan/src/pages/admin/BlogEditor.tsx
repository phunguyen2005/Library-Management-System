import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import type { BlogPostPayload, BlogPostRecord } from '../../api/blogApi';
import { createBlogPost, generateBlogExcerpt, updateBlogPost } from '../../api/blogApi';
import { BLOG_CATEGORY_OPTIONS, FALLBACK_BLOG_COVER, getBlogCategoryMeta } from '../../lib/blog';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

type BlogEditorProps = {
  post?: BlogPostRecord | null;
  onSaved: (post: BlogPostRecord) => void;
  onCancel: () => void;
};

type BlogEditorForm = {
  title: string;
  excerpt: string;
  category: string;
  status: BlogPostPayload['status'];
  is_pinned: boolean;
  cover_image: string;
  cover_image_file: File | null;
};

const EMPTY_FORM: BlogEditorForm = {
  title: '',
  excerpt: '',
  category: 'news',
  status: 'draft',
  is_pinned: false,
  cover_image: '',
  cover_image_file: null,
};

function toolbarButtonClass(active = false) {
  return `flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
    active
      ? 'border-primary bg-primary text-white'
      : 'border-surface-container-high bg-surface-bright text-on-surface-variant hover:border-primary/30 hover:text-primary'
  }`;
}

function formFromPost(post?: BlogPostRecord | null): BlogEditorForm {
  if (!post) {
    return EMPTY_FORM;
  }

  return {
    title: post.title,
    excerpt: post.excerpt || '',
    category: post.category || 'news',
    status: post.status,
    is_pinned: Boolean(post.is_pinned),
    cover_image: post.cover_image || '',
    cover_image_file: null,
  };
}

export default function BlogEditor({ post, onSaved, onCancel }: BlogEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<BlogEditorForm>(() => formFromPost(post));
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        inline: false,
      }),
    ],
    content: post?.content || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'blog-editor-content min-h-[300px] rounded-b-xl border border-t-0 border-surface-container-high bg-surface-bright px-4 py-4 text-sm leading-relaxed outline-none',
      },
    },
  });

  useEffect(() => {
    setForm(formFromPost(post));
    if (editor) {
      editor.commands.setContent(post?.content || '<p></p>');
    }
  }, [editor, post]);

  const coverPreview = useMemo(() => {
    if (form.cover_image_file) {
      return URL.createObjectURL(form.cover_image_file);
    }

    return form.cover_image || FALLBACK_BLOG_COVER;
  }, [form.cover_image, form.cover_image_file]);

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const updateForm = <K extends keyof BlogEditorForm>(key: K, value: BlogEditorForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setLink = () => {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl || 'https://');

    if (url === null) {
      return;
    }

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const insertImage = () => {
    if (!editor) {
      return;
    }

    const url = window.prompt('Image URL', 'https://');

    if (url?.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  };

  const handleGenerateExcerpt = async () => {
    if (!post) {
      emitToast({
        tone: 'error',
        title: t('blogAdmin.toastNoExcerptTitle', 'Chưa thể tạo tóm tắt'),
        message: t('blogAdmin.toastNoExcerptMsg', 'Vui lòng lưu bài viết trước khi gọi AI tạo tóm tắt.'),
      });
      return;
    }

    setIsGenerating(true);
    try {
      const updated = await generateBlogExcerpt(post.id);
      updateForm('excerpt', updated.excerpt || '');
      onSaved(updated);
      emitToast({ tone: 'success', title: t('blogAdmin.toastAiExcerptSuccessTitle', 'Đã tạo tóm tắt AI'), message: t('blogAdmin.toastAiExcerptSuccessMsg', 'Tóm tắt blog đã được cập nhật.') });
    } catch (error: unknown) {
      emitToast({ tone: 'error', title: t('blogAdmin.toastAiExcerptErrorTitle', 'Không thể tạo tóm tắt'), message: getErrorMessage(error, t('blogAdmin.toastAiExcerptErrorMsg', 'AI chưa phản hồi.')) });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const html = editor?.getHTML() || '';
    const normalizedHtml = html.trim() === '<p></p>' ? '' : html;

    if (!form.title.trim() || !normalizedHtml.trim()) {
      emitToast({
        tone: 'error',
        title: t('blogAdmin.toastValidateTitle', 'Thiếu nội dung bài viết'),
        message: t('blogAdmin.toastValidateMsg', 'Vui lòng nhập tiêu đề và nội dung rich text.'),
      });
      return;
    }

    setIsSaving(true);

    const payload: BlogPostPayload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: normalizedHtml,
      category: form.category,
      status: form.status,
      is_pinned: form.is_pinned,
      cover_image: form.cover_image.trim(),
      cover_image_file: form.cover_image_file,
      generate_excerpt: !form.excerpt.trim(),
    };

    try {
      const saved = post
        ? await updateBlogPost(post.id, payload)
        : await createBlogPost(payload);

      emitToast({
        tone: 'success',
        title: post ? t('blogAdmin.toastUpdateSuccess', 'Đã cập nhật bài viết') : t('blogAdmin.toastCreateSuccess', 'Đã tạo bài viết'),
        message: saved.title,
      });
      onSaved(saved);
    } catch (error: unknown) {
      emitToast({
        tone: 'error',
        title: t('blogAdmin.saveError', 'Không thể lưu bài viết'),
        message: getErrorMessage(error, t('blogAdmin.saveErrorMsg', 'Vui lòng kiểm tra lại nội dung.')),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCategory = getBlogCategoryMeta(form.category);

  return (
    <form onSubmit={handleSubmit} className="grid max-h-[88vh] grid-cols-1 overflow-hidden rounded-2xl bg-surface-bright text-on-surface shadow-2xl lg:grid-cols-[1fr_340px]">
      <section className="custom-scrollbar max-h-[88vh] overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-on-surface">
              {post ? t('blogAdmin.modalTitleEdit', 'Chỉnh sửa bài viết') : t('blogAdmin.modalTitleAdd', 'Viết bài blog mới')}
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">{t('blogAdmin.editorHelpText', 'Nội dung được lưu dưới dạng HTML rich text.')}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="blog-title" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('blogAdmin.formTitle', 'Tiêu đề')}
            </label>
            <input
              id="blog-title"
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              className="w-full rounded-xl border border-surface-container-high bg-surface-container-low px-4 py-3 text-base font-bold text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder={t('blogAdmin.placeholderTitle', 'Nhập tiêu đề bài viết')}
            />
          </div>

          <div>
            <label htmlFor="blog-excerpt" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('blogAdmin.formSummary', 'Tóm tắt')}
            </label>
            <div className="flex gap-2">
              <textarea
                id="blog-excerpt"
                value={form.excerpt}
                onChange={(event) => updateForm('excerpt', event.target.value)}
                rows={3}
                className="min-h-24 flex-1 rounded-xl border border-surface-container-high bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                placeholder={t('blogAdmin.placeholderSummary', 'Để trống để hệ thống tự tạo từ nội dung')}
              />
              <button
                type="button"
                onClick={handleGenerateExcerpt}
                disabled={isGenerating || !post}
                className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                {isGenerating ? t('common.processing', 'Đang tạo') : t('blogAdmin.btnAi', 'AI')}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('blogAdmin.formContent', 'Nội dung')}</label>
              <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${selectedCategory.color}`}>
                <span className="material-symbols-outlined text-[13px]">{selectedCategory.icon}</span>
                {selectedCategory.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 rounded-t-xl border border-surface-container-high bg-surface-container-low p-2">
              <button type="button" className={toolbarButtonClass(editor?.isActive('bold'))} onClick={() => editor?.chain().focus().toggleBold().run()}>
                B
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('italic'))} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                I
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('heading', { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                H2
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('heading', { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
                H3
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('bulletList'))} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('orderedList'))} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('blockquote'))} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
                <span className="material-symbols-outlined text-[18px]">format_quote</span>
              </button>
              <button type="button" className={toolbarButtonClass(editor?.isActive('link'))} onClick={setLink}>
                <span className="material-symbols-outlined text-[18px]">link</span>
              </button>
              <button type="button" className={toolbarButtonClass()} onClick={insertImage}>
                <span className="material-symbols-outlined text-[18px]">image</span>
              </button>
            </div>
            <EditorContent editor={editor} />
          </div>
        </div>
      </section>

      <aside className="custom-scrollbar max-h-[88vh] overflow-y-auto border-t border-surface-container-high bg-surface-container-low p-6 lg:border-l lg:border-t-0">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('blogAdmin.formCoverImage', 'Ảnh bìa')}</label>
            <div className="overflow-hidden rounded-xl border border-surface-container-high bg-surface-bright">
              <img src={coverPreview} alt="Blog cover preview" className="aspect-[16/10] w-full object-cover" />
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => updateForm('cover_image_file', event.target.files?.[0] || null)}
              className="mt-3 w-full rounded-lg border border-surface-container-high bg-surface-bright px-3 py-2 text-xs text-on-surface file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
            <input
              type="url"
              value={form.cover_image}
              onChange={(event) => updateForm('cover_image', event.target.value)}
              placeholder={t('blogAdmin.placeholderCoverUrl', 'Hoặc dán URL ảnh bìa')}
              className="mt-2 w-full rounded-lg border border-surface-container-high bg-surface-bright px-3 py-2 text-xs text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="blog-category" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('blogAdmin.formCategory', 'Phân loại')}
              </label>
              <select
                id="blog-category"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                className="w-full rounded-lg border border-surface-container-high bg-surface-bright px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
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

            <div>
              <label htmlFor="blog-status" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('blogAdmin.formStatus', 'Trạng thái')}
              </label>
              <select
                id="blog-status"
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value as BlogEditorForm['status'])}
                className="w-full rounded-lg border border-surface-container-high bg-surface-bright px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="draft">{t('blogAdmin.statusDraft', 'Nháp')}</option>
                <option value="published">{t('blogAdmin.statusPublished', 'Xuất bản')}</option>
                <option value="archived">{t('blogAdmin.statusArchived', 'Lưu trữ')}</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-bright p-3 text-sm font-bold text-on-surface">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(event) => updateForm('is_pinned', event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {t('blogAdmin.formPin', 'Ghim bài viết')}
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-surface-container px-4 py-3 text-sm font-bold text-on-surface transition hover:bg-surface-container-high disabled:opacity-60"
            >
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? t('common.processing', 'Đang lưu...') : t('blogAdmin.btnSaveLabel', 'Lưu')}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}
