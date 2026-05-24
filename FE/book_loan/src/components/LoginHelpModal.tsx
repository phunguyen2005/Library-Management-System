import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface LoginHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'oauth' | 'otp' | 'support';

export default function LoginHelpModal({ isOpen, onClose }: LoginHelpModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: t('auth.helpModal.tabOverview'), icon: 'account_circle' },
    { id: 'oauth', label: t('auth.helpModal.tabOauth'), icon: 'key' },
    { id: 'otp', label: t('auth.helpModal.tabOtp'), icon: 'mark_email_unread' },
    { id: 'support', label: t('auth.helpModal.tabSupport'), icon: 'contact_support' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative flex h-[580px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-bright shadow-2xl"
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-surface-container-high bg-surface-container-low px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-2xl">help</span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    {t('auth.helpModal.title')}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {t('auth.helpModal.subtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            {/* Content Area with Sidebar Tabs */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <nav className="w-52 border-r border-surface-container-high bg-surface-container-lowest p-3 flex flex-col gap-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        isActive
                          ? 'text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute inset-0 rounded-xl bg-primary/10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`material-symbols-outlined text-xl relative z-10 ${isActive ? 'text-primary' : ''}`}>
                        {tab.icon}
                      </span>
                      <span className="relative z-10 truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Tab Viewport */}
              <main className="flex-1 overflow-y-auto bg-surface-bright p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {activeTab === 'overview' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <span className="material-symbols-outlined">school</span>
                          <h4 className="font-headline font-bold text-lg">
                            {t('auth.helpModal.overviewTitle')}
                          </h4>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {t('auth.helpModal.overviewBody1')}
                        </p>
                        <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-950/20 dark:bg-blue-950/10">
                          <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
                            <strong>💡 {t('auth.email')}:</strong> {t('auth.helpModal.overviewBody2')}
                          </p>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {t('auth.helpModal.overviewBody3')}
                        </p>
                      </div>
                    )}

                    {activeTab === 'oauth' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <span className="material-symbols-outlined">vpn_key</span>
                          <h4 className="font-headline font-bold text-lg">
                            {t('auth.helpModal.oauthTitle')}
                          </h4>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {t('auth.helpModal.oauthBody1')}
                        </p>
                        <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4 dark:border-purple-950/20 dark:bg-purple-950/10">
                          <p className="text-xs leading-relaxed text-purple-800 dark:text-purple-300">
                            <strong>🔗 Google & GitHub:</strong> {t('auth.helpModal.oauthBody2')}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'otp' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <span className="material-symbols-outlined">lock_reset</span>
                          <h4 className="font-headline font-bold text-lg">
                            {t('auth.helpModal.otpTitle')}
                          </h4>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {t('auth.helpModal.otpBody1')}
                        </p>
                        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 dark:border-amber-950/20 dark:bg-amber-950/10">
                          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                            <strong>⚠️ {t('common.error')}:</strong> {t('auth.helpModal.otpBody2')}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'support' && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 text-primary">
                          <span className="material-symbols-outlined">contact_mail</span>
                          <h4 className="font-headline font-bold text-lg">
                            {t('auth.helpModal.supportTitle')}
                          </h4>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {t('auth.helpModal.supportBody1')}
                        </p>
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {t('auth.helpModal.supportBody2')}
                        </p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                          <div className="flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-container-low p-4">
                            <span className="material-symbols-outlined text-primary text-2xl">mail</span>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-outline font-bold">Email</p>
                              <a href="mailto:thuvien@hcmue.edu.vn" className="text-sm font-semibold text-primary hover:underline">
                                thuvien@hcmue.edu.vn
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-container-low p-4">
                            <span className="material-symbols-outlined text-primary text-2xl">call</span>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-outline font-bold">Hotline</p>
                              <a href="tel:02838352020" className="text-sm font-semibold text-on-surface hover:text-primary transition-colors">
                                (028) 3835 2020
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end border-t border-surface-container-high bg-surface-container-low px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                {t('auth.helpModal.close')}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
