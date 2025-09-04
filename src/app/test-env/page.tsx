'use client';

import { useEffect, useState } from 'react';
import { EncryptionService } from '@/services/encryption';

interface EnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
  allEnvVars: string[];
  processEnv: NodeJS.ProcessEnv;
}

export default function TestEnvPage() {
  const [envVars, setEnvVars] = useState<EnvVars | null>(null);

  useEffect(() => {
    const vars: EnvVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
      processEnv: process.env
    };
    
    console.log('Variáveis de ambiente:', vars);
    setEnvVars(vars);
  }, []);

  // Teste específico para mensagens curtas
  const testShortMessages = () => {
    const shortMessages = [
      "oi",
      "ok",
      "sim",
      "não",
      "a",
      "b",
      "c",
      "1",
      "2",
      "3",
      "teste",
      "olá",
      "oi!",
      "ok!",
      "sim!",
      "não!",
      "a!",
      "b!",
      "c!",
      "1!",
      "2!",
      "3!"
    ];

    console.log('🧪 Testando encriptação de mensagens curtas...');
    
    shortMessages.forEach((message, index) => {
      try {
        console.log(`\n--- Teste ${index + 1}: "${message}" ---`);
        
        // Testar encriptação
        const encrypted = EncryptionService.encryptMessage(message, 'test-chat-123');
        console.log('Encriptado:', encrypted);
        
        // Testar detecção de encriptação
        const isEncrypted = EncryptionService.isEncrypted(encrypted);
        console.log('Detectado como encriptado:', isEncrypted);
        
        // Testar desencriptação
        const decrypted = EncryptionService.decryptMessage(encrypted, 'test-chat-123');
        console.log('Desencriptado:', decrypted);
        
        // Verificar se é igual ao original
        const success = decrypted === message;
        console.log('Sucesso:', success);
        
        if (!success) {
          console.error('❌ FALHA: Mensagem não foi preservada corretamente!');
        }
        
        // Testar processamento automático
        const processedForStorage = EncryptionService.processMessageForStorage(message, 'test-chat-123');
        const processedForDisplay = EncryptionService.processMessageForDisplay(processedForStorage, 'test-chat-123');
        const autoSuccess = processedForDisplay === message;
        console.log('Processamento automático:', autoSuccess);
        
        if (!autoSuccess) {
          console.error('❌ FALHA: Processamento automático falhou!');
        }
        
      } catch (error) {
        console.error(`❌ Erro no teste ${index + 1}:`, error);
      }
    });
  };

  // Teste que simula o fluxo completo de envio de mensagem
  const testMessageFlow = () => {
    const testMessages = ["oi", "ok", "sim", "teste"];
    const chatId = 'test-chat-123';
    
    console.log('🧪 Testando fluxo completo de mensagens...');
    
    testMessages.forEach((originalMessage, index) => {
      try {
        console.log(`\n=== FLUXO COMPLETO ${index + 1}: "${originalMessage}" ===`);
        
        // 1. Simular o que acontece quando o usuário digita a mensagem
        console.log('1️⃣ Mensagem original do usuário:', originalMessage);
        
        // 2. Simular o que acontece no sendMessage (processMessageForStorage)
        const encryptedForStorage = EncryptionService.processMessageForStorage(originalMessage, chatId);
        console.log('2️⃣ Mensagem processada para armazenamento:', encryptedForStorage);
        
        // 3. Simular o que seria salvo no banco de dados
        console.log('3️⃣ Mensagem que seria salva no banco:', encryptedForStorage);
        
        // 4. Simular o que acontece quando a mensagem é recuperada do banco
        const retrievedFromDB = encryptedForStorage; // Simula recuperação do banco
        console.log('4️⃣ Mensagem recuperada do banco:', retrievedFromDB);
        
        // 5. Simular o que acontece no processMessageForDisplay
        const decryptedForDisplay = EncryptionService.processMessageForDisplay(retrievedFromDB, chatId);
        console.log('5️⃣ Mensagem processada para exibição:', decryptedForDisplay);
        
        // 6. Verificar se o resultado final é igual ao original
        const finalSuccess = decryptedForDisplay === originalMessage;
        console.log('6️⃣ Resultado final:', finalSuccess ? '✅ SUCESSO' : '❌ FALHA');
        
        if (!finalSuccess) {
          console.error('❌ FALHA NO FLUXO: A mensagem não foi preservada corretamente!');
          console.error('Original:', originalMessage);
          console.error('Final:', decryptedForDisplay);
        }
        
        // 7. Verificar se a mensagem no banco está realmente encriptada
        const isActuallyEncrypted = EncryptionService.isEncrypted(retrievedFromDB);
        console.log('7️⃣ Mensagem no banco está encriptada:', isActuallyEncrypted);
        
        if (!isActuallyEncrypted) {
          console.error('❌ PROBLEMA CRÍTICO: Mensagem no banco não está encriptada!');
        }
        
      } catch (error) {
        console.error(`❌ Erro no fluxo ${index + 1}:`, error);
      }
    });
  };

  // Teste específico para verificar desencriptação
  const testDecryption = () => {
    const testMessages = ["oi", "ok", "sim", "teste"];
    const chatId = 'test-chat-123';
    
    console.log('🧪 Testando desencriptação de mensagens...');
    
    testMessages.forEach((originalMessage, index) => {
      try {
        console.log(`\n=== TESTE DESENCRIPTAÇÃO ${index + 1}: "${originalMessage}" ===`);
        
        // 1. Encriptar mensagem
        const encrypted = EncryptionService.encryptMessage(originalMessage, chatId);
        console.log('1️⃣ Mensagem encriptada:', encrypted);
        
        // 2. Verificar se precisa ser desencriptada
        const needsDecrypt = EncryptionService.needsDecryption(encrypted);
        console.log('2️⃣ Precisa ser desencriptada:', needsDecrypt);
        
        // 3. Verificar se está definitivamente encriptada
        const isDefinitelyEncrypted = EncryptionService.isDefinitelyEncrypted(encrypted);
        console.log('3️⃣ Está definitivamente encriptada:', isDefinitelyEncrypted);
        
        // 4. Processar para exibição (deveria desencriptar)
        const processedForDisplay = EncryptionService.processMessageForDisplay(encrypted, chatId);
        console.log('4️⃣ Processada para exibição:', processedForDisplay);
        
        // 5. Verificar se foi desencriptada corretamente
        const wasDecrypted = processedForDisplay === originalMessage;
        console.log('5️⃣ Foi desencriptada corretamente:', wasDecrypted);
        
        // 6. Verificar se ainda parece Base64
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        const stillLooksLikeBase64 = base64Regex.test(processedForDisplay);
        console.log('6️⃣ Ainda parece Base64:', stillLooksLikeBase64);
        
        // Resultado final
        const success = wasDecrypted && !stillLooksLikeBase64;
        console.log('7️⃣ RESULTADO FINAL:', success ? '✅ SUCESSO' : '❌ FALHA');
        
        if (!success) {
          console.error('❌ PROBLEMA DETECTADO:');
          console.error('- Foi desencriptada corretamente:', wasDecrypted);
          console.error('- Ainda parece Base64:', stillLooksLikeBase64);
        }
        
      } catch (error) {
        console.error(`❌ Erro no teste de desencriptação ${index + 1}:`, error);
      }
    });
  };

  // Teste específico para verificar desencriptação obrigatória
  const testForcedDecryption = () => {
    const testMessages = ["olá", "teste", "mensagem", "123"];
    const chatId = 'test-chat-123';
    
    console.log('🧪 Testando desencriptação OBRIGATÓRIA...');
    
    testMessages.forEach((originalMessage, index) => {
      try {
        console.log(`\n=== TESTE DESENCRIPTAÇÃO OBRIGATÓRIA ${index + 1}: "${originalMessage}" ===`);
        
        // 1. Encriptar mensagem
        const encrypted = EncryptionService.encryptMessage(originalMessage, chatId);
        console.log('1️⃣ Mensagem encriptada:', encrypted);
        
        // 2. Simular mensagem chegando do Realtime (encriptada)
        const realtimeMessage = {
          id: `test-${index}`,
          chat_id: chatId,
          sender_id: 'test-sender',
          sender_type: 'psicologo' as const,
          content: encrypted, // Mensagem encriptada do Realtime
          created_at: new Date().toISOString(),
          is_read: false,
          is_deleted: false
        };
        
        console.log('2️⃣ Mensagem simulada do Realtime:', realtimeMessage.content);
        
        // 3. Aplicar desencriptação obrigatória (como no ChatInterface)
        let processedMessage;
        try {
          const decryptedContent = EncryptionService.processMessageForDisplay(realtimeMessage.content, chatId);
          processedMessage = {
            ...realtimeMessage,
            content: decryptedContent
          };
          console.log('3️⃣ Desencriptação obrigatória aplicada:', processedMessage.content);
        } catch (error) {
          console.error('❌ Erro na desencriptação obrigatória:', error);
          processedMessage = {
            ...realtimeMessage,
            content: `[ERRO DE DESENCRIPTAÇÃO] ${realtimeMessage.content}`
          };
        }
        
        // 4. Verificar se foi desencriptada corretamente
        const wasDecrypted = processedMessage.content === originalMessage;
        console.log('4️⃣ Foi desencriptada corretamente:', wasDecrypted);
        
        // 5. Verificar se ainda parece encriptada
        const isStillEncrypted = EncryptionService.isDefinitelyEncrypted(processedMessage.content);
        console.log('5️⃣ Ainda parece encriptada:', isStillEncrypted);
        
        // Resultado final
        const success = wasDecrypted && !isStillEncrypted;
        console.log('6️⃣ RESULTADO FINAL:', success ? '✅ SUCESSO' : '❌ FALHA');
        
        if (!success) {
          console.error('❌ PROBLEMA DETECTADO:');
          console.error('- Foi desencriptada corretamente:', wasDecrypted);
          console.error('- Ainda parece encriptada:', isStillEncrypted);
          console.error('- Conteúdo final:', processedMessage.content);
        }
        
      } catch (error) {
        console.error(`❌ Erro no teste de desencriptação obrigatória ${index + 1}:`, error);
      }
    });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste de Variáveis de Ambiente</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">NEXT_PUBLIC_SUPABASE_URL</h2>
            <p className="font-mono text-sm break-all">
              {envVars?.NEXT_PUBLIC_SUPABASE_URL || 'Não definida'}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Status: {envVars?.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ Não definida'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
            <p className="font-mono text-sm break-all">
              {envVars?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***OCULTA***' : 'Não definida'}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Status: {envVars?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Todas as Variáveis NEXT_PUBLIC_</h2>
          <ul className="space-y-2">
            {envVars?.allEnvVars?.map((key: string) => (
              <li key={key} className="font-mono text-sm">
                {key}: {process.env[key] ? '✅ Definida' : '❌ Não definida'}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Debug - process.env</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(envVars?.processEnv, null, 2)}
          </pre>
                  </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Testes de Encriptação</h3>
            
            <button
              onClick={testShortMessages}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Testar Mensagens Curtas
            </button>
            
            <button
              onClick={testMessageFlow}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Testar Fluxo Completo
            </button>
            
            <button
              onClick={testDecryption}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Testar Desencriptação
            </button>

            <button
              onClick={testForcedDecryption}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Testar Desencriptação Obrigatória
            </button>

            <button
              onClick={() => {
                const result = EncryptionService.runTests('test-chat-123');
                console.log('🧪 Resultados dos testes:', result);
                alert(`Testes concluídos: ${result.success ? 'SUCESSO' : 'FALHA'}\nVerifique o console para detalhes.`);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Executar Testes Completos
            </button>
          </div>

          <div className="mt-6">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
} 