import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
