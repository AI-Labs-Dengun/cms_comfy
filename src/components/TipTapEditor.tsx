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
  const [isInitialized, setIsInitialized] = useState(false);

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
    },
  });

  // Atualizar conteúdo quando initialHtml mudar
  useEffect(() => {
    if (editor && !isInitialized) {
      const newContent = sanitizeHtml(textToHtml(initialHtml));
      if (newContent !== editor.getHTML()) {
        editor.commands.setContent(newContent);
      }
      setIsInitialized(true);
    }
  }, [editor, initialHtml, isInitialized]);

  const toggleBold = useCallback(() => {
    if (editor) {
      editor.chain().focus().toggleBold().run();
    }
  }, [editor]);

  const toggleItalic = useCallback(() => {
    if (editor) {
      editor.chain().focus().toggleItalic().run();
    }
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    if (editor) {
      editor.chain().focus().toggleUnderline().run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex gap-1">
          <div className="px-2 py-1 text-xs bg-gray-200 border border-gray-300 rounded">
            Carregando...
          </div>
        </div>
        <div className="w-full px-3 py-2 text-gray-500 min-h-[150px] flex items-center justify-center">
          Inicializando editor...
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex gap-1">
        <button
          type="button"
          onClick={toggleBold}
          disabled={readOnly}
          className={`px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('bold') ? 'bg-gray-200' : ''
          }`}
          title="Negrito"
          aria-label="Negrito"
        >
          B
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          disabled={readOnly}
          className={`px-2 py-1 text-xs italic bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('italic') ? 'bg-gray-200' : ''
          }`}
          title="Itálico"
          aria-label="Itálico"
        >
          I
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          disabled={readOnly}
          className={`px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive('underline') ? 'bg-gray-200' : ''
          }`}
          title="Sublinhado"
          aria-label="Sublinhado"
        >
          <span className="underline">U</span>
        </button>
      </div>

      {/* Editor Area */}
      <div className="editor-content-wrapper">
        <EditorContent
          editor={editor}
          className="tiptap-editor"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default TipTapEditor;