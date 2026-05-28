import React from 'react';
import { Link } from 'react-router-dom';
import type { BlogPostRecord } from '../api/blogApi';
import { FALLBACK_BLOG_COVER, blogExcerpt, getBlogCategoryMeta } from '../lib/blog';
import { applyImageFallback, formatDisplayDate } from '../lib/display';

type BlogCardProps = {
  post: BlogPostRecord;
  featured?: boolean;
  compact?: boolean;
};

export default function BlogCard({ post, featured = false, compact = false }: BlogCardProps) {
  const category = getBlogCategoryMeta(post.category);
  const image = post.cover_image || FALLBACK_BLOG_COVER;

  if (compact) {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group grid grid-cols-[88px_1fr] gap-3 rounded-xl border border-surface-container-high bg-surface-bright p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
      >
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-surface-container">
          <img
            src={image}
            alt={post.title}
            onError={(event) => applyImageFallback(event.currentTarget)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${category.color}`}>
            <span className="material-symbols-outlined text-[12px]">{category.icon}</span>
            {category.label}
          </span>
          <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-on-surface group-hover:text-primary">
            {post.title}
          </h3>
          <p className="mt-1 text-[11px] text-on-surface-variant">
            {formatDisplayDate(post.published_at || post.created_at, '')}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-bright scholar-shadow transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg ${
        featured ? 'md:grid md:grid-cols-[1.2fr_1fr]' : ''
      }`}
    >
      <div className={`relative overflow-hidden bg-surface-container ${featured ? 'min-h-[280px]' : 'aspect-[16/10]'}`}>
        <img
          src={image}
          alt={post.title}
          onError={(event) => applyImageFallback(event.currentTarget)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        {post.is_pinned ? (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary shadow-sm backdrop-blur">
            <span className="material-symbols-outlined text-[13px] filled">push_pin</span>
            {category.label}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {!post.is_pinned ? (
          <span className={`mb-3 inline-flex w-fit items-center gap-1 rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${category.color}`}>
            <span className="material-symbols-outlined text-[14px]">{category.icon}</span>
            {category.label}
          </span>
        ) : null}
        <h3 className={`${featured ? 'text-2xl md:text-3xl' : 'text-lg'} line-clamp-2 font-bold leading-tight text-on-surface group-hover:text-primary`}>
          {post.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
          {blogExcerpt(post.content, post.excerpt)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-on-surface-variant">
          <span className="line-clamp-1 font-medium">{post.author?.name || 'HCMUE Library'}</span>
          <span>{formatDisplayDate(post.published_at || post.created_at, '')}</span>
        </div>
      </div>
    </Link>
  );
}
