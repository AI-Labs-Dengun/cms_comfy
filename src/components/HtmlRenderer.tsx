"use client";

import React from 'react';
import { sanitizeHtml, isHtml } from '@/lib/sanitizeHtml';

interface HtmlRendererProps {
  content: string;
  className?: string;
}

/**
 * Componente para renderizar HTML de forma segura
 * Sanitiza o HTML antes de renderizar e aplica estilos consistentes
 */
const HtmlRenderer: React.FC<HtmlRendererProps> = ({ 
  content, 
  className = "" 
}) => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Se não é HTML, renderiza como texto puro
  if (!isHtml(content)) {
    return (
      <div className={`text-gray-900 leading-relaxed ${className}`}>
        {content.split('\n').map((line, index) => (
          <p key={index} className="mb-2 last:mb-0">
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    );
  }

  // Sanitiza o HTML antes de renderizar
  const sanitizedHtml = sanitizeHtml(content);

  return (
    <div 
      className={`html-content text-gray-900 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default HtmlRenderer;