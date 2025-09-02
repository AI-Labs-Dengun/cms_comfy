import { useEffect, useRef, useState } from 'react';

interface UsePageVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
  checkInterval?: number; // em milissegundos
  minHiddenTime?: number; // tempo mínimo que a página deve ficar oculta para disparar onVisible
  enableAutoRefresh?: boolean; // se deve habilitar refresh automático ao voltar
}

export function usePageVisibility(options: UsePageVisibilityOptions = {}) {
  const {
    onVisible,
    onHidden,
    checkInterval = 1000,
    minHiddenTime = 30000, // Aumentado para 30 segundos por padrão
    enableAutoRefresh = false // Desabilitado por padrão
  } = options;

  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [hiddenStartTime, setHiddenStartTime] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  const lastVisibleTimeRef = useRef<number>(Date.now());

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
        const timeSinceLastVisible = now - lastVisibleTimeRef.current;
        
        setIsVisible(true);
        setHiddenStartTime(null);
        lastVisibleTimeRef.current = now;
        
        // Só executar onVisible se:
        // 1. A página ficou oculta por tempo suficiente E
        // 2. O auto-refresh está habilitado E
        // 3. Passou tempo suficiente desde a última vez que ficou visível
        if (wasHidden && 
            hiddenDuration >= minHiddenTime && 
            enableAutoRefresh &&
            timeSinceLastVisible > 60000) { // Pelo menos 1 minuto desde a última verificação
          
          if (onVisible) {
            // Limpar timeout anterior se existir
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            // Executar callback com pequeno delay para evitar conflitos
            timeoutRef.current = setTimeout(() => {
              console.log('👁️ usePageVisibility - Executando onVisible após', Math.round(hiddenDuration / 1000), 'segundos oculta');
              onVisible();
            }, 100);
          }
        } else if (wasHidden) {
          console.log('👁️ usePageVisibility - Página visível, mas não executando onVisible:', {
            hiddenDuration: Math.round(hiddenDuration / 1000) + 's',
            minRequired: Math.round(minHiddenTime / 1000) + 's',
            enableAutoRefresh,
            timeSinceLastVisible: Math.round(timeSinceLastVisible / 1000) + 's'
          });
        }
      }
    };

    // Verificar se já há mudanças pendentes
    const checkForChanges = () => {
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
    
    // Verificação periódica para casos onde o evento não é disparado
    const intervalId = setInterval(checkForChanges, checkInterval);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, onVisible, onHidden, checkInterval, minHiddenTime, enableAutoRefresh, hiddenStartTime]);

  return {
    isVisible,
    hiddenStartTime,
    hiddenDuration: hiddenStartTime ? Date.now() - hiddenStartTime : 0
  };
} 