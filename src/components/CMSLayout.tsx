'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import AppSidebar from '@/components/AppSidebar';
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { useSidebarLayout } from '@/hooks/use-sidebar-layout';
import Image from 'next/image';

interface CMSLayoutProps {
  children: React.ReactNode;
  currentPage?: 'create' | 'management' | 'psicologos-create' | 'psicologos' | 'tags-leitura' | 'references' | 'contacts';
}

function CMSLayoutContent({ children, currentPage }: CMSLayoutProps) {
  // Este hook deve estar dentro do SidebarProvider
  useSidebarLayout();
  const { user, profile } = useAuth();

  // Avatar helper (inline component)
  function Avatar() {
    const name = profile?.name || user?.email || 'Administrador CMS';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  // If profile had an image url, we'd render Image. For now, fallback to initials + icon
  const photoUrl = (profile as unknown as Record<string, string | undefined>)?.photo_url || undefined;

    return (
      <div className="flex items-center gap-3">
        <div className="relative h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden ring-1 ring-gray-200">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} width={32} height={32} className="object-cover w-8 h-8" />
          ) : (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{initials}</span>
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{name}</span>
          <span className="text-xs text-gray-500">Administrador</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar currentPage={currentPage} />
      <SidebarInset className="flex-1 min-w-0" data-sidebar-inset>
  {/* Header com SidebarTrigger para Desktop e Mobile */}
  <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-40 min-h-[60px]">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                Comfy Content Hub
              </h1>
              <p className="text-xs text-gray-500 hidden lg:block">
                Sistema de Administração de Conteúdo
              </p>
            </div>
            <span className="text-lg font-semibold text-gray-900 sm:hidden">
              Comfy CMS
            </span>
          </div>
          
          {/* User info no canto superior direito (Avatar) */}
          <div className="flex items-center mr-2 sm:mr-4 lg:mr-8">
            <Avatar />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50" data-sidebar-inset>
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}

export default function CMSLayout({ children, currentPage }: CMSLayoutProps) {
  return (
    <AuthGuard requiredRole="cms">
      <SidebarProvider defaultOpen={false}>
        <CMSLayoutContent currentPage={currentPage}>
          {children}
        </CMSLayoutContent>
      </SidebarProvider>
    </AuthGuard>
  );
} 