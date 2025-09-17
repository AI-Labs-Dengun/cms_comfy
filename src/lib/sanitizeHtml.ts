import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML removendo scripts e elementos perigosos
 * Permite apenas tags básicas de formatação: p, strong, em, u, br
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Configuração restritiva: apenas tags básicas de formatação
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });

  return cleanHtml;
}

/**
 * Verifica se uma string contém HTML (heurística simples)
 */
export function isHtml(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Verifica se contém tags HTML básicas
  const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;
  return htmlTagRegex.test(content);
}

/**
 * Converte texto puro para HTML básico
 * Útil para inicializar o editor com texto existente
 */
export function textToHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '<p></p>';
  }
  
  // Se já é HTML, sanitiza e retorna
  if (isHtml(text)) {
    return sanitizeHtml(text);
  }
  
  // Converte quebras de linha para parágrafos
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return '<p></p>';
  }
  
  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}