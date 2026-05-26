import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';
import LibraryPolicyModal from '../components/LibraryPolicyModal';

export default function AdminLayout() {
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AdminHeader onOpenPolicy={() => setShowPolicyModal(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-surface">
          <Outlet />
        </main>
      </div>
      <LibraryPolicyModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </div>
  );
}
