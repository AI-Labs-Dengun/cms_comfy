"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { sanitizeHtml, textToHtml } from '@/lib/sanitizeHtml';

interface TipTapEditorProps {
  initialHtml?: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  initialHtml = '',
  onChangeHtml,
  placeholder = 'Digite sua descrição...',
  className = '',
  readOnly = false,
}) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [boldActive, setBoldActive] = useState<boolean>(false);
  const [italicActive, setItalicActive] = useState<boolean>(false);
  const [underlineActive, setUnderlineActive] = useState<boolean>(false);
  const [linkActive, setLinkActive] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [linkUrlInput, setLinkUrlInput] = useState<string>('');
  const [linkTextInput, setLinkTextInput] = useState<string>('');
  const [linkModalPos, setLinkModalPos] = useState<{ top: number; left: number } | null>(null);
  const linkModalRef = React.useRef<HTMLDivElement | null>(null);
  const linkTextInputRef = React.useRef<HTMLInputElement | null>(null);
  
  // Link interaction popover (quando clica num link existente)
  const [showLinkPopover, setShowLinkPopover] = useState<boolean>(false);
  const [linkPopoverPos, setLinkPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [currentLinkUrl, setCurrentLinkUrl] = useState<string>('');
  const [currentLinkText, setCurrentLinkText] = useState<string>('');
  const linkPopoverRef = React.useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Desabilitar recursos não necessários para manter simples
        heading: false,
        horizontalRule: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false, // Desabilitar navegação automática
        validate: undefined, // Não validar links automaticamente
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'tiptap-link', // classe CSS para styling
          'data-link-atomic': 'true', // Marcar como atômico
        },
      })
      // Keep default mark behavior (do not force 'atom') to ensure
      // mark range helpers like `extendMarkRange` work reliably.
      .extend({
        // Tornar o link não inclusivo (não se estende ao digitar)
        inclusive: false,
      }),
    ],
    content: sanitizeHtml(textToHtml(initialHtml)),
    editable: !readOnly,
    immediatelyRender: false, // Evita problemas de hidratação SSR
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const sanitizedHtml = sanitizeHtml(html);
      onChangeHtml(sanitizedHtml);
      // atualizar estados ativos ao atualizar conteúdo
      setBoldActive(editor.isActive('bold'));
      setItalicActive(editor.isActive('italic'));
      setUnderlineActive(editor.isActive('underline'));
        setLinkActive(editor.isActive('link'));
    },
  });

  // Funções de toggle
  const toggleBold = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
    // Atualiza imediatamente o estado local (o evento de update pode demorar)
    setBoldActive(editor.isActive('bold'));
  }, [editor]);

  const toggleItalic = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
    setItalicActive(editor.isActive('italic'));
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleUnderline().run();
    setUnderlineActive(editor.isActive('underline'));
  }, [editor]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    try {
      const attrs = editor.getAttributes('link');
      const sel = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(sel.from, sel.to, ' ');
      setLinkUrlInput(attrs.href || '');
      setLinkTextInput(selectedText || ''); // ✅ Sempre preencher com texto selecionado
      // compute position from selection range (viewport coords)
      try {
        const s = window.getSelection();
        if (s && s.rangeCount > 0) {
          const range = s.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect && rect.top !== 0 && rect.left !== 0) {
            // place popover centered above selection
            setLinkModalPos({ top: rect.top, left: rect.left + rect.width / 2 });
          } else {
            // fallback: editor bounding box
            const editorEl = editor.view.dom as HTMLElement;
            const er = editorEl.getBoundingClientRect();
            setLinkModalPos({ top: er.top + 10, left: er.left + 40 });
          }
        } else {
          const editorEl = editor.view.dom as HTMLElement;
          const er = editorEl.getBoundingClientRect();
          setLinkModalPos({ top: er.top + 10, left: er.left + 40 });
        }
      } catch {
        setLinkModalPos(null);
      }
      setShowLinkModal(true);
    } catch {
      // fallback
      setLinkUrlInput('');
      setLinkTextInput('');
      setLinkModalPos(null);
      setShowLinkModal(true);
    }
  }, [editor]);

  // Toggle do estado do link: controla apenas o estado de formatação ativa
  const toggleLinkState = useCallback(() => {
    if (!editor) return;
    
    const isCurrentlyLinked = editor.isActive('link');
    
    if (isCurrentlyLinked) {
      // Ensure we remove the entire linked range (not only the collapsed selection)
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkActive(false);
    } else {
      openLinkModal();
    }
  }, [editor, openLinkModal]);

  const applyLinkFromModal = useCallback(() => {
    if (!editor) return;
    const raw = (linkUrlInput || '').trim();
    if (!raw) {
      // empty -> remove link from selection
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkActive(false);
      setShowLinkModal(false);
      return;
    }

    // normalize and basic validation
    let href = raw;
    if (!/^(https?:\/\/|mailto:|\/)/i.test(href)) {
      // prepend https if user likely pasted without schema
      href = 'https://' + href;
    }

    // get selection
    const sel = editor.state.selection;
    const from = sel.from;
    const to = sel.to;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    // If selection is empty and user provided linkTextInput, insert linked text
    const linkText = (linkTextInput || '').trim();
    if (from === to) {
      if (linkText) {
        editor.chain().focus().insertContentAt({ from, to }, `<a href="${href}" target="_blank" rel="noopener noreferrer">${linkText}</a>`).run();
      } else {
        // nothing to insert, just close
      }
    } else {
      // If user changed the text, replace selection with provided text and link it
      if (linkText && linkText !== selectedText) {
        editor.chain().focus().insertContentAt({ from, to }, `<a href="${href}" target="_blank" rel="noopener noreferrer">${linkText}</a>`).run();
      } else {
        // just set link on the existing selection
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
      }
    }

    setLinkActive(true);
    setShowLinkModal(false);
  }, [editor, linkUrlInput, linkTextInput]);

  const cancelLinkModal = useCallback(() => {
    setShowLinkModal(false);
  }, []);

  // Focus the "Texto" input when the link modal opens so the user can start typing immediately
  useEffect(() => {
    if (!showLinkModal) return;

    // Small timeout to ensure the input is mounted and the popover positioned
    const t = window.setTimeout(() => {
      try {
        if (linkTextInputRef.current) {
          linkTextInputRef.current.focus();
          linkTextInputRef.current.select();
        }
      } catch {
        // ignore
      }
    }, 50);

    return () => window.clearTimeout(t);
  }, [showLinkModal]);

  // Close popover when clicking outside or pressing ESC
  useEffect(() => {
    if (!showLinkModal) return;

    const handleDocMouse = (e: MouseEvent) => {
      const el = linkModalRef.current;
      if (!el) return;
      if (!(e.target instanceof Node)) return;
      if (!el.contains(e.target)) {
        setShowLinkModal(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLinkModal(false);
    };

    document.addEventListener('mousedown', handleDocMouse);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocMouse);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showLinkModal]);

  // Handler para clique em links existentes
  const handleLinkClick = useCallback((e: MouseEvent) => {
    if (!editor) return;
    
    const target = e.target as HTMLElement;
    const linkEl = target.closest('a.tiptap-link, a[href]');
    if (!linkEl) return;
    
    // Always prevent default navigation for any click on links within editor
    e.preventDefault();
    e.stopPropagation();
    
    // Allow modifier or non-left clicks to behave specially (open in new tab)
    // button: 0 = left, 1 = middle, 2 = right
    if ((e as MouseEvent).button !== 0 || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey || (e as MouseEvent).altKey) {
      // For modifier clicks, open link manually instead of showing popover
      const href = linkEl.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    
    const href = linkEl.getAttribute('href') || '';
    const text = linkEl.textContent || '';
    
    // Posicionar popover próximo ao link clicado
    const rect = linkEl.getBoundingClientRect();
    setLinkPopoverPos({ 
      top: rect.bottom + 5, 
      left: rect.left 
    });
    
    setCurrentLinkUrl(href);
    setCurrentLinkText(text);
    setShowLinkPopover(true);
    
    // Selecionar o link no editor para futuras operações
    const view = editor.view;
    const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (pos) {
      const resolvedPos = view.state.doc.resolve(pos.pos);
      const linkMark = resolvedPos.marks().find(mark => mark.type.name === 'link');
      if (linkMark) {
        // Encontrar o range do link
        let start = pos.pos;
        let end = pos.pos;
        
        // Procurar início do link
        while (start > 0) {
          const prevPos = start - 1;
          const prevResolvedPos = view.state.doc.resolve(prevPos);
          const prevLinkMark = prevResolvedPos.marks().find(mark => mark.type.name === 'link');
          if (!prevLinkMark || prevLinkMark.attrs.href !== linkMark.attrs.href) break;
          start = prevPos;
        }
        
        // Procurar fim do link
        while (end < view.state.doc.content.size) {
          const nextResolvedPos = view.state.doc.resolve(end);
          const nextLinkMark = nextResolvedPos.marks().find(mark => mark.type.name === 'link');
          if (!nextLinkMark || nextLinkMark.attrs.href !== linkMark.attrs.href) break;
          end = end + 1;
        }
        
        // Selecionar o range do link
        try {
          editor.chain().focus().setTextSelection({ from: start, to: end }).run();
        } catch {
          // Fallback simples: focar no editor
          editor.chain().focus().run();
        }
      }
    }
  }, [editor]);

  // Fechar popover de link
  const closeLinkPopover = useCallback(() => {
    setShowLinkPopover(false);
  }, []);

  // Abrir link em nova aba
  const openCurrentLink = useCallback(() => {
    if (currentLinkUrl) {
      window.open(currentLinkUrl, '_blank', 'noopener,noreferrer');
    }
    closeLinkPopover();
  }, [currentLinkUrl, closeLinkPopover]);

  // Copiar URL para clipboard
  const copyCurrentLink = useCallback(async () => {
    if (currentLinkUrl) {
      try {
        await navigator.clipboard.writeText(currentLinkUrl);
        // Feedback visual simples
        alert('URL copiada para a área de transferência!');
      } catch {
        // Fallback para browsers mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = currentLinkUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('URL copiada para a área de transferência!');
      }
    }
    closeLinkPopover();
  }, [currentLinkUrl, closeLinkPopover]);

  // Editar link atual
  const editCurrentLink = useCallback(() => {
    setLinkUrlInput(currentLinkUrl);
    setLinkTextInput(currentLinkText);
    setShowLinkModal(true);
    setLinkModalPos(linkPopoverPos);
    closeLinkPopover();
  }, [currentLinkUrl, currentLinkText, linkPopoverPos, closeLinkPopover]);

  // Remover link atual
  const removeCurrentLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkActive(false);
    closeLinkPopover();
  }, [editor, closeLinkPopover]);

  // Adicionar event listener para cliques em links e comportamento atômico
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    // Handler adicional para mousedown para garantir que não há navegação
    const handleLinkMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkEl = target.closest('a.tiptap-link, a[href]');
      if (linkEl) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

  // More robust helper to find a link mark range near a given position
  // We intentionally use `any` for ProseMirror node types here to keep code concise.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const findLinkRangeNearPos = (doc: any, pos: number) => {
      if (pos < 0 || pos >= doc.content.size) return null;
      try {
        const resolved = doc.resolve(pos);
        const mark = resolved.marks().find((m: any) => m.type.name === 'link');
        if (!mark) return null;

        const href = mark.attrs.href;
        let start = pos;
        let end = pos + 1; // Começar com end = pos + 1 para incluir o caractere atual

        // expand left para encontrar o início real do link
        while (start > 0) {
          const r = doc.resolve(start - 1);
          const pm = r.marks().find((m: any) => m.type.name === 'link');
          if (!pm || pm.attrs.href !== href) break;
          start = start - 1;
        }

        // expand right para encontrar o fim real do link
        while (end < doc.content.size) {
          const r = doc.resolve(end);
          const pm = r.marks().find((m: any) => m.type.name === 'link');
          if (!pm || pm.attrs.href !== href) break;
          end = end + 1;
        }

        // Garantir que capturamos todos os caracteres do link
        // Verificar se há mais caracteres linkados antes do start
        while (start > 0) {
          const r = doc.resolve(start - 1);
          const pm = r.marks().find((m: any) => m.type.name === 'link');
          if (pm && pm.attrs.href === href) {
            start = start - 1;
          } else {
            break;
          }
        }

        return { start, end, href };
      } catch {
        return null;
      }
    };
  /* eslint-enable @typescript-eslint/no-explicit-any */

    // Handler para tornar links atômicos na deleção
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      const selection = editor.state.selection;
      const doc = editor.state.doc;

      // Verificar múltiplas posições ao redor do cursor para garantir detecção
      const positionsToCheck: number[] = [];
      
      if (selection.from !== selection.to) {
        // Se há seleção, verificar todo o range da seleção
        for (let i = selection.from; i <= selection.to; i++) {
          positionsToCheck.push(i);
        }
      } else {
        // Se é apenas cursor, verificar posições adjacentes
        const cursorPos = selection.from;
        positionsToCheck.push(cursorPos);
        positionsToCheck.push(Math.max(0, cursorPos - 1));
        positionsToCheck.push(Math.max(0, cursorPos - 2)); // Verificar também 2 posições atrás
        if (cursorPos < doc.content.size) {
          positionsToCheck.push(cursorPos + 1);
        }
      }

      // Remover duplicatas e manter apenas posições válidas
      const uniquePositions = [...new Set(positionsToCheck)].filter(p => p >= 0 && p < doc.content.size);

      for (const p of uniquePositions) {
        const range = findLinkRangeNearPos(doc, p);
        if (range) {
          e.preventDefault();
          
          // Usar diretamente o range do link sem expansão adicional
          // pois a função findLinkRangeNearPos já encontra o range completo
          const linkStart = range.start;
          const linkEnd = range.end;
          
          console.log(`🔍 Deletando link completo: posição ${linkStart}-${linkEnd}, texto: "${doc.textBetween(linkStart, linkEnd)}"`);
          
          // Selecionar e deletar o range completo do link
          editor.chain().focus().setTextSelection({ from: linkStart, to: linkEnd }).deleteSelection().run();
          return;
        }
      }
    };

    // Add listeners in capture phase so we can intercept before browser navigation
    editorElement.addEventListener('mousedown', handleLinkMouseDown, true);
    editorElement.addEventListener('click', handleLinkClick, true);
    editorElement.addEventListener('keydown', handleKeyDown, true);

    return () => {
      editorElement.removeEventListener('mousedown', handleLinkMouseDown, true);
      editorElement.removeEventListener('click', handleLinkClick, true);
      editorElement.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [editor, handleLinkClick]);

  // Close popover quando clicar fora (link popover)
  useEffect(() => {
    if (!showLinkPopover) return;

    const handleDocMouse = (e: MouseEvent) => {
      const el = linkPopoverRef.current;
      if (!el) return;
      if (!(e.target instanceof Node)) return;
      if (!el.contains(e.target)) {
        setShowLinkPopover(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLinkPopover(false);
    };

    document.addEventListener('mousedown', handleDocMouse);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocMouse);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showLinkPopover]);

  // unsetLink removed (unused) to satisfy linter

  // Sincroniza conteúdo inicial e estados ativos
  useEffect(() => {
    if (editor && !isInitialized) {
      const newContent = sanitizeHtml(textToHtml(initialHtml));
      if (newContent !== editor.getHTML()) {
        editor.commands.setContent(newContent);
      }
      setBoldActive(editor.isActive('bold'));
      setItalicActive(editor.isActive('italic'));
      setUnderlineActive(editor.isActive('underline'));
      setLinkActive(editor.isActive('link'));
      setIsInitialized(true);
    }
  }, [editor, initialHtml, isInitialized]);

  // Atualiza estados ativos quando a seleção mudar
  useEffect(() => {
    if (!editor) return;

    const handleSelection = () => {
      setBoldActive(editor.isActive('bold'));
      setItalicActive(editor.isActive('italic'));
      setUnderlineActive(editor.isActive('underline'));
      setLinkActive(editor.isActive('link'));
    };

    editor.on('selectionUpdate', handleSelection);
    editor.on('update', handleSelection);

    return () => {
      editor.off('selectionUpdate', handleSelection);
      editor.off('update', handleSelection);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex gap-1">
          <div className="px-2 py-1 text-xs bg-gray-200 border border-gray-300 rounded">Carregando...</div>
        </div>
        <div className="w-full px-3 py-2 text-gray-500 min-h-[150px] flex items-center justify-center">Inicializando editor...</div>
      </div>
    );
  }

  // Helper to detect empty editor for placeholder overlay
  const isEmpty = () => {
    try {
      return editor.getText().trim() === '';
    } catch {
      return true;
    }
  };

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex gap-1">
        <button
          type="button"
          onClick={toggleBold}
          disabled={readOnly}
          className={`tiptap-toolbar-button px-2 py-1 text-xs font-bold border border-gray-300 rounded transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black ${
            boldActive ? 'bg-black text-white' : 'bg-white text-gray-800 hover:bg-gray-200'
          }`}
          title="Negrito"
          aria-label="Negrito"
          aria-pressed={boldActive}
        >
          B
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          disabled={readOnly}
          className={`tiptap-toolbar-button px-2 py-1 text-xs italic border border-gray-300 rounded transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black ${
            italicActive ? 'bg-black text-white' : 'bg-white text-gray-800 hover:bg-gray-200'
          }`}
          title="Itálico"
          aria-label="Itálico"
          aria-pressed={italicActive}
        >
          I
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          disabled={readOnly}
          className={`tiptap-toolbar-button px-2 py-1 text-xs border border-gray-300 rounded transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black ${
            underlineActive ? 'bg-black text-white' : 'bg-white text-gray-800 hover:bg-gray-200'
          }`}
          title="Sublinhado"
          aria-label="Sublinhado"
          aria-pressed={underlineActive}
        >
          <span className="underline">U</span>
        </button>
        <button
          type="button"
          onClick={toggleLinkState}
          disabled={readOnly}
          className={`tiptap-toolbar-button px-2 py-1 text-xs border border-gray-300 rounded transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black ${
            linkActive ? 'bg-black text-white' : 'bg-white text-gray-800 hover:bg-gray-200'
          }`}
          title={linkActive ? "Remover link da seleção" : "Inserir/Editar link"}
          aria-label={linkActive ? "Remover link da seleção" : "Inserir/Editar link"}
          aria-pressed={linkActive}
        >
          🔗
        </button>
      </div>

      {/* Link popover (anchored, not full-screen) */}
      {showLinkModal && (
        <div
          ref={linkModalRef}
          style={linkModalPos ? { position: 'absolute', top: Math.max(8, linkModalPos.top - 60) + window.scrollY, left: Math.max(8, linkModalPos.left - 160) + window.scrollX } : { position: 'absolute' }}
          className="z-50 w-[320px] bg-white rounded-md shadow-md border border-gray-200 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Inserir link</h3>
            <button className="text-gray-400 hover:text-gray-600" onClick={cancelLinkModal} aria-label="Fechar popover">✖</button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Texto (opcional)</label>
            <input
              ref={linkTextInputRef}
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Texto que será exibido para o link"
              value={linkTextInput}
              onChange={(e) => setLinkTextInput(e.target.value)}
            />

            <label className="text-xs font-medium text-gray-700">URL</label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Cole ou digite a URL (ex: https://example.com)"
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelLinkModal}
                className="px-3 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyLinkFromModal}
                className="px-3 py-2 rounded bg-black text-white text-sm hover:bg-gray-900"
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link interaction popover (ao clicar num link existente) */}
      {showLinkPopover && (
        <div
          ref={linkPopoverRef}
          style={linkPopoverPos ? { 
            position: 'absolute', 
            top: linkPopoverPos.top + window.scrollY, 
            left: Math.max(8, linkPopoverPos.left + window.scrollX),
            zIndex: 60
          } : { position: 'absolute', zIndex: 60 }}
          className="w-[280px] bg-white rounded-md shadow-lg border border-gray-200 py-2"
        >
          {/* URL display */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z" />
                  <path d="M7.414 15.414a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5z" />
                </svg>
              </div>
              <span className="text-sm text-blue-600 font-medium truncate" title={currentLinkUrl}>
                {currentLinkUrl}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-1">
            <button
              type="button"
              onClick={openCurrentLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir
            </button>
            <button
              type="button"
              onClick={copyCurrentLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar
            </button>
            <button
              type="button"
              onClick={editCurrentLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              type="button"
              onClick={removeCurrentLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover
            </button>
          </div>
        </div>
      )}

      {/* Editor Area */}
  <div className="editor-content-wrapper relative cursor-text" onClick={() => editor?.chain().focus().run()}>
        {/* Placeholder overlay (visible when empty) */}
        {isEmpty() && (
          <div className="absolute top-3 left-3 text-sm text-gray-400 pointer-events-none" aria-hidden>
            {placeholder}
          </div>
        )}

        <div className="min-h-[150px]">
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
        
        {/* CSS para links */}
        <style jsx>{`
          :global(.tiptap-editor .tiptap-link) {
            color: #2563eb !important;
            text-decoration: underline !important;
            cursor: pointer !important;
            pointer-events: auto !important;
            /* Tornar links mais "sólidos" visualmente */
            background-color: rgba(37, 99, 235, 0.05) !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
            /* Allow normal text selection to avoid caret artifacts after unlink */
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          :global(.tiptap-editor .tiptap-link:hover) {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
            background-color: rgba(37, 99, 235, 0.1) !important;
          }
          :global(.tiptap-editor a) {
            color: #2563eb !important;
            text-decoration: underline !important;
            cursor: pointer !important;
            pointer-events: auto !important;
            /* Mesmo estilo para todos os links */
            background-color: rgba(37, 99, 235, 0.05) !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          :global(.tiptap-editor a:hover) {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
            background-color: rgba(37, 99, 235, 0.1) !important;
          }
          /* Prevent any default link behavior in editor */
          :global(.tiptap-editor a[href]) {
            pointer-events: none !important;
          }
          :global(.tiptap-editor a.tiptap-link) {
            pointer-events: auto !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default TipTapEditor;