"use client";

import React, { useEffect, useState } from "react";
import CMSLayout from "@/components/CMSLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";

interface ReadingTag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export default function TagsLeituraPage() {
  const [tags, setTags] = useState<ReadingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [editingTag, setEditingTag] = useState<ReadingTag | null>(null);
  const [showDelete, setShowDelete] = useState<ReadingTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Buscar tags
  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_all_reading_tags");
      console.log("Resposta da função get_all_reading_tags:", { data, error });
      
      if (error) {
        setError("Erro ao buscar tags: " + error.message);
        setTags([]);
      } else {
        // Verificar se data.tags existe, senão usar data diretamente
        const tagsData = data?.tags || data || [];
        console.log("Tags encontradas:", tagsData);
        setTags(tagsData);
      }
    } catch (err) {
      console.error("Erro na função fetchTags:", err);
      setError("Erro inesperado ao buscar tags");
      setTags([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // Criar ou editar tag
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) {
      setError("O nome da tag é obrigatório.");
      return;
    }
    if (editingTag) {
      // Editar
      const { error } = await supabase.rpc("update_reading_tag", {
        tag_id_param: editingTag.id,
        tag_name: name,
        tag_description: description,
        tag_color: color,
      });
      if (error) {
        setError("Erro ao editar tag: " + error.message);
      } else {
        setSuccess("Tag editada com sucesso!");
        setEditingTag(null);
        setName("");
        setDescription("");
        setColor("#3B82F6");
        fetchTags();
      }
    } else {
      // Criar
      const { error } = await supabase.rpc("create_reading_tag", {
        tag_name: name,
        tag_description: description,
        tag_color: color,
      });
      if (error) {
        setError("Erro ao criar tag: " + error.message);
      } else {
        setSuccess("Tag criada com sucesso!");
        setName("");
        setDescription("");
        setColor("#3B82F6");
        fetchTags();
      }
    }
  };

  // Editar tag
  const handleEdit = (tag: ReadingTag) => {
    setEditingTag(tag);
    setName(tag.name);
    setDescription(tag.description || "");
    setColor(tag.color || "#3B82F6");
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingTag(null);
    setName("");
    setDescription("");
    setColor("#3B82F6");
  };

  // Deletar tag
  const handleDelete = async () => {
    if (!showDelete) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    const { error } = await supabase.rpc("delete_reading_tag", {
      tag_id_param: showDelete.id,
    });
    if (error) {
      setError("Erro ao deletar tag: " + error.message);
    } else {
      setSuccess("Tag deletada com sucesso!");
      fetchTags();
    }
    setShowDelete(null);
    setDeleting(false);
  };

  return (
    <CMSLayout currentPage="tags-leitura">
      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Gestão de Tags de Leitura</h1>
        {/* Formulário de criação/edição */}
        <form onSubmit={handleSubmit} className="mb-8 bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">{editingTag ? "Editar Tag" : "Nova Tag"}</h2>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Nome</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Descrição</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Cor</label>
            <input
              type="color"
              className="w-12 h-8 border border-gray-300 rounded"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors">
              {editingTag ? "Salvar Alterações" : "Criar Tag"}
            </button>
            {editingTag && (
              <button type="button" className="text-gray-600 px-4 py-2 hover:text-gray-800 transition-colors" onClick={handleCancelEdit}>
                Cancelar
              </button>
            )}
          </div>
          {error && <div className="text-red-700 text-sm mt-2 font-medium">{error}</div>}
          {success && <div className="text-green-700 text-sm mt-2 font-medium">{success}</div>}
        </form>
        {/* Listagem de tags */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Tags Cadastradas</h2>
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : tags.length === 0 ? (
            <div className="text-gray-600 font-medium">Nenhuma tag cadastrada.</div>
          ) : (
            <ul className="space-y-2">
              {tags.map(tag => (
                <li key={tag.id} className="flex items-center justify-between border-b py-2">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full" style={{ background: tag.color || "#3B82F6" }}></span>
                    <span className="font-medium text-gray-900">{tag.name}</span>
                    {tag.description && <span className="text-sm text-gray-600">{tag.description}</span>}
                    <span className="text-xs text-gray-500 ml-2">Usos: {tag.usage_count}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-blue-700 hover:text-blue-900 hover:underline text-sm font-medium transition-colors" onClick={() => handleEdit(tag)}>Editar</button>
                    <button className="text-red-700 hover:text-red-900 hover:underline text-sm font-medium transition-colors" onClick={() => setShowDelete(tag)}>Deletar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Modal de confirmação de deleção */}
        {showDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Confirmar deleção</h3>
              <p className="text-gray-700">Tem certeza que deseja deletar a tag <span className="font-bold text-gray-900">{showDelete.name}</span>?</p>
              <div className="flex gap-2 mt-6 justify-end">
                <button className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors" onClick={() => setShowDelete(null)} disabled={deleting}>Cancelar</button>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deletando..." : "Deletar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CMSLayout>
  );
} 