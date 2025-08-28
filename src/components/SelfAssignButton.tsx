'use client';

import React, { useState } from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import { selfAssignToChat } from '@/services/chat';
import { useAuth } from '@/context/AuthContext';

interface SelfAssignButtonProps {
  chatId: string;
  onSuccess?: () => void;
  className?: string;
  variant?: 'button' | 'icon';
}

export default function SelfAssignButton({ 
  chatId, 
  onSuccess, 
  className = '', 
  variant = 'button' 
}: SelfAssignButtonProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSelfAssign = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      const result = await selfAssignToChat(chatId);
      
      if (result.success) {
        setSuccess(true);
        
        // Notificar sucesso
        if (onSuccess) {
          onSuccess();
        }
        
        // Resetar estado de sucesso após 3 segundos
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        console.error('❌ Erro na auto-associação:', result.error);
        setError(result.error || 'Erro ao se associar à conversa');
      }
    } catch (err) {
      console.error('❌ Erro ao se auto-associar:', err);
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Só mostrar para psicólogos autorizados
  const isPsicologo = profile?.user_role === 'psicologo' && profile?.authorized;
  if (!isPsicologo) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={handleSelfAssign}
          disabled={loading}
          className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            success
              ? 'bg-green-100 text-green-600 focus:ring-green-500'
              : loading
              ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
          } ${className}`}
          title={
            success
              ? 'Associado com sucesso!'
              : loading
              ? 'Associando...'
              : 'Me associar a esta conversa'
          }
          aria-label="Associar-se à conversa"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          ) : success ? (
            <Check className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
        </button>
        
        {error && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleSelfAssign}
        disabled={loading}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          success
            ? 'bg-green-100 text-green-700 focus:ring-green-500'
            : loading
            ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
        } ${className}`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Associando...</span>
          </>
        ) : success ? (
          <>
            <Check className="w-4 h-4" />
            <span>Associado!</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Me Associar</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}