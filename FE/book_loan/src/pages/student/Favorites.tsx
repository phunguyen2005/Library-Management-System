import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchFavoriteBooks, removeFavoriteBook } from '../../api/favoriteApi';
import EmptyState from '../../components/EmptyState';
import { applyImageFallback } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { FormattedBook } from '../../types/book';

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [books, setBooks] = useState<FormattedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadFavorites = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextBooks = await fetchFavoriteBooks();

        if (isActive) {
          setBooks(nextBooks);
        }
      } catch (error: unknown) {
        if (isUnauthorizedError(error)) {
          return;
        }

        const message = getErrorMessage(error, t('studentFavorites.loadError'));

        if (isActive) {
          setLoadError(message);
          emitToast({ tone: 'error', title: t('studentFavorites.loadError'), message });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      isActive = false;
    };
  }, [t]);

  const handleRemove = async (book: FormattedBook) => {
    setRemovingId(book.id);

    try {
      const response = await removeFavoriteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      emitToast({
        tone: 'success',
        title: t('studentFavorites.removeSuccess'),
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('studentFavorites.removeError'));
      emitToast({ tone: 'error', title: t('studentFavorites.removeError'), message });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-8">
      <header className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-outline">
            {t('studentFavorites.eyebrow')}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-on-surface">{t('studentFavorites.title')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            {t('studentFavorites.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/catalog')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          {t('studentFavorites.findMore')}
        </button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-h-[360px] animate-pulse rounded-xl bg-surface-container"
            />
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          icon="error"
          title={t('studentFavorites.loadError')}
          message={loadError}
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              {t('studentFavorites.retry')}
            </button>
          }
        />
      ) : books.length === 0 ? (
        <EmptyState
          icon="favorite"
          title={t('studentFavorites.emptyTitle')}
          message={t('studentFavorites.emptyDesc')}
          action={
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              {t('studentFavorites.openCatalog')}
            </button>
          }
        />
      ) : (
        <section className="flex flex-col gap-4 md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-6">
          {books.map((book) => (
            <article
              key={book.id}
              className="group flex flex-col md:block overflow-hidden rounded-xl border border-surface-container bg-surface-bright scholar-shadow transition-all duration-300 hover:border-primary/30"
            >
              {/* Mobile layout: Row Flex */}
              <div className="flex flex-row p-3 gap-4 md:hidden items-center">
                <button
                  type="button"
                  onClick={() =>
                    book.is_digital
                      ? navigate(`/digital?book=${book.id}`)
                      : navigate(`/catalog?book=${book.id}`)
                  }
                  className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container text-left"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    onError={(event) => applyImageFallback(event.currentTarget)}
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-outline">
                    {book.category}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-bold text-on-surface">
                    {book.title}
                  </h3>
                  <p className="line-clamp-1 text-xs text-on-surface-variant">
                    {book.author}
                  </p>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        book.is_digital
                          ? navigate(`/digital?book=${book.id}`)
                          : navigate(`/catalog?book=${book.id}`)
                      }
                      className="rounded-lg bg-primary-container px-3 py-1.5 text-xs font-bold text-primary cursor-pointer"
                    >
                      {book.is_digital ? t('studentFavorites.readNow') : t('studentFavorites.details')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(book)}
                      disabled={removingId === book.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-container-high text-error active:bg-red-50 cursor-pointer disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined filled text-[18px]">favorite</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop layout: Card Column */}
              <div className="hidden md:block">
                <button
                  type="button"
                  onClick={() =>
                    book.is_digital
                      ? navigate(`/digital?book=${book.id}`)
                      : navigate(`/catalog?book=${book.id}`)
                  }
                  className="relative block aspect-[3/4] w-full overflow-hidden bg-surface-container text-left cursor-pointer"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    onError={(event) => applyImageFallback(event.currentTarget)}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase text-white">
                    {book.is_digital ? 'DIGITAL' : book.status}
                  </span>
                </button>
                <div className="space-y-2 md:space-y-4 p-3 md:p-5">
                  <div>
                    <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-outline">
                      {book.category}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm md:text-base font-bold text-on-surface">
                      {book.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                      {book.author}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] md:text-xs text-on-surface-variant gap-1">
                    <span>{book.is_digital ? t('studentFavorites.onlineResource') : t('studentFavorites.copiesAvailable', { count: book.available_quantity })}</span>
                    <span className="hidden sm:inline">{t('studentFavorites.likes', { count: Number(book.favorite_count ?? 0) })}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        book.is_digital
                          ? navigate(`/digital?book=${book.id}`)
                          : navigate(`/catalog?book=${book.id}`)
                      }
                      className="flex-1 rounded-lg bg-primary-container py-1.5 md:py-2 text-xs md:text-sm font-bold text-primary cursor-pointer"
                    >
                      {book.is_digital ? t('studentFavorites.readNow') : t('studentFavorites.details')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(book)}
                      disabled={removingId === book.id}
                      aria-label={t('studentFavorites.removeAria', { title: book.title })}
                      className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg border border-surface-container-high text-error transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                    >
                      <span className="material-symbols-outlined filled text-[18px] md:text-[20px]">favorite</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
