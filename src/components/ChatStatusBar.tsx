'use client';

import React from 'react';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';

interface ChatStatusBarProps {
  currentStatus: ChatStatus;
  onStatusChange: (newStatus: ChatStatus) => void;
  className?: string;
}

export default function ChatStatusBar({ 
  currentStatus, 
  onStatusChange, 
  className = '' 
}: ChatStatusBarProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Status da conversa:</span>
          <ChatStatusTag
            status={currentStatus}
            onStatusChange={onStatusChange}
            isEditable={true}
            variant="horizontal"
          />
        </div>
        
        {/* Indicador visual do status atual */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <span className="text-xs text-gray-500">Status atual</span>
        </div>
      </div>
    </div>
  );
}
