import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchBlogPosts, type BlogPostRecord } from '../../api/blogApi';
import BlogCard from '../../components/BlogCard';
import EmptyState from '../../components/EmptyState';
import LanguageToggle from '../../components/LanguageToggle';
import Pagination from '../../components/Pagination';
import ThemeToggle from '../../components/ThemeToggle';
import logo from '../../assets/logo.png';
import { BLOG_CATEGORY_OPTIONS, getBlogCategoryMeta } from '../../lib/blog';
import { getErrorMessage } from '../../lib/errors';
import { useDebounce } from '../../hooks/useDebounce';

export default function Blog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = Number(searchParams.get('page') || '1');
  const query = searchParams.get('query') || '';
  const category = searchParams.get('category') || '';
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let isActive = true;

    const loadPosts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchBlogPosts({
          page: currentPage,
          limit: 9,
          query: debouncedQuery,
          category,
        });

        if (!isActive) {
          return;
        }

        setPosts(response.data);
        setTotalPages(response.meta?.last_page || 1);
      } catch (loadError: unknown) {
        if (isActive) {
          setError(getErrorMessage(loadError, t('blog.loadError')));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPosts();

    return () => {
      isActive = false;
    };
  }, [currentPage, debouncedQuery, category, t]);

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

  const featured = posts[0];
  const remaining = posts.slice(1);

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
              onClick={() => navigate('/login')}
              className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 sm:flex"
            >
              {t('landing.login')}
              <span className="material-symbols-outlined text-[16px]">login</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-4 py-10 md:px-6 md:py-14">
        <section className="mb-8 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-primary">{t('blog.eyebrow')}</p>
            <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
              {t('blog.pageTitle')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant md:text-base">
              {t('blog.pageSubtitle')}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[360px]">
            <label className="relative block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder={t('blog.searchPlaceholder')}
                className="w-full rounded-xl border border-surface-container-high bg-surface-bright py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilter('category', '')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  category === '' ? 'border-primary bg-primary text-white' : 'border-surface-container-high bg-surface-bright text-on-surface-variant hover:text-primary'
                }`}
              >
                {t('blog.allCategories')}
              </button>
              {BLOG_CATEGORY_OPTIONS.map((option) => {
                const meta = getBlogCategoryMeta(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFilter('category', option.value)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      category === option.value ? 'border-primary bg-primary text-white' : `${meta.color} hover:-translate-y-0.5`
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {error ? (
          <EmptyState icon="error" title={t('common.error')} message={error} />
        ) : isLoading ? (
          <div className="grid gap-5 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-2xl bg-surface-container" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState icon="article" title={t('blog.noPosts')} />
        ) : (
          <div className="space-y-8">
            {featured ? <BlogCard post={featured} featured /> : null}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {remaining.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
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
        )}
      </main>
    </div>
  );
}
