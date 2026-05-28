import i18n from '../i18n';

export const BLOG_CATEGORY_OPTIONS = [
  { value: 'news', icon: 'newspaper', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/40' },
  { value: 'review', icon: 'menu_book', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/40' },
  { value: 'event', icon: 'event', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40' },
  { value: 'academic', icon: 'school', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-900/40' },
  { value: 'guide', icon: 'help_center', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900/40' },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORY_OPTIONS)[number]['value'];

export const FALLBACK_BLOG_COVER =
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200';

export function getBlogCategoryMeta(category: string) {
  const option = BLOG_CATEGORY_OPTIONS.find((item) => item.value === category) || BLOG_CATEGORY_OPTIONS[0];

  return {
    ...option,
    label: i18n.t(`blog.category.${option.value}`),
  };
}

export function stripBlogHtml(html?: string | null) {
  if (!html) {
    return '';
  }

  if (typeof document !== 'undefined') {
    const element = document.createElement('div');
    element.innerHTML = html;
    return (element.textContent || element.innerText || '').replace(/\s+/g, ' ').trim();
  }

  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function sanitizeBlogHtml(html?: string | null) {
  if (!html) {
    return '';
  }

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  const parser = new DOMParser();
  const documentRef = parser.parseFromString(html, 'text/html');
  documentRef.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((node) => node.remove());

  documentRef.body.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on') || value.startsWith('javascript:')) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return documentRef.body.innerHTML;
}

export function blogExcerpt(content?: string | null, fallback?: string | null) {
  const source = fallback?.trim() || stripBlogHtml(content);
  return source.length > 180 ? `${source.slice(0, 177)}...` : source;
}
