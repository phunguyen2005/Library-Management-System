import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AiChatbot from '../components/AiChatbot';
import LibraryMapModal from '../components/LibraryMapModal';

export default function UserLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onOpenMap={() => setIsMapOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
        <AiChatbot />
      </div>

      {isMapOpen && (
        <LibraryMapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
        />
      )}
    </div>
  );
}

