"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, Image, Video, FileText, X } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState<'image' | 'video' | 'text'>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Mock data for existing content
  const [contentItems, setContentItems] = useState<ContentItem[]>([
    {
      id: '1',
      title: 'Sample Blog Post',
      description: 'This is a sample blog post about technology.',
      category: 'Technology',
      type: 'text',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      title: 'Product Image',
      description: 'A beautiful product showcase image.',
      category: 'Marketing',
      type: 'image',
      mediaUrl: '/sample-image.jpg',
      createdAt: '2024-01-14'
    }
  ]);

  const categories = ['Technology', 'Marketing', 'News', 'Tutorial', 'Entertainment', 'Other'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    // TODO: Implement Supabase upload
    console.log('Creating content:', {
      title,
      description,
      category,
      contentType,
      mediaFile
    });

    // Simulate upload
    setTimeout(() => {
      const newContent: ContentItem = {
        id: Date.now().toString(),
        title,
        description,
        category,
        type: contentType,
        mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : undefined,
        createdAt: new Date().toISOString().split('T')[0]
      };

      setContentItems([newContent, ...contentItems]);
      
      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setContentType('text');
      setMediaFile(null);
      setIsUploading(false);
      
      // Switch to manage tab to show the new content
      setActiveTab('manage');
    }, 1000);
  };

  const handleDelete = (id: string) => {
    setContentItems(contentItems.filter(item => item.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
            <button
              onClick={() => {/* TODO: Implement logout */}}
              className="text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-8 mb-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>Create Content</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Manage Content</span>
          </button>
        </div>

        {/* Create Content Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Create New Content</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Content Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Content Type
                </label>
                <div className="flex space-x-4">
                  {[
                    { type: 'text', label: 'Text', icon: FileText },
                    { type: 'image', label: 'Image', icon: Image },
                    { type: 'video', label: 'Video', icon: Video }
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContentType(type as 'text' | 'image' | 'video')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                        contentType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter content title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter content description"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Media Upload */}
              {(contentType === 'image' || contentType === 'video') && (
                <div>
                  <label htmlFor="media" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload {contentType === 'image' ? 'Image' : 'Video'}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      id="media"
                      accept={contentType === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                    {mediaFile && (
                      <button
                        type="button"
                        onClick={() => setMediaFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {mediaFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {mediaFile.name}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Creating...' : 'Create Content'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Manage Content Tab */}
        {activeTab === 'manage' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Your Content</h2>
              <p className="text-sm text-gray-600 mt-1">
                {contentItems.length} content item{contentItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {contentItems.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No content created yet.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first content
                  </button>
                </div>
              ) : (
                contentItems.map((item) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getTypeIcon(item.type)}
                          <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{item.description}</p>
                        <p className="text-sm text-gray-500">Created: {item.createdAt}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {/* TODO: Implement edit */}}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 