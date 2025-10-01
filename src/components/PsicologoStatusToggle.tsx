import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface PsicologoStatusToggleProps {
  className?: string;
}

/**
 * Componente otimizado para alternar o status do psicólogo
 * Utiliza a função updatePsicologoStatus do contexto para atualizações instantâneas
 */
export default function PsicologoStatusToggle({ className = '' }: PsicologoStatusToggleProps) {
  const { profile, updatePsicologoStatus, syncPsicologoStatus } = useAuth();

  // Só mostrar se for psicólogo autorizado
  if (!profile || profile.user_role !== 'psicologo' || !profile.authorized) {
    return null;
  }

  const isOnline = profile.is_online;

  const handleToggle = () => {
    if (updatePsicologoStatus) {
      // Esta função atualiza a UI instantaneamente e o banco em background
      updatePsicologoStatus(!isOnline);
    }
  };

  const handleSync = async () => {
    if (syncPsicologoStatus) {
      await syncPsicologoStatus();
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700">
        Status:
      </span>
      
      <button
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
          ${isOnline 
            ? 'bg-green-600 focus:ring-green-500' 
            : 'bg-gray-200 focus:ring-gray-500'
          }
        `}
        role="switch"
        aria-checked={isOnline}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isOnline ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      
      <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      
      {/* Indicador visual do status */}
      <div className="flex items-center">
        <div
          className={`
            h-2 w-2 rounded-full
            ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}
          `}
        />
      </div>
      
      {/* Botão de sincronização */}
      <button
        onClick={handleSync}
        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
        title="Sincronizar status com o servidor"
      >
        🔄 Sync
      </button>
    </div>
  );
}

// Hook personalizado para usar em outros componentes
export function usePsicologoStatus() {
  const { profile, updatePsicologoStatus, syncPsicologoStatus } = useAuth();
  
  const isOnline = profile?.is_online ?? false;
  const isPsicologo = profile?.user_role === 'psicologo' && profile?.authorized;
  
  const setOnline = () => updatePsicologoStatus?.(true);
  const setOffline = () => updatePsicologoStatus?.(false);
  const toggle = () => updatePsicologoStatus?.(!isOnline);
  const sync = () => syncPsicologoStatus?.();
  
  return {
    isOnline,
    isPsicologo,
    setOnline,
    setOffline,
    toggle,
    sync,
    canChangeStatus: isPsicologo && !!updatePsicologoStatus
  };
}