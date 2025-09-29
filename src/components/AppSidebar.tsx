'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ArrowRight, 
  LogOut, 
  Users, 
  PlusCircle, 
  Tags, 
  BookOpen, 
  Phone
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';

// Importar Tooltip para mostrar labels quando colapsado
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Importar hook para detectar mobile
import { useIsMobile } from '@/hooks/use-mobile';

// Tipos para os menu items
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  page: 'create' | 'management' | 'psicologos-create' | 'psicologos' | 'tags-leitura' | 'references' | 'contacts';
}

interface AppSidebarProps {
  currentPage?: 'create' | 'management' | 'psicologos-create' | 'psicologos' | 'tags-leitura' | 'references' | 'contacts';
}

// Menu items configuration
const menuItems: MenuItem[] = [
  {
    title: "Novo Conteúdo",
    url: "/dashboard/create",
    icon: Plus,
    page: "create"
  },
  {
    title: "Gerir Conteúdo",
    url: "/dashboard/management", 
    icon: ArrowRight,
    page: "management"
  },
  {
    title: "Categorias de Leitura",
    url: "/dashboard/leitura/tags",
    icon: Tags,
    page: "tags-leitura"
  },
  {
    title: "Referências",
    url: "/dashboard/references",
    icon: BookOpen,
    page: "references"
  },
  {
    title: "Contactos",
    url: "/dashboard/contacts",
    icon: Phone,
    page: "contacts"
  },
  {
    title: "Novo Psicólogo",
    url: "/dashboard/psicologos/create",
    icon: PlusCircle,
    page: "psicologos-create"
  },
  {
    title: "Gerir Psicólogos",
    url: "/dashboard/psicologos",
    icon: Users,
    page: "psicologos"
  }
];

export default function AppSidebar({ currentPage }: AppSidebarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { setOpenMobile, state } = useSidebar();
  const isMobile = useIsMobile();

  const handleNavigation = (url: string) => {
    router.push(url);
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 AppSidebar - Iniciando logout...');
      const result = await signOut();
      
      if (!result.success) {
        console.error('❌ AppSidebar - Erro no logout:', result.error);
        // Mesmo com erro, tentar redirecionar
        router.push('/login');
      }
      // O redirecionamento é feito automaticamente pelo signOut do contexto
    } catch (error) {
      console.error('❌ AppSidebar - Erro inesperado no logout:', error);
      // Em caso de erro inesperado, forçar redirecionamento
      window.location.href = '/login';
    }
  };

  // No mobile sempre mostrar expandido, no desktop pode colapsar para ícones
  const isCollapsed = !isMobile && state === "collapsed";

  return (
    <TooltipProvider>
      <Sidebar 
        collapsible={isMobile ? "offcanvas" : "icon"}
        className="border-r border-gray-200"
      >
      {/* Conteúdo Principal - Menu de Navegação */}
      <SidebarContent className="pt-20">
        <SidebarGroup className={isCollapsed ? 'sidebar-collapsed-group' : ''}>
          {!isCollapsed && <SidebarGroupLabel>Navegação Principal</SidebarGroupLabel>}
          <SidebarGroupContent className={isCollapsed ? 'sidebar-collapsed-content' : ''}>
            <SidebarMenu className={`${isCollapsed ? 'space-y-4 w-full flex flex-col items-center' : 'space-y-2'}`}>
              {menuItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.page} 
                  className={
                    isCollapsed 
                      ? `sidebar-icon-spacing w-full flex justify-center ${index === 0 ? 'sidebar-first-icon' : ''}` 
                      : ''
                  }
                >
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton 
                          onClick={() => handleNavigation(item.url)}
                          isActive={currentPage === item.page}
                          className="sidebar-icon-button"
                          data-active={currentPage === item.page}
                        >
                          <item.icon className="w-7 h-7" />
                          <span className="sr-only">{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" className="ml-3 sidebar-tooltip">
                        <p className="font-medium">{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton 
                      onClick={() => handleNavigation(item.url)}
                      isActive={currentPage === item.page}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer com logout apenas */}
      <SidebarFooter className={isCollapsed ? 'px-1 py-2' : ''}>
        <SidebarMenu>
          {/* Botão de Logout */}
          <SidebarMenuItem className={isCollapsed ? 'w-full flex justify-center' : ''}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    onClick={handleLogout}
                    className="sidebar-icon-button text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <LogOut className="w-6 h-6" />
                    <span className="sr-only">Terminar Sessão</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="ml-3 sidebar-tooltip">
                  <p className="font-medium text-red-600">Terminar Sessão</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <SidebarMenuButton 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
    </TooltipProvider>
  );
}