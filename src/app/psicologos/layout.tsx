'use client';

import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import PsicologosNavbar from '@/components/PsicologosNavbar';

interface PsicologosLayoutProps {
  children: React.ReactNode;
}

export default function PsicologosLayout({ children }: PsicologosLayoutProps) {
  return (
    <AuthGuard requiredRole="psicologo" redirectTo="/login">
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden chat-layout">
        {/* Header do painel de psicólogos */}
        <PsicologosNavbar />
        
        {/* Conteúdo principal */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
