import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchBlogPost, fetchBlogPosts, type BlogPostRecord } from '../../api/blogApi';
import BlogCard from '../../components/BlogCard';
import EmptyState from '../../components/EmptyState';
import LanguageToggle from '../../components/LanguageToggle';
import PageLoader from '../../components/PageLoader';
import ThemeToggle from '../../components/ThemeToggle';
import logo from '../../assets/logo.png';
import { FALLBACK_BLOG_COVER, blogExcerpt, estimateBlogReadingMinutes, getBlogCategoryMeta, prepareBlogContent } from '../../lib/blog';
import { applyImageFallback, formatDisplayDate } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { getIntlLocale } from '../../i18n';

function setMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }

  meta.content = content;
}

export default function BlogPost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const [post, setPost] = useState<BlogPostRecord | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const preparedContent = useMemo(() => prepareBlogContent(post?.content), [post?.content]);

  useEffect(() => {
    let isActive = true;

    const loadPost = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const currentPost = await fetchBlogPost(slug);
        const related = await fetchBlogPosts({ category: currentPost.category, limit: 4 });

        if (!isActive) {
          return;
        }

        setPost(currentPost);
        setRelatedPosts(related.data.filter((item) => item.slug !== currentPost.slug).slice(0, 3));
        setHasCopiedLink(false);

        const description = blogExcerpt(currentPost.content, currentPost.excerpt);
        document.title = `${currentPost.title} | ${t('common.digitalLibrary')}`;
        setMeta('description', description);
      } catch (loadError: unknown) {
        if (isActive) {
          setError(getErrorMessage(loadError, t('blog.postNotFound')));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPost();

    return () => {
      isActive = false;
    };
  }, [slug, t]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <EmptyState icon="article" title={t('blog.postNotFound')} message={error || undefined} />
      </div>
    );
  }

  const category = getBlogCategoryMeta(post.category);
  const cover = post.cover_image || FALLBACK_BLOG_COVER;
  const readingMinutes = estimateBlogReadingMinutes(post.content, post.excerpt);
  const displayDate = formatDisplayDate(post.published_at || post.created_at, '');
  const viewCount = post.views.toLocaleString(getIntlLocale());
  const shareUrl = typeof window !== 'undefined'
    ? new URL(`/blog/${post.slug}`, window.location.origin).toString()
    : `/blog/${post.slug}`;
  const copyArticleLink = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setHasCopiedLink(true);
    } catch {
      setHasCopiedLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-40 border-b border-surface-container-high bg-surface-bright/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-14 items-center justify-center rounded-xl bg-surface-container p-1 shadow-sm">
              <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
            </div>
            <span className="font-headline text-sm font-bold text-primary md:text-lg">
              {t('common.digitalLibrary')}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <button
              type="button"
              onClick={() => navigate('/blog')}
              className="inline-flex items-center gap-2 rounded-xl border border-surface-container-high bg-surface-bright px-4 py-2 text-sm font-bold text-on-surface-variant transition hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              {t('blog.backToBlog')}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 opacity-40">
            <img src={cover} alt="" className="h-full w-full object-cover" onError={(event) => applyImageFallback(event.currentTarget)} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/86 to-slate-950/35" />
          <div className="relative mx-auto max-w-screen-xl px-4 py-12 md:px-6 md:py-20">
            <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              <Link to="/" className="transition hover:text-white">{t('nav.home')}</Link>
              <span aria-hidden="true" className="text-slate-500">/</span>
              <Link to="/blog" className="transition hover:text-white">{t('blog.eyebrow')}</Link>
            </nav>

            <div className="max-w-4xl">
              <span className={`inline-flex items-center gap-1 rounded border px-3 py-1 text-xs font-bold uppercase tracking-wider ${category.color}`}>
                <span className="material-symbols-outlined text-[15px]">{category.icon}</span>
                {category.label}
              </span>
              <h1 id="blog-post-title" className="mt-5 font-headline text-4xl font-black leading-tight tracking-tight md:text-6xl">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-200 md:text-xl">
                  {post.excerpt}
                </p>
              ) : null}
              <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">person</span>
                  {post.author?.name || 'HCMUE Library'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                  {displayDate}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">schedule</span>
                  {t('blog.readingTime', { count: readingMinutes })}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">visibility</span>
                  {viewCount} {t('blog.views')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void copyArticleLink()}
                className="mt-7 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/35"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[17px]">{hasCopiedLink ? 'check' : 'link'}</span>
                {hasCopiedLink ? t('blog.linkCopied') : t('blog.copyLink')}
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-container-high bg-surface">
          <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-[minmax(0,760px)_280px] lg:items-start lg:justify-center">
            <article aria-labelledby="blog-post-title" className="min-w-0">
              <div
                className="blog-rich-content"
                dangerouslySetInnerHTML={{ __html: preparedContent.html }}
              />
            </article>

            <aside className="space-y-7 lg:sticky lg:top-24">
              <div className="border-l border-surface-container-high pl-5">
                <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">{t('blog.articleMeta')}</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-on-surface-variant">{category.label}</dt>
                    <dd className="font-bold text-on-surface">{displayDate}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-on-surface-variant">{t('blog.readingTime', { count: readingMinutes })}</dt>
                    <dd className="font-bold text-on-surface">{viewCount} {t('blog.views')}</dd>
                  </div>
                </dl>
              </div>

              {preparedContent.headings.length > 0 ? (
                <nav aria-label={t('blog.inThisArticle')} className="border-l border-primary/35 pl-5">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">{t('blog.inThisArticle')}</p>
                  <ol className="mt-4 space-y-3 text-sm">
                    {preparedContent.headings.map((heading) => (
                      <li key={heading.id} className={heading.level === 3 ? 'pl-3' : undefined}>
                        <a href={`#${heading.id}`} className="line-clamp-2 text-on-surface-variant transition hover:text-primary">
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
            </aside>
          </div>
        </section>

        {relatedPosts.length > 0 ? (
          <section className="border-t border-surface-container-high bg-surface-container-low py-12">
            <div className="mx-auto max-w-screen-xl px-4 md:px-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-on-surface">{t('blog.related')}</h2>
                <Link to="/blog" className="text-sm font-bold text-primary hover:underline">
                  {t('blog.viewAll')}
                </Link>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {relatedPosts.map((item) => (
                  <BlogCard key={item.id} post={item} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
