'use client';

import React, { useState } from 'react';

export type ChatStatus = 'novo_chat' | 'a_decorrer' | 'follow_up' | 'encerrado';

interface ChatStatusTagProps {
  status: ChatStatus;
  onStatusChange?: (newStatus: ChatStatus) => void;
  isEditable?: boolean;
  className?: string;
}

const statusConfig = {
  novo_chat: {
    label: 'Novo chat',
    color: 'bg-green-100 text-green-800 border-green-200',
    hoverColor: 'hover:bg-green-200',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    )
  },
  a_decorrer: {
    label: 'A decorrer',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  follow_up: {
    label: 'Follow up',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    hoverColor: 'hover:bg-purple-200',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  encerrado: {
    label: 'Encerrado',
    color: 'bg-red-50 text-red-700 border-red-200',
    hoverColor: 'hover:bg-red-100',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }
};

export default function ChatStatusTag({ 
  status, 
  onStatusChange, 
  isEditable = false, 
  className = '',
  variant = 'dropdown' // 'dropdown' | 'horizontal'
}: ChatStatusTagProps & { variant?: 'dropdown' | 'horizontal' }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const config = statusConfig[status];

  const handleStatusChange = (newStatus: ChatStatus) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
    setIsDropdownOpen(false);
  };

  // Versão horizontal - todas as tags lado a lado
  if (variant === 'horizontal' && isEditable) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {Object.entries(statusConfig).map(([statusKey, statusConfig]) => (
          <button
            key={statusKey}
            onClick={() => handleStatusChange(statusKey as ChatStatus)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer ${
              statusKey === status 
                ? `${statusConfig.color} ring-2 ring-offset-2 ring-blue-500` 
                : `${statusConfig.color} opacity-60 hover:opacity-100`
            }`}
          >
            {statusConfig.icon}
            <span className="ml-2">{statusConfig.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Versão dropdown (comportamento original)
  if (!isEditable) {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${className}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer ${config.color} ${config.hoverColor} ${className}`}
      >
        {config.icon}
        <span className="ml-1">{config.label}</span>
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <>
          {/* Overlay para fechar dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="py-1">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Alterar Status
                </span>
              </div>
              
              {Object.entries(statusConfig).map(([statusKey, statusConfig]) => (
                <button
                  key={statusKey}
                  onClick={() => handleStatusChange(statusKey as ChatStatus)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 flex items-center space-x-3 ${
                    statusKey === status 
                      ? 'bg-blue-50 text-blue-800 border-l-4 border-blue-500' 
                      : 'text-gray-700'
                  }`}
                >
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                    {statusConfig.icon}
                    <span className="ml-1">{statusConfig.label}</span>
                  </span>
                  {statusKey === status && (
                    <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
