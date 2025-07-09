'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/services/auth';
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validação do nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validação do email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validação da senha
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    // Validação da confirmação de senha
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Verificar se o email já está em uso
      const emailExists = await AuthService.checkEmailExists(formData.email.trim());
      if (emailExists) {
        setMessage({
          type: 'error',
          text: 'Este email já está em uso. Tente outro email.'
        });
        setLoading(false);
        return;
      }

      const result = await AuthService.signupCMS(
        formData.name.trim(),
        formData.email.trim(),
        formData.password
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Conta criada com sucesso! Redirecionando para o login...'
        });
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erro ao criar conta'
        });
      }
    } catch (error) {
      console.error('Erro no signup:', error);
      setMessage({
        type: 'error',
        text: 'Erro interno do servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <Image
              className="h-12 w-auto sm:h-14"
              src="/cms-logo.png"
              alt="CMS Logo"
              width={56}
              height={56}
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Comfy CMS
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
            Criar conta CMS
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Ou{' '}
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              faça login se já tem uma conta
            </Link>
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-6 lg:px-8 shadow-lg rounded-xl">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-3 sm:py-3.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base transition-colors ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite seu nome completo"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-3 sm:py-3.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base transition-colors ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-3 sm:py-3.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base transition-colors ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-3 sm:py-3.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base transition-colors ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirme sua senha"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Mensagem de sucesso/erro */}
            {message && (
              <div className={`rounded-lg p-4 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm sm:text-base ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Botão de submit */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 sm:py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
                  loading
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Criando conta...
                  </div>
                ) : (
                  'Criar conta'
                )}
              </button>
            </div>
          </form>

          {/* Footer Section */}
          <div className="mt-6 sm:mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Já tem uma conta?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-3 sm:py-3.5 px-4 border border-gray-300 rounded-lg shadow-sm text-base sm:text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 