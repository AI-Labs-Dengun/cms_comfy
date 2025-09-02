import { useEffect, useRef, useState } from 'react';

interface UsePageVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
  checkInterval?: number; // em milissegundos
  minHiddenTime?: number; // tempo mínimo que a página deve ficar oculta para disparar onVisible
  disableAutoRefresh?: boolean; // nova opção para desabilitar verificações automáticas
}

export function usePageVisibility(options: UsePageVisibilityOptions = {}) {
  const {
    onVisible,
    onHidden,
    checkInterval = 1000,
    minHiddenTime = 5000, // 5 segundos por padrão
    disableAutoRefresh = true // por padrão, desabilitar verificações automáticas
  } = options;

  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [hiddenStartTime, setHiddenStartTime] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // Página ficou oculta
        setIsVisible(false);
        setHiddenStartTime(now);
        
        if (onHidden) {
          onHidden();
        }
        
        console.log('👁️ usePageVisibility - Página oculta');
      } else {
        // Página ficou visível
        const wasHidden = !isVisible;
        const hiddenDuration = hiddenStartTime ? now - hiddenStartTime : 0;
        
        setIsVisible(true);
        setHiddenStartTime(null);
        
        // Só executar onVisible se a página ficou oculta por tempo suficiente E se não estiver desabilitado
        if (wasHidden && hiddenDuration >= minHiddenTime && !disableAutoRefresh) {
          
          if (onVisible) {
            // Limpar timeout anterior se existir
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            // Executar callback com pequeno delay para evitar conflitos
            timeoutRef.current = setTimeout(() => {
              onVisible();
            }, 100);
          }
        } else if (wasHidden) {
          console.log('👁️ usePageVisibility - Página visível, mas não executando verificações automáticas');
        }
      }
    };

    // Verificar se já há mudanças pendentes - apenas se não estiver desabilitado
    const checkForChanges = () => {
      if (disableAutoRefresh) return;
      
      const now = Date.now();
      if (now - lastCheckRef.current < checkInterval) {
        return;
      }
      
      lastCheckRef.current = now;
      
      // Verificar se o estado atual corresponde ao estado real
      const currentHidden = document.hidden;
      if (currentHidden !== !isVisible) {
        handleVisibilityChange();
      }
    };

    // Listener para mudanças de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Verificação periódica para casos onde o evento não é disparado - apenas se não estiver desabilitado
    const intervalId = disableAutoRefresh ? null : setInterval(checkForChanges, checkInterval);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, onVisible, onHidden, checkInterval, minHiddenTime, hiddenStartTime, disableAutoRefresh]);

  return {
    isVisible,
    hiddenStartTime,
    hiddenDuration: hiddenStartTime ? Date.now() - hiddenStartTime : 0
  };
} 