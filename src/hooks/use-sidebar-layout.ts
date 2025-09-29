'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function useSidebarLayout() {
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Apenas aplicar no desktop
    if (isMobile) return;
    
    const mainElement = document.querySelector('main[data-sidebar-inset]');
    const sidebarInsetElement = document.querySelector('[data-sidebar-inset]');
    
    if (mainElement || sidebarInsetElement) {
      const elements = [mainElement, sidebarInsetElement].filter(Boolean) as HTMLElement[];
      
      elements.forEach(element => {
        // Garantir que a transição seja suave
        element.style.transition = 'margin-left 200ms ease-linear';
        
        if (state === 'expanded') {
          element.style.marginLeft = '16rem'; // var(--sidebar-width)
        } else {
          element.style.marginLeft = '4rem'; // var(--sidebar-width-icon)
        }
      });
    }
  }, [state, isMobile]);
  
  return { state };
}