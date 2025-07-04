"use client";

import React from "react";
import { X, Globe, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

interface PublishToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublished: boolean;
  title: string;
  isLoading?: boolean;
}

export default function PublishToggleModal({
  isOpen,
  onClose,
  onConfirm,
  isPublished,
  title,
  isLoading = false
}: PublishToggleModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const isPublishing = !isPublished;
  const modalTitle = isPublishing ? "Publicar Conteúdo" : "Despublicar Conteúdo";
  const actionText = isPublishing ? "Publicar" : "Despublicar";
  const loadingText = isPublishing ? "Publicando..." : "Despublicando...";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isPublishing ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {isPublishing ? (
                <Globe className="w-5 h-5 text-green-600" />
              ) : (
                <EyeOff className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Conteúdo:</h4>
            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-md border">
              {title}
            </p>
          </div>

          {isPublishing ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Tornar público
                  </p>
                  <p className="text-sm text-green-700">
                    O conteúdo ficará visível para todos os usuários da plataforma.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800 mb-1">
                    Tornar privado
                  </p>
                  <p className="text-sm text-orange-700">
                    O conteúdo ficará oculto dos usuários, mas permanecerá no sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">i</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Status atual
                </p>
                <p className="text-sm text-blue-700">
                  {isPublished 
                    ? "Este conteúdo está atualmente publicado e visível publicamente."
                    : "Este conteúdo está atualmente privado e não é visível publicamente."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isPublishing 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {loadingText}
              </>
            ) : (
              <>
                {isPublishing ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                {actionText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 