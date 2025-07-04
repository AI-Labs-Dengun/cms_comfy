"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { getUserPosts, togglePostPublication, deletePost, Post } from "@/services/posts";
import { useAuth } from "@/hooks/useAuth";

export default function Management() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Buscar posts ao carregar o componente
  useEffect(() => {
    if (!authLoading && canAccessCMS) {
      loadPosts();
    }
  }, [authLoading, canAccessCMS]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getUserPosts();
      
      if (response.success && response.data) {
        setPosts(response.data);
      } else {
        setError(response.error || 'Erro ao carregar posts');
      }
    } catch (err) {
      setError('Erro inesperado ao carregar posts');
      console.error('Erro ao carregar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar publicação
  const handleTogglePublication = async (postId: string, currentStatus: boolean) => {
    try {
      const response = await togglePostPublication(postId, !currentStatus);
      
      if (response.success) {
        // Atualizar o estado local
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, is_published: !currentStatus }
            : post
        ));
      } else {
        alert(response.error || 'Erro ao alterar status de publicação');
      }
    } catch (err) {
      console.error('Erro ao alterar publicação:', err);
      alert('Erro inesperado ao alterar status de publicação');
    }
  };

  // Função para deletar post
  const handleDeletePost = async (postId: string, postTitle: string) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja eliminar o post "${postTitle}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    try {
      const response = await deletePost(postId);
      
      if (response.success) {
        // Remover do estado local
        setPosts(prev => prev.filter(post => post.id !== postId));
        alert('Post eliminado com sucesso!');
      } else {
        alert(response.error || 'Erro ao eliminar post');
      }
    } catch (err) {
      console.error('Erro ao eliminar post:', err);
      alert('Erro inesperado ao eliminar post');
    }
  };

  // Filtrar posts pela busca
  const filteredPosts = posts.filter((post) => {
    const searchLower = search.toLowerCase();
    return (
      post.title.toLowerCase().includes(searchLower) ||
      post.description.toLowerCase().includes(searchLower) ||
      post.category.toLowerCase().includes(searchLower) ||
      post.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
      post.emotion_tags.some((emo: string) => emo.toLowerCase().includes(searchLower))
    );
  });

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Verificações de segurança
  if (authLoading) {
    return (
      <CMSLayout currentPage="management">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      </CMSLayout>
    );
  }

  if (!isAuthenticated || !canAccessCMS) {
    router.push('/login');
    return null;
  }

  return (
    <CMSLayout currentPage="management">
      <div className="flex flex-col items-center justify-center py-12 px-8">
        <div className="w-full max-w-4xl flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-1 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
            Gerir Conteúdo
          </h1>
          <div className="text-sm text-gray-500 mb-6 font-medium">Monitore e edite o seu conteúdo</div>
          
          {/* Barra de busca */}
          <div className="flex items-center w-full mb-6 justify-center">
            <span className="pl-3 pr-2 text-gray-500">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.6 10.6Z"/>
              </svg>
            </span>
            <input
              type="text"
              className="max-w-3xl w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
              placeholder="Pesquise por título, categoria, tag ou tag de emoção"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontFamily: 'Inter, Quicksand, sans-serif' }}
            />
          </div>

          {/* Estados de carregamento e erro */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
              <span className="text-gray-600">Carregando posts...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full max-w-3xl">
              <div className="flex">
                <div className="text-red-800">
                  <p className="font-medium">Erro ao carregar posts</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={loadPosts}
                  className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Lista de posts */}
          {!loading && !error && (
            <>
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">
                    {posts.length === 0 
                      ? 'Ainda não tem posts criados.'
                      : 'Nenhum post encontrado com os critérios de busca.'
                    }
                  </p>
                  {posts.length === 0 && (
                    <button
                      onClick={() => router.push('/dashboard/create')}
                      className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800"
                    >
                      Criar primeiro post
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow border overflow-x-auto w-full">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Título</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Categoria</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Data de Criação</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Status</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Tags</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPosts.map((post) => (
                        <tr
                          key={post.id}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >
                          <td 
                            className="px-6 py-4 text-gray-900 font-medium cursor-pointer hover:text-blue-600"
                            onClick={() => router.push(`/dashboard/details/${post.id}`)}
                          >
                            <div className="max-w-xs truncate" title={post.title}>
                              {post.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {post.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            {formatDate(post.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              post.is_published 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {post.is_published ? 'Publicado' : 'Rascunho'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {[...post.tags, ...post.emotion_tags].slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                              {[...post.tags, ...post.emotion_tags].length > 3 && (
                                <span className="text-gray-500 text-xs">
                                  +{[...post.tags, ...post.emotion_tags].length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => router.push(`/dashboard/details/${post.id}`)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                title="Ver detalhes"
                              >
                                Ver
                              </button>
                              <button
                                onClick={() => handleTogglePublication(post.id, post.is_published)}
                                className={`text-sm font-medium ${
                                  post.is_published 
                                    ? 'text-yellow-600 hover:text-yellow-800' 
                                    : 'text-green-600 hover:text-green-800'
                                }`}
                                title={post.is_published ? 'Despublicar' : 'Publicar'}
                              >
                                {post.is_published ? 'Despublicar' : 'Publicar'}
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id, post.title)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                title="Eliminar post"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </CMSLayout>
  );
} 