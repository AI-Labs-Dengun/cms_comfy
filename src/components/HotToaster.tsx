"use client";
import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function HotToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          borderRadius: '8px',
          background: '#ffffff',
          color: '#111827',
        },
        success: {
          // stronger green style
          duration: 3000,
          style: {
            background: '#bbf7d0', // green-200 - stronger, more vibrant
            color: '#064e3b', // green-900 - darker text for contrast
            border: '1px solid rgba(4,116,87,0.14)'
          }
        },
        error: {
          // softer red style
          duration: 6000,
          style: {
            background: '#fff1f2', // red-50 - very soft/red tint
            color: '#7f1d1d', // muted red text
            border: '1px solid rgba(239,68,68,0.06)'
          }
        }
      }}
    />
  );
}
