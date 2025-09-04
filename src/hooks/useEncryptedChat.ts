import { useCallback } from 'react';
import { Message } from '@/services/chat';
import { EncryptionService } from '@/services/encryption';

/**
 * Hook para processar mensagens encriptadas em tempo real
 * @param chatId - ID do chat atual
 * @returns Funções para processar mensagens
 */
export function useEncryptedChat(chatId: string) {
  
  /**
   * Processa uma mensagem recebida em tempo real (versão FORÇADA)
   * @param message - Mensagem do banco de dados (pode estar encriptada)
   * @returns Mensagem processada (desencriptada se necessário)
   */
  const processIncomingMessage = useCallback((message: Message): Message => {
    try {
      console.log('🔓 Processando mensagem recebida em tempo real (FORÇADO):', {
        messageId: message.id,
        chatId: message.chat_id,
        contentLength: message.content?.length || 0,
        originalContent: message.content
      });

      // 🔓 OBRIGATÓRIO: Sempre tentar desencriptar
      const decryptedContent = EncryptionService.processMessageForDisplay(message.content, chatId);
      
      const processedMessage = {
        ...message,
        content: decryptedContent
      };

      console.log('✅ Mensagem processada com sucesso (FORÇADO):', {
        messageId: message.id,
        originalLength: message.content?.length || 0,
        decryptedLength: decryptedContent.length,
        wasEncrypted: message.content !== decryptedContent,
        finalContent: decryptedContent
      });

      return processedMessage;
    } catch (error) {
      console.error('❌ Erro ao processar mensagem recebida (FORÇADO):', error);
      
      // Em caso de erro, retornar mensagem com aviso
      return {
        ...message,
        content: `[ERRO DE DESENCRIPTAÇÃO] ${message.content}`
      };
    }
  }, [chatId]);

  /**
   * Processa uma mensagem antes de enviar
   * @param content - Conteúdo original da mensagem
   * @returns Conteúdo encriptado
   */
  const processOutgoingMessage = useCallback((content: string): string => {
    try {
      console.log('🔐 Processando mensagem para envio:', {
        chatId,
        contentLength: content.length
      });

      // Encriptar mensagem
      const encryptedContent = EncryptionService.processMessageForStorage(content, chatId);
      
      console.log('✅ Mensagem processada para envio:', {
        originalLength: content.length,
        encryptedLength: encryptedContent.length
      });

      return encryptedContent;
    } catch (error) {
      console.error('❌ Erro ao processar mensagem para envio:', error);
      // Retornar conteúdo original em caso de erro
      return content;
    }
  }, [chatId]);

  /**
   * Verifica se uma mensagem está encriptada
   * @param message - Mensagem para verificar
   * @returns true se a mensagem parece estar encriptada
   */
  const isMessageEncrypted = useCallback((message: string): boolean => {
    return EncryptionService.isEncrypted(message);
  }, []);

  /**
   * Testa a encriptação para o chat atual
   * @param testMessage - Mensagem de teste
   * @returns Resultado do teste
   */
  const testEncryption = useCallback((testMessage: string = "Teste de encriptação") => {
    try {
      console.log('🧪 Testando encriptação para o chat:', chatId);
      
      // Encriptar
      const encrypted = EncryptionService.encryptMessage(testMessage, chatId);
      
      // Desencriptar
      const decrypted = EncryptionService.decryptMessage(encrypted, chatId);
      
      const success = decrypted === testMessage;
      
      console.log('🧪 Resultado do teste:', {
        success,
        original: testMessage,
        encrypted: encrypted.substring(0, 20) + '...',
        decrypted
      });
      
      return {
        success,
        original: testMessage,
        encrypted,
        decrypted
      };
    } catch (error) {
      console.error('❌ Erro no teste de encriptação:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }, [chatId]);

  return {
    processIncomingMessage,
    processOutgoingMessage,
    isMessageEncrypted,
    testEncryption
  };
}
