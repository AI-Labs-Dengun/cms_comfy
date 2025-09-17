"use client";

import React from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import HtmlRenderer from '@/components/HtmlRenderer';
import { isHtml } from '@/lib/sanitizeHtml';

interface FlexibleRendererProps {
  content: string;
  className?: string;
}

/**
 * Componente que detecta automaticamente se o conteúdo é HTML ou Markdown
 * e usa o renderer apropriado
 */
const FlexibleRenderer: React.FC<FlexibleRendererProps> = ({ 
  content, 
  className = "" 
}) => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Detecta se é HTML e usa o renderer apropriado
  if (isHtml(content)) {
    return <HtmlRenderer content={content} className={className} />;
  }

  // Se não é HTML, assume que é Markdown
  return <MarkdownRenderer content={content} className={className} />;
};

export default FlexibleRenderer;