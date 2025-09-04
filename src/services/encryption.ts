import crypto from 'crypto';

export class EncryptionService {
  private static readonly SECRET_KEY = process.env.CHAT_ENCRYPTION_KEY || "chave_chat_comfy_secret_2025";
  
  /**
   * Gera a chave de encriptação única para um chat específico
   * @param chatId - ID do chat
   * @returns Chave SHA256 de 64 caracteres
   */
  static generateEncryptionKey(chatId: string): string {
    const combinedKey = `${chatId}${this.SECRET_KEY}`;
    return crypto.createHash('sha256').update(combinedKey).digest('hex');
  }
  
  /**
   * Converte string para array de bytes UTF-8
   */
  private static stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }
  
  /**
   * Converte array de bytes UTF-8 para string
   */
  private static bytesToString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
  }
  
  /**
   * Aplica operação XOR entre dois arrays de bytes
   */
  private static xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ key[i % key.length];
    }
    return result;
  }
  
  /**
   * Encripta uma mensagem usando XOR + Base64
   * @param message - Mensagem original
   * @param chatId - ID do chat
   * @returns Mensagem encriptada em Base64
   */
  static encryptMessage(message: string, chatId: string): string {
    try {
      console.log('🔐 Encriptando mensagem:', { chatId, messageLength: message.length });
      
      // Gerar chave única para o chat
      const encryptionKey = this.generateEncryptionKey(chatId);
      console.log('🔑 Chave de encriptação gerada:', encryptionKey.substring(0, 16) + '...');
      
      // Converter mensagem e chave para bytes
      const messageBytes = this.stringToBytes(message);
      const keyBytes = this.stringToBytes(encryptionKey);
      
      // Aplicar XOR
      const encryptedBytes = this.xorBytes(messageBytes, keyBytes);
      
      // Converter para Base64
      const encryptedBase64 = Buffer.from(encryptedBytes).toString('base64');
      
      console.log('✅ Mensagem encriptada com sucesso:', {
        originalLength: message.length,
        encryptedLength: encryptedBase64.length
      });
      
      return encryptedBase64;
    } catch (error) {
      console.error('❌ Erro ao encriptar mensagem:', error);
      throw new Error(`Falha na encriptação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
  
  /**
   * Desencripta uma mensagem usando XOR + Base64
   * @param encryptedMessage - Mensagem encriptada em Base64
   * @param chatId - ID do chat
   * @returns Mensagem original
   */
  static decryptMessage(encryptedMessage: string, chatId: string): string {
    try {
      console.log('🔓 Desencriptando mensagem:', { chatId, encryptedLength: encryptedMessage.length });
      
      // Gerar a mesma chave única para o chat
      const encryptionKey = this.generateEncryptionKey(chatId);
      console.log('🔑 Chave de desencriptação gerada:', encryptionKey.substring(0, 16) + '...');
      
      // Decodificar Base64
      const encryptedBytes = Buffer.from(encryptedMessage, 'base64');
      
      // Converter chave para bytes
      const keyBytes = this.stringToBytes(encryptionKey);
      
      // Aplicar XOR reverso (XOR é simétrico)
      const decryptedBytes = this.xorBytes(encryptedBytes, keyBytes);
      
      // Converter bytes para string UTF-8
      const decryptedMessage = this.bytesToString(decryptedBytes);
      
      console.log('✅ Mensagem desencriptada com sucesso:', {
        encryptedLength: encryptedMessage.length,
        decryptedLength: decryptedMessage.length
      });
      
      return decryptedMessage;
    } catch (error) {
      console.error('❌ Erro ao desencriptar mensagem:', error);
      throw new Error(`Falha na desencriptação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
  
  /**
   * Verifica se uma mensagem está encriptada de forma mais robusta
   * @param message - Mensagem para verificar
   * @returns true se a mensagem está definitivamente encriptada
   */
  static isDefinitelyEncrypted(message: string): boolean {
    // Verificar se a mensagem está vazia
    if (!message || message.length === 0) {
      return false;
    }
    
    // Verificar se a mensagem parece ser Base64 válido
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isBase64 = base64Regex.test(message);
    
    // Verificações para determinar se está definitivamente encriptada
    const hasSpecialChars = /[^A-Za-z0-9+/=]/.test(message);
    const hasSpaces = /\s/.test(message);
    const hasAccents = /[áéíóúâêîôûãõçñ]/.test(message);
    const isLongEnough = message.length >= 16; // Base64 encriptado geralmente é longo
    
    // Log para debug
    console.log('🔍 Verificando se mensagem está definitivamente encriptada:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      length: message.length,
      isBase64,
      hasSpecialChars,
      hasSpaces,
      hasAccents,
      isLongEnough
    });
    
    // Se tem caracteres especiais, espaços ou acentos, definitivamente não está encriptada
    if (hasSpecialChars || hasSpaces || hasAccents) {
      console.log('🔍 Mensagem tem caracteres especiais/espaços/acentos - não encriptada');
      return false;
    }
    
    // Para ser considerado definitivamente encriptado, deve ser Base64 E ter comprimento adequado
    const definitelyEncrypted = isBase64 && isLongEnough;
    
    console.log('🔍 Resultado da verificação:', definitelyEncrypted ? 'DEFINITIVAMENTE ENCRIPTADA' : 'NÃO ENCRIPTADA OU INCERTA');
    
    return definitelyEncrypted;
  }

  /**
   * Verifica se uma mensagem está encriptada (versão original mantida para compatibilidade)
   * @param message - Mensagem para verificar
   * @returns true se a mensagem parece estar encriptada em Base64
   */
  static isEncrypted(message: string): boolean {
    return this.isDefinitelyEncrypted(message);
  }

  /**
   * Verifica se uma mensagem precisa ser desencriptada
   * @param message - Mensagem para verificar
   * @returns true se a mensagem parece estar encriptada e precisa ser desencriptada
   */
  static needsDecryption(message: string): boolean {
    // Verificar se a mensagem está vazia
    if (!message || message.length === 0) {
      return false;
    }
    
    // Verificar se a mensagem parece ser Base64 válido
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isBase64 = base64Regex.test(message);
    
    // Verificações para determinar se precisa ser desencriptada
    const hasSpecialChars = /[^A-Za-z0-9+/=]/.test(message);
    const hasSpaces = /\s/.test(message);
    const hasAccents = /[áéíóúâêîôûãõçñ]/.test(message);
    
    // Log para debug
    console.log('🔍 Verificando se mensagem precisa ser desencriptada:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      length: message.length,
      isBase64,
      hasSpecialChars,
      hasSpaces,
      hasAccents
    });
    
    // Se tem caracteres especiais, espaços ou acentos, definitivamente não está encriptada
    if (hasSpecialChars || hasSpaces || hasAccents) {
      console.log('🔍 Mensagem tem caracteres especiais/espaços/acentos - não precisa desencriptar');
      return false;
    }
    
    // Se parece Base64, precisa tentar desencriptar
    const needsDecrypt = isBase64;
    
    console.log('🔍 Resultado da verificação:', needsDecrypt ? 'PRECISA DESENCRIPTAR' : 'NÃO PRECISA DESENCRIPTAR');
    
    return needsDecrypt;
  }
  
  /**
   * Processa uma mensagem automaticamente (encripta se necessário)
   * @param message - Mensagem original
   * @param chatId - ID do chat
   * @returns Mensagem encriptada
   */
  static processMessageForStorage(message: string, chatId: string): string {
    console.log('🔐 Processando mensagem para armazenamento:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      length: message.length,
      chatId
    });
    
    // Se a mensagem está vazia, retornar como está
    if (!message || message.trim().length === 0) {
      console.log('⚠️ Mensagem vazia, retornando como está');
      return message;
    }
    
    // Verificar se a mensagem está definitivamente encriptada
    const isDefinitelyEncrypted = this.isDefinitelyEncrypted(message);
    
    if (isDefinitelyEncrypted) {
      console.log('⚠️ Mensagem está definitivamente encriptada, mantendo como está');
      return message;
    }
    
    // Se não está definitivamente encriptada, encriptar
    console.log('🔐 Encriptando mensagem (não está definitivamente encriptada)...');
    const encryptedMessage = this.encryptMessage(message, chatId);
    
    console.log('✅ Mensagem processada para armazenamento:', {
      originalLength: message.length,
      encryptedLength: encryptedMessage.length,
      wasEncrypted: !isDefinitelyEncrypted
    });
    
    return encryptedMessage;
  }
  
  /**
   * Processa uma mensagem automaticamente (desencripta se necessário)
   * @param message - Mensagem do banco de dados
   * @param chatId - ID do chat
   * @returns Mensagem desencriptada
   */
  static processMessageForDisplay(message: string, chatId: string): string {
    console.log('🔓 Processando mensagem para exibição:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      length: message.length,
      chatId
    });
    
    // ✅ SEMPRE tentar desencriptar primeiro (abordagem mais robusta)
    try {
      console.log('🔓 Tentando desencriptar mensagem...');
      const decryptedMessage = this.decryptMessage(message, chatId);
      console.log('✅ Mensagem desencriptada com sucesso:', {
        originalLength: message.length,
        decryptedLength: decryptedMessage.length,
        originalContent: message,
        decryptedContent: decryptedMessage
      });
      return decryptedMessage;
    } catch (error) {
      console.log('⚠️ Falha ao desencriptar mensagem, verificando se precisa ser desencriptada:', error);
      
      // Se falhou, verificar se realmente precisa ser desencriptada
      if (this.needsDecryption(message)) {
        console.warn('⚠️ Mensagem parece precisar de desencriptação mas falhou, retornando como está');
        return message;
      } else {
        console.log('ℹ️ Mensagem não precisa ser desencriptada, retornando como está');
        return message;
      }
    }
  }
  
  /**
   * Testa o sistema de encriptação
   * @param chatId - ID do chat para teste
   * @returns Resultado dos testes
   */
  static runTests(chatId: string = "test-chat-123"): {
    success: boolean;
    tests: Array<{ name: string; passed: boolean; error?: string }>;
  } {
    const tests = [];
    
    try {
      // Teste 1: Geração de chave
      const key = this.generateEncryptionKey(chatId);
      tests.push({
        name: "Geração de chave SHA256",
        passed: key.length === 64 && /^[a-f0-9]+$/.test(key)
      });
      
      // Teste 2: Encriptação e desencriptação simples
      const testMessage = "Olá, esta é uma mensagem de teste!";
      const encrypted = this.encryptMessage(testMessage, chatId);
      const decrypted = this.decryptMessage(encrypted, chatId);
      
      tests.push({
        name: "Encriptação/Desencriptação simples",
        passed: decrypted === testMessage
      });
      
      // Teste 3: Detecção de mensagem encriptada
      tests.push({
        name: "Detecção de mensagem encriptada",
        passed: this.isEncrypted(encrypted) && !this.isEncrypted(testMessage)
      });
      
      // Teste 4: Processamento automático
      const processedForStorage = this.processMessageForStorage(testMessage, chatId);
      const processedForDisplay = this.processMessageForDisplay(processedForStorage, chatId);
      
      tests.push({
        name: "Processamento automático",
        passed: processedForDisplay === testMessage
      });
      
      // Teste 5: Mensagem com caracteres especiais
      const specialMessage = "Mensagem com acentos: áéíóú çãõ ñ";
      const encryptedSpecial = this.encryptMessage(specialMessage, chatId);
      const decryptedSpecial = this.decryptMessage(encryptedSpecial, chatId);
      
      tests.push({
        name: "Caracteres especiais",
        passed: decryptedSpecial === specialMessage
      });
      
      const allTestsPassed = tests.every(test => test.passed);
      
      console.log('🧪 Resultados dos testes de encriptação:', {
        totalTests: tests.length,
        passedTests: tests.filter(t => t.passed).length,
        failedTests: tests.filter(t => !t.passed).length
      });
      
      return {
        success: allTestsPassed,
        tests
      };
      
    } catch (error) {
      console.error('❌ Erro durante os testes de encriptação:', error);
      tests.push({
        name: "Execução dos testes",
        passed: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return {
        success: false,
        tests
      };
    }
  }
}
