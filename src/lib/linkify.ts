/**
 * Utilitário para detecção e conversão de URLs em links clicáveis
 * Converte URLs em formato Markdown para renderização no chat
 */

/**
 * Regex para detectar URLs em texto
 * Suporta:
 * - URLs completas: http://example.com, https://example.com
 * - URLs com www: www.example.com
 * - URLs sem protocolo: example.com, youtube.com/watch
 * - URLs com paths, query params, fragments
 * - URLs com portas: http://localhost:3000
 * 
 * Padrão de detecção:
 * 1. URLs com protocolo (http:// ou https://)
 * 2. URLs com www.
 * 3. URLs sem protocolo (domínio.extensão)
 */
const URL_REGEX = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))|(www\.[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))|((?:^|\s)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

/**
 * Verifica se o texto contém URLs
 * @param text - Texto a ser verificado
 * @returns true se contém URLs, false caso contrário
 */
export function hasLinks(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Reset regex lastIndex para garantir teste correto
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}

/**
 * Converte URLs em texto para formato Markdown
 * Preserva o texto original e adiciona links clicáveis
 * 
 * @param text - Texto com URLs a serem convertidas
 * @returns Texto em formato Markdown com links
 * 
 * @example
 * linkifyToMarkdown("Veja https://example.com")
 * // Retorna: "Veja [https://example.com](https://example.com)"
 * 
 * @example
 * linkifyToMarkdown("Sites: www.site1.com e https://site2.com")
 * // Retorna: "Sites: [www.site1.com](https://www.site1.com) e [https://site2.com](https://site2.com)"
 */
export function linkifyToMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;
  
  return text.replace(URL_REGEX, (match) => {
    // Sanitizar o match removendo espaços
    const cleanMatch = match.trim();
    
    if (!cleanMatch) {
      return match;
    }
    
    // Determinar a URL completa baseado no formato do match
    let url: string;
    if (cleanMatch.startsWith('http://') || cleanMatch.startsWith('https://')) {
      // Já tem protocolo
      url = cleanMatch;
    } else if (cleanMatch.startsWith('www.')) {
      // Começa com www., adicionar https://
      url = `https://${cleanMatch}`;
    } else {
      // URL sem protocolo (ex: youtube.com, example.com/path)
      // Adicionar https:// automaticamente
      url = `https://${cleanMatch}`;
    }
    
    // Validar que a URL não contém caracteres perigosos
    if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) {
      // Retornar o match original sem converter para link
      return match;
    }
    
    // Converter para formato Markdown: [texto](url)
    return `[${cleanMatch}](${url})`;
  });
}

/**
 * Detecta URLs ao colar texto
 * Útil para mostrar preview ou indicador visual
 * 
 * @param text - Texto colado
 * @returns Array de URLs encontradas
 * 
 * @example
 * detectLinksOnPaste("Veja https://example.com e www.site.com")
 * // Retorna: ["https://example.com", "www.site.com"]
 */
export function detectLinksOnPaste(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;
  
  const matches = text.match(URL_REGEX);
  return matches ? matches.map(m => m.trim()).filter(m => m.length > 0) : [];
}

/**
 * Valida se uma string é uma URL válida
 * @param url - String a ser validada
 * @returns true se é uma URL válida, false caso contrário
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    // Adicionar https:// se não tiver protocolo
    let urlToTest = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToTest = `https://${url}`;
    }
    
    // Tentar criar objeto URL (valida formato)
    const urlObj = new URL(urlToTest);
    
    // Validar protocolo (apenas http e https)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extrai o domínio de uma URL
 * Útil para mostrar preview ou validação
 * 
 * @param url - URL completa
 * @returns Domínio extraído ou null se inválido
 * 
 * @example
 * extractDomain("https://www.example.com/path")
 * // Retorna: "example.com"
 */
export function extractDomain(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    // Adicionar https:// se não tiver protocolo
    let urlToTest = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToTest = `https://${url}`;
    }
    
    const urlObj = new URL(urlToTest);
    
    // Remover www. do hostname se existir
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Remove formatação Markdown de um texto, deixando apenas o conteúdo limpo
 * Útil para exibir previews de mensagens sem a sintaxe Markdown
 * 
 * @param text - Texto com formatação Markdown
 * @returns Texto limpo sem formatação Markdown
 * 
 * @example
 * stripMarkdown("Veja [youtube.com](https://youtube.com)")
 * // Retorna: "Veja youtube.com"
 * 
 * @example
 * stripMarkdown("**Negrito** e *itálico*")
 * // Retorna: "Negrito e itálico"
 */
export function stripMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let cleaned = text;
  
  // Remover links Markdown: [texto](url) -> texto
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remover negrito: **texto** ou __texto__ -> texto
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  
  // Remover itálico: *texto* ou _texto_ -> texto
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
  
  // Remover código inline: `texto` -> texto
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remover headers: # texto -> texto
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remover listas: - texto ou * texto -> texto
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  
  // Remover listas numeradas: 1. texto -> texto
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');
  
  return cleaned.trim();
}
