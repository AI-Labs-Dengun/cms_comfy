"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
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
      </div>

      {/* Editor Area */}
      <div className="editor-content-wrapper relative cursor-text" onClick={() => editor.chain().focus().run()}>
        {/* Placeholder overlay (visible when empty) */}
        {isEmpty() && (
          <div className="absolute top-3 left-3 text-sm text-gray-400 pointer-events-none" aria-hidden>
            {placeholder}
          </div>
        )}

        <div className="min-h-[150px]">
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default TipTapEditor;