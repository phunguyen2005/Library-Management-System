import { motion, useScroll, useTransform } from 'motion/react';
import type { Variants } from 'motion/react';
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import logo from '../../assets/logo.png';
import { fetchBlogPosts } from '../../api/blogApi';
import type { BlogPostRecord } from '../../api/blogApi';
import BlogCard from '../../components/BlogCard';

/* ─── Animation Variants ─────────────────────────────────────── */
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7 } },
};

/* ─── Feature data ────────────────────────────────────────────── */
const features = [
  {
    icon: 'library_books',
    title: 'Tài liệu số',
    desc: 'Truy cập kho tàng sách điện tử, bài báo khoa học, tạp chí chuyên ngành và luận văn từ các trường đại học uy tín trong và ngoài nước.',
    color: 'bg-blue-50 dark:bg-blue-900/30 text-primary',
  },
  {
    icon: 'schedule',
    title: 'Truy cập 24/7',
    desc: 'Học tập và nghiên cứu mọi lúc, mọi nơi. Hệ thống trực tuyến luôn sẵn sàng phục vụ nhu cầu tra cứu của bạn không giới hạn thời gian.',
    color: 'bg-red-50 dark:bg-red-900/30 text-red-500',
  },
  {
    icon: 'bolt',
    title: 'Mượn trả nhanh chóng',
    desc: 'Quy trình mượn sách trực tuyến được tối ưu hóa — gửi yêu cầu, nhận phê duyệt và theo dõi đơn mượn ngay trên thiết bị của bạn.',
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500',
  },
];

/* ─── Category data ───────────────────────────────────────────── */
const categories = [
  {
    label: 'Tâm lý - Giáo dục học',
    title: 'Khoa học Giáo dục',
    desc: 'Các phương pháp sư phạm, tâm lý học lứa tuổi và công trình nghiên cứu giáo dục hiện đại.',
    icon: 'school',
    large: true,
    bg: 'from-blue-800 to-blue-950',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1000',
  },
  {
    title: 'Công nghệ Thông tin',
    desc: 'Lập trình, Trí tuệ nhân tạo và Khoa học dữ liệu.',
    icon: 'computer',
    large: false,
    bg: 'from-sky-700 to-blue-900',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1000',
  },
  {
    title: 'Khoa học Tự nhiên',
    desc: 'Toán học, Vật lý, Hóa học và Sinh học ứng dụng.',
    icon: 'science',
    large: false,
    bg: 'from-emerald-700 to-teal-900',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1000',
  },
  {
    title: 'Văn học & Ngôn ngữ',
    desc: 'Tác phẩm kinh điển, nghiên cứu ngôn ngữ học và văn học đương đại trong và ngoài nước.',
    icon: 'menu_book',
    large: false,
    wide: true,
    bg: 'from-violet-700 to-purple-900',
    image: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=1000',
  },
];

/* ─── Stats array removed ─── */

/* ─── Partners ────────────────────────────────────────────────── */
const partners = [
  { icon: 'account_balance', name: 'VNU-HCM' },
  { icon: 'school', name: 'Bộ Giáo Dục' },
  { icon: 'public', name: 'ProQuest' },
  { icon: 'library_books', name: 'SpringerLink' },
  { icon: 'science', name: 'IEEE Xplore' },
];

/* ══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, role, user } = useAuth();
  const userName = user?.name || t('common.user');
  const userInitial = userName.charAt(0).toUpperCase();
  const heroRef = useRef<HTMLElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPostRecord[]>([]);
  const [isBlogLoading, setIsBlogLoading] = useState(true);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let isMounted = true;
    const loadBlogPosts = async () => {
      try {
        const response = await fetchBlogPosts({ limit: 3 });
        if (isMounted) {
          setBlogPosts(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load landing blog posts:', err);
      } finally {
        if (isMounted) {
          setIsBlogLoading(false);
        }
      }
    };
    void loadBlogPosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const navLinks = [
    { label: t('nav.home'), href: '#' },
    { label: t('landing.nav.collections'), href: '#collections' },
    { label: t('landing.nav.features'), href: '#features' },
    { label: t('landing.nav.blog'), href: '#blog-posts' },
    { label: t('landing.nav.services'), href: '#services' },
  ];
  const landingFeatures = features.map((feature, index) => ({
    ...feature,
    title: t(`landing.features.${index}.title`, { defaultValue: feature.title }),
    desc: t(`landing.features.${index}.desc`, { defaultValue: feature.desc }),
  }));
  const landingCategories = categories.map((category, index) => ({
    ...category,
    label: category.label
      ? t(`landing.categories.${index}.label`, { defaultValue: category.label })
      : category.label,
    title: t(`landing.categories.${index}.title`, { defaultValue: category.title }),
    desc: t(`landing.categories.${index}.desc`, { defaultValue: category.desc }),
  }));

  React.useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleCTA = () => {
    navigate(isAuthenticated ? (role === 'admin' ? '/admin/dashboard' : '/home') : '/login');
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-surface text-on-surface">

      {/* ── Navbar ── */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-screen-xl rounded-2xl border border-outline-variant/30 bg-surface-bright/50 backdrop-blur-lg shadow-lg shadow-primary/5 transition-all duration-300">
        <div className="flex h-14 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-14 items-center justify-center rounded-xl bg-surface-container p-1 shadow-md">
              <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
            </div>
            <span className="font-headline text-sm sm:text-base md:text-lg font-bold tracking-tight text-primary">
              {t('common.digitalLibrary')}
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            {isAuthenticated ? (
              <button
                onClick={handleCTA}
                className="group flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-1.5 pr-4 text-left transition-all duration-300 hover:bg-surface-container/80 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 font-bold text-white text-sm shadow-sm">
                  {userInitial}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface line-clamp-1">
                    {userName}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-none mt-0.5 font-semibold">
                    {role === 'admin' ? t('common.librarian') : t('common.student')}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-300 group-hover:translate-x-0.5 ml-1">
                  arrow_forward
                </span>
              </button>
            ) : (
              <button
                onClick={handleCTA}
                className="group flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95"
              >
                <span>{t('landing.login')}</span>
                <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-0.5">
                  login
                </span>
              </button>
            )}
          </div>

          {/* Hamburger menu button for mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container md:hidden cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-surface-bright md:hidden flex flex-col pt-24 px-6 pb-8 transition-all duration-300">
          <nav className="flex flex-col gap-4 mb-8">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-on-surface hover:text-primary transition-colors py-2.5 border-b border-surface-container-low"
              >
                {label}
              </a>
            ))}
          </nav>
          
          <div className="flex flex-col gap-5 mt-auto border-t border-surface-container-low pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Giao diện</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Ngôn ngữ</span>
              <LanguageToggle />
            </div>
            
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleCTA();
                }}
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-primary py-3.5 font-bold text-white shadow-md shadow-primary/20"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-bold text-white text-xs shadow-sm">
                  {userInitial}
                </div>
                <span className="text-sm">Trang cá nhân ({userName})</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleCTA();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 py-3.5 font-bold text-white shadow-md shadow-primary/20 hover:from-blue-600 hover:to-blue-700"
              >
                <span>{t('landing.login')}</span>
                <span className="material-symbols-outlined text-[18px]">login</span>
              </button>
            )}
          </div>
        </div>
      )}

      <main className="flex-grow pt-20">

        {/* ── Hero ── */}
        <section
          ref={heroRef}
          className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden bg-surface-container-low"
        >
          {/* Spline 3D background - hidden on mobile for performance and gesture scroll compatibility */}
          <div
            className="absolute inset-0 z-0 w-full h-full overflow-hidden hidden md:block"
            onMouseEnter={() => {
              document.body.style.overflow = 'hidden';
            }}
            onMouseLeave={() => {
              document.body.style.overflow = '';
            }}
            onTouchStart={() => {
              document.body.style.overflow = 'hidden';
            }}
            onTouchEnd={() => {
              document.body.style.overflow = '';
            }}
            onTouchCancel={() => {
              document.body.style.overflow = '';
            }}
          >
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
                <div className="flex flex-col items-center gap-4 text-white/60">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-primary" />
                  <span className="text-sm tracking-widest uppercase">{t('landing.loading3d')}</span>
                </div>
              </div>
            )}
            <iframe
              src="https://my.spline.design/3dpathsfactoryletterscopy-kkmfMqJIU51IGtkZ7InIRAoB/"
              style={{ border: 'none' }}
              className="absolute left-0 top-0 h-full w-full lg:w-[130%] lg:max-w-none"
              title={t('landing.modelTitle')}
              loading="lazy"
              allow="autoplay; fullscreen"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>

          {/* Mobile premium mesh gradient background */}
          <div className="absolute inset-0 z-0 w-full h-full md:hidden overflow-hidden bg-surface-container-low">
            <div className="absolute -right-12 top-12 h-64 w-64 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute -left-12 bottom-20 h-64 w-64 rounded-full bg-tertiary/10 blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
          </div>

          {/* Readability gradient overlay - fades from solid background color to transparent */}
          <div className="absolute inset-0 z-1 pointer-events-none bg-gradient-to-b from-surface-container-low/95 via-surface-container-low/80 to-surface-container-low/40 lg:bg-gradient-to-r lg:from-surface-container-low/95 lg:via-surface-container-low/60 lg:to-transparent" />

          {/* Interactive Hero Content Overlay */}
          <div className="relative z-10 mx-auto flex max-w-screen-xl items-center w-full px-6 py-16 pointer-events-none">
            {/* Hero text wrapper - pointer events active here */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex max-w-2xl flex-col items-start gap-6 pointer-events-auto"
            >
              {/* Hero badge removed */}

              {/* Headline */}
              <motion.h1
                variants={fadeInUp}
                className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight tracking-tight text-on-background drop-shadow-sm"
              >
                {t('landing.heroTitleA')}{' '}
                <span className="relative inline-block text-primary">
                  {t('landing.heroTitleHighlight')}
                  <svg
                    className="absolute -bottom-2 left-0 h-3 w-full text-primary/40"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 10"
                  >
                    <path d="M0 5 Q50 10 100 5" fill="transparent" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
                <br />
                {t('landing.heroTitleB')}
              </motion.h1>

              {/* Sub */}
              <motion.p variants={fadeInUp} className="max-w-xl text-base sm:text-lg leading-relaxed text-on-surface-variant font-medium drop-shadow-sm">
                {t('landing.heroBody')}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={fadeInUp} className="flex flex-col gap-4 sm:flex-row w-full sm:w-auto">
                <button
                  onClick={handleCTA}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl active:scale-95"
                >
                  {t('landing.exploreNow')}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <a
                  href="#features"
                  className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest/80 backdrop-blur-md px-8 py-4 font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container hover:-translate-y-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  {t('landing.learnMore')}
                </a>
              </motion.div>

              {/* Social proof removed */}
            </motion.div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="bg-surface py-24">
          <div className="mx-auto max-w-screen-xl px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="mb-16 text-center"
            >
              <motion.p variants={fadeInUp} className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                {t('landing.featuresEyebrow')}
              </motion.p>
              <motion.h2 variants={fadeInUp} className="font-headline text-3xl font-bold text-on-background md:text-4xl">
                {t('landing.featuresTitle')}
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
              className="grid gap-8 md:grid-cols-3"
            >
              {landingFeatures.map(({ icon, title, desc, color }) => (
                <motion.div
                  key={title}
                  variants={fadeInUp}
                  className="group rounded-2xl border border-surface-container-high bg-surface-container-lowest p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl ${color}`}>
                    <span className="material-symbols-outlined text-3xl">{icon}</span>
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-on-background">{title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Collections (Bento Grid) ── */}
        <section id="collections" className="bg-background py-24">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">{t('landing.collectionsEyebrow')}</p>
                <h2 className="font-headline text-3xl font-bold text-on-background">{t('landing.collectionsTitle')}</h2>
              </div>
              <button
                onClick={handleCTA}
                className="flex items-center gap-1 font-medium text-primary transition-colors hover:text-blue-700"
              >
                {t('landing.viewAll')} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
              className="grid auto-rows-auto md:auto-rows-[220px] grid-cols-1 gap-5 md:grid-cols-4"
            >
              {/* Large — Education */}
              <motion.div
                variants={fadeIn}
                className="group relative col-span-1 row-span-1 md:row-span-2 min-h-[360px] md:min-h-0 cursor-pointer overflow-hidden rounded-2xl shadow-md md:col-span-2"
              >
                <img
                  src={landingCategories[0].image}
                  alt={landingCategories[0].title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${landingCategories[0].bg} opacity-80 transition-opacity duration-300 group-hover:opacity-85`} />
                {/* Decorative shapes */}
                <div className="absolute right-4 top-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-16 left-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-6 sm:p-8 text-white">
                  <span className="mb-3 inline-block w-fit rounded bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                    {landingCategories[0].label}
                  </span>
                  <h3 className="font-headline mb-2 text-2xl sm:text-3xl font-bold">{landingCategories[0].title}</h3>
                  <p className="mb-4 max-w-md text-xs sm:text-sm text-white/80">{landingCategories[0].desc}</p>
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-white/90 transition-all group-hover:gap-2">
                    {t('landing.exploreCount')}
                    <span className="material-symbols-outlined text-[16px]">trending_flat</span>
                  </span>
                </div>
              </motion.div>

              {/* Small — IT */}
              <motion.div
                variants={fadeIn}
                className="group relative col-span-1 row-span-1 min-h-[220px] md:min-h-0 cursor-pointer overflow-hidden rounded-2xl shadow-md"
              >
                <img
                  src={landingCategories[1].image}
                  alt={landingCategories[1].title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${landingCategories[1].bg} opacity-80 transition-opacity duration-300 group-hover:opacity-85`} />
                <div className="absolute right-3 top-3 h-20 w-20 rounded-full bg-white/15 blur-xl" />
                <div className="relative flex h-full flex-col justify-between p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined">{landingCategories[1].icon}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline mb-1 font-bold text-lg">{landingCategories[1].title}</h3>
                    <p className="text-xs text-white/75">{landingCategories[1].desc}</p>
                  </div>
                </div>
              </motion.div>

              {/* Small — Science */}
              <motion.div
                variants={fadeIn}
                className="group relative col-span-1 row-span-1 min-h-[220px] md:min-h-0 cursor-pointer overflow-hidden rounded-2xl shadow-md"
              >
                <img
                  src={landingCategories[2].image}
                  alt={landingCategories[2].title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${landingCategories[2].bg} opacity-80 transition-opacity duration-300 group-hover:opacity-85`} />
                <div className="absolute right-3 top-3 h-20 w-20 rounded-full bg-white/15 blur-xl" />
                <div className="relative flex h-full flex-col justify-between p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined">{landingCategories[2].icon}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline mb-1 font-bold text-lg">{landingCategories[2].title}</h3>
                    <p className="text-xs text-white/75">{landingCategories[2].desc}</p>
                  </div>
                </div>
              </motion.div>

              {/* Wide — Literature */}
              <motion.div
                variants={fadeIn}
                className="group relative col-span-1 row-span-1 min-h-[220px] md:min-h-0 cursor-pointer overflow-hidden rounded-2xl shadow-md md:col-span-2"
              >
                <img
                  src={landingCategories[3].image}
                  alt={landingCategories[3].title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${landingCategories[3].bg} opacity-80 transition-opacity duration-300 group-hover:opacity-85`} />
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex h-full flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 sm:gap-6 p-6 text-white text-center sm:text-left">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-3xl">{landingCategories[3].icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline mb-1 text-xl font-bold">{landingCategories[3].title}</h3>
                    <p className="mb-3 text-xs sm:text-sm text-white/80">{landingCategories[3].desc}</p>
                    <span className="flex items-center justify-center sm:justify-start gap-1 text-xs sm:text-sm font-medium text-white/90 transition-all group-hover:gap-2">
                      {t('landing.explore')} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Blog Posts Section ── */}
        {(!isBlogLoading && blogPosts.length === 0) ? null : (
          <section id="blog-posts" className="bg-surface py-24 border-t border-surface-container-high/40">
            <div className="mx-auto max-w-screen-xl px-6">
              <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                    {t('blog.eyebrow')}
                  </p>
                  <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
                    {t('blog.sectionTitle')}
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/blog')}
                  className="flex w-fit items-center gap-1.5 font-semibold text-primary transition-all hover:text-blue-700 hover:gap-2 text-sm cursor-pointer"
                >
                  <span>{t('blog.viewAll')}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>

              {isBlogLoading ? (
                <div className="grid gap-6 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-bright p-0 shadow-sm animate-pulse"
                    >
                      <div className="aspect-[16/10] bg-surface-container" />
                      <div className="flex-1 p-5 space-y-4">
                        <div className="h-4 w-1/4 rounded bg-surface-container" />
                        <div className="h-6 w-3/4 rounded bg-surface-container" />
                        <div className="h-16 w-full rounded bg-surface-container" />
                        <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/20">
                          <div className="h-3 w-1/3 rounded bg-surface-container" />
                          <div className="h-3 w-1/4 rounded bg-surface-container" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  variants={stagger}
                  className="grid gap-6 md:grid-cols-3"
                >
                  {blogPosts.map((post) => (
                    <motion.div key={post.id} variants={fadeInUp}>
                      <BlogCard post={post} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </section>
        )}

        {/* ── Services & Regulations ── */}
        <section id="services" className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-slate-900 py-24 text-white">
          {/* Grid decoration */}
          <div className="pointer-events-none absolute inset-0 opacity-5">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>
          </div>

          <div className="relative z-10 mx-auto max-w-screen-xl px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="mb-16 text-center"
            >
              <motion.p variants={fadeInUp} className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
                {t('landing.servicesEyebrow')}
              </motion.p>
              <motion.h2 variants={fadeInUp} className="font-headline text-3xl font-bold text-white md:text-4xl">
                {t('landing.servicesTitle')}
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="grid gap-8 md:grid-cols-3"
            >
              {/* Card 1: Hours */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <span className="material-symbols-outlined text-3xl">schedule</span>
                </div>
                <h3 className="mb-4 text-xl font-bold text-white">{t('landing.hoursTitle')}</h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('landing.weekdays')}</span>
                    <span className="font-semibold text-white">07:30 - 20:30</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('landing.saturday')}</span>
                    <span className="font-semibold text-white">08:00 - 17:00</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('landing.sundayHoliday')}</span>
                    <span className="font-semibold text-rose-400">{t('landing.closed')}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>{t('landing.onlineResources')}</span>
                    <span className="font-semibold text-green-400">24/7</span>
                  </li>
                </ul>
              </motion.div>

              {/* Card 2: Rules */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <span className="material-symbols-outlined text-3xl">gavel</span>
                </div>
                <h3 className="mb-4 text-xl font-bold text-white">{t('landing.rulesTitle')}</h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('landing.maxBooks')}</span>
                    <span className="font-semibold text-white">{t('landing.maxBooksValue')}</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('landing.borrowDuration')}</span>
                    <span className="font-semibold text-white">{t('landing.borrowDurationValue')}</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>{t('landing.onlineRenewal')}</span>
                    <span className="font-semibold text-white">{t('landing.onlineRenewalValue')}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>{t('landing.overdueFee')}</span>
                    <span className="font-semibold text-amber-400">{t('landing.overdueFeeValue')}</span>
                  </li>
                </ul>
              </motion.div>

              {/* Card 3: Support */}
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
                  <span className="material-symbols-outlined text-3xl">help_center</span>
                </div>
                <h3 className="mb-4 text-xl font-bold text-white">{t('landing.supportTitle')}</h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-3 border-b border-white/5 pb-2">
                    <span className="material-symbols-outlined text-sm text-teal-400">check_circle</span>
                    <span>{t('landing.supportRooms')}</span>
                  </li>
                  <li className="flex items-center gap-3 border-b border-white/5 pb-2">
                    <span className="material-symbols-outlined text-sm text-teal-400">check_circle</span>
                    <span>{t('landing.supportWifi')}</span>
                  </li>
                  <li className="flex items-center gap-3 border-b border-white/5 pb-2">
                    <span className="material-symbols-outlined text-sm text-teal-400">check_circle</span>
                    <span>{t('landing.supportReference')}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-sm text-teal-400">mail</span>
                    <span>{t('landing.supportEmail')}</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-surface py-24">
          <div className="mx-auto max-w-screen-xl px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-10 text-center text-white shadow-2xl shadow-primary/25 md:p-16"
            >
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-400/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" />

              <div className="relative z-10">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  {t('landing.ctaEyebrow')}
                </span>
                <h2 className="font-headline mb-4 text-3xl font-extrabold md:text-5xl">
                  {t('landing.ctaTitle')}
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-lg text-blue-100">
                  {t('landing.ctaBody')}
                </p>
                <button
                  onClick={handleCTA}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-primary shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
                >
                  {isAuthenticated ? t('landing.enterSystem') : t('landing.joinFree')}
                  <span className="material-symbols-outlined">{isAuthenticated ? 'arrow_forward' : 'login'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Partners ── */}
        <section className="border-t border-surface-container-low bg-surface-container-lowest py-16">
          <div className="mx-auto max-w-screen-xl px-6">
            <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
              {t('landing.partnersTitle')}
            </p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="flex flex-wrap items-center justify-center gap-10 opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:gap-20"
            >
              {partners.map(({ icon, name }) => (
                <motion.div key={name} variants={fadeIn} className="flex items-center gap-2 font-bold text-lg text-on-surface">
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                  {name}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 pt-16 pb-8 px-6 text-slate-400 border-t border-slate-900">
        <div className="mx-auto max-w-screen-xl grid grid-cols-1 md:grid-cols-4 gap-10 pb-12">
          
          {/* Column 1: About */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-14 items-center justify-center rounded-xl bg-white p-1 shadow-md">
                <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
              </div>
              <span className="font-headline font-bold text-white text-lg">{t('common.digitalLibrary')}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              {t('landing.footerBody')}
            </p>
            <div className="text-xs space-y-1">
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] mt-0.5 text-primary">location_on</span>
                <span>280 An Dương Vương, P.4, Q.5, TP. Hồ Chí Minh</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary">call</span>
                <span>(028) 3835 2020</span>
              </p>
            </div>
            {/* Social Icons */}
            <div className="flex gap-4 pt-2">
              <a
                href="https://www.facebook.com/HCMUE.EDUVN"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:bg-primary hover:text-white transition-all duration-300 active:scale-95"
                title="Facebook HCMUE"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:bg-pink-600 hover:text-white transition-all duration-300 active:scale-95"
                title="Instagram"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://github.com/ThaiNguyen-2005/Php-GiuaKy-NhomTTVP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-300 active:scale-95"
                title="Source Code GitHub"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.48-10-10-10z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4 md:pl-8">
            <h4 className="font-headline font-bold text-white text-sm tracking-wider uppercase">{t('landing.quickLinks')}</h4>
            <ul className="space-y-2 text-xs">
              {[
                { label: t('nav.home'), href: '#' },
                { label: t('landing.footerCatalog'), href: '#collections' },
                { label: t('landing.nav.features'), href: '#features' },
                { label: t('landing.nav.blog'), href: '#blog-posts' },
                { label: t('landing.servicesTitle'), href: '#services' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Portals */}
          <div className="space-y-4">
            <h4 className="font-headline font-bold text-white text-sm tracking-wider uppercase">{t('landing.portals')}</h4>
            <ul className="space-y-2 text-xs">
              {[
                { label: 'Cổng thông tin HCMUE', href: 'https://online.hcmue.edu.vn/' },
                { label: 'Website Trường HCMUE', href: 'https://hcmue.edu.vn/' },
                { label: 'Tuyển sinh HCMUE', href: 'https://tuyensinh.hcmue.edu.vn/' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white flex items-center gap-1"
                  >
                    <span>{label}</span>
                    <span className="material-symbols-outlined text-[12px] opacity-60">open_in_new</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div className="space-y-4">
            <h4 className="font-headline font-bold text-white text-sm tracking-wider uppercase">{t('landing.supportLegal')}</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/terms');
                  }}
                  className="transition-colors hover:text-white"
                >
                  {t('landing.terms')}
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/privacy');
                  }}
                  className="transition-colors hover:text-white"
                >
                  {t('landing.privacy')}
                </a>
              </li>
              <li>
                <a href="mailto:thuvien@hcmue.edu.vn" className="transition-colors hover:text-white flex items-center gap-1">
                  <span>{t('landing.supportEmail')}</span>
                </a>
              </li>
              <li>
                <a href="tel:02838352020" className="transition-colors hover:text-white">
                  Hotline: (028) 3835 2020
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="mx-auto max-w-screen-xl border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-light">
          <p>{t('landing.copyright', { year: new Date().getFullYear() })}</p>
          <p className="text-slate-500 font-extralight uppercase tracking-widest text-[10px]">
            HCMUE Library Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
