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
      .replace(/javascript:/gi, '')
      .replace(/style="[^"]*?(?:color|background)[^"]*?"/gi, '')
      .replace(/style='[^']*?(?:color|background)[^']*?'/gi, '');
  }

  const parser = new DOMParser();
  const documentRef = parser.parseFromString(html, 'text/html');
  documentRef.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((node) => node.remove());

  documentRef.body.querySelectorAll('*').forEach((node) => {
    // Strip background and color properties from style attribute to ensure dark mode compatibility
    const styleAttr = node.getAttribute('style');
    if (styleAttr) {
      const cleanedStyles = styleAttr
        .split(';')
        .map((s) => s.trim())
        .filter((s) => {
          if (!s) return false;
          const [prop] = s.split(':').map((p) => p.trim().toLowerCase());
          return prop !== 'color' && prop !== 'background' && prop !== 'background-color';
        })
        .join('; ');
      
      if (cleanedStyles) {
        node.setAttribute('style', cleanedStyles);
      } else {
        node.removeAttribute('style');
      }
    }

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

function slugifyHeading(text: string, index: number) {
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);

  return slug || `section-${index + 1}`;
}

export type BlogContentHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function prepareBlogContent(html?: string | null) {
  const sanitizedHtml = sanitizeBlogHtml(html);

  if (!sanitizedHtml || typeof DOMParser === 'undefined') {
    return {
      html: sanitizedHtml,
      headings: [] as BlogContentHeading[],
    };
  }

  const parser = new DOMParser();
  const documentRef = parser.parseFromString(sanitizedHtml, 'text/html');
  const usedIds = new Set<string>();
  const headings: BlogContentHeading[] = [];

  documentRef.body.querySelectorAll('h2, h3').forEach((node, index) => {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();

    if (!text) {
      return;
    }

    const baseId = slugifyHeading(text, index);
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    node.id = id;
    headings.push({
      id,
      text,
      level: node.tagName.toLowerCase() === 'h3' ? 3 : 2,
    });
  });

  return {
    html: documentRef.body.innerHTML,
    headings,
  };
}

export function estimateBlogReadingMinutes(content?: string | null, fallback?: string | null) {
  const source = stripBlogHtml(content) || fallback?.trim() || '';
  const wordCount = source.match(/\S+/g)?.length || 0;

  return Math.max(1, Math.ceil(wordCount / 220));
}

export function blogExcerpt(content?: string | null, fallback?: string | null) {
  const source = fallback?.trim() || stripBlogHtml(content);
  return source.length > 180 ? `${source.slice(0, 177)}...` : source;
}
