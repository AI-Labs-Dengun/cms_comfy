"use client";

import React from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import HtmlRenderer from '@/components/HtmlRenderer';
import { isHtml } from '@/lib/sanitizeHtml';
import { decodeHtmlEntities } from '@/lib/sanitizeHtml';

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

  // Alguns conteúdos são salvos com entidades HTML escapadas (ex: &lt;p&gt;...)
  // Decodifica entidades e verifica novamente se é HTML válido.
  const decoded = decodeHtmlEntities(content).trim();

  // Se após decodificar houver tags HTML, renderiza como HTML seguro
  if (isHtml(decoded)) {
    return <HtmlRenderer content={decoded} className={className} />;
  }

  // Caso contrário, assume Markdown/texto e usa o renderer de Markdown
  return <MarkdownRenderer content={content} className={className} />;
};

export default FlexibleRenderer;