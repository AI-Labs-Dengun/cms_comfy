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
      <div className="min-h-screen bg-gray-50">
        {/* Header do painel de psicólogos */}
        <PsicologosNavbar />
        
        {/* Conteúdo principal - sem padding para ocupar toda a tela */}
        <main className="h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
