// NotificationService - esqueleto
// Fornece: notify(), requestPermission(), setPreferences(), on/off events
// Coordena entre abas via BroadcastChannel (fallback localStorage) e faz dedupe simples.

import { EncryptionService } from '@/services/encryption';

type NotifyPayload = {
  messageId: string;
  chatId: string;
  // processedContent (desencriptado) é preferencial — caller deve prover sempre que possível
  processedContent?: string;
  // rawContent (encriptado) aceito como fallback; service tentará desencriptar UMA vez
  rawContent?: string;
  senderName?: string;
  senderType?: 'psicologo' | 'app_user';
  previewAllowed?: boolean;
  created_at?: string;
  tag?: string;
};

type NotifyResult = { shown: boolean; reason?: string };

type Preferences = {
  enabled: boolean;
  preview: boolean;
};

type InternalDedupeEntry = {
  expiresAt: number;
};

type NotificationHandler = (payload?: unknown) => void;

class NotificationService {
  private channel: BroadcastChannel | null = null;
  private tabId = Math.random().toString(36).slice(2, 9);
  private dedupeMap: Map<string, InternalDedupeEntry> = new Map();
  private dedupeTTL = 60 * 1000; // 60s default
  private claimWait = 60; // ms to wait after announcing claim to avoid race
  private cleanupTimer: number | null = null;
  private listeners = new Map<string, Set<NotificationHandler>>();
  private prefKey = 'cms_notifications_preferences_v1';
  private localDedupePrefix = 'cms_notif_seen_';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initChannel();
      this.startCleanup();
    }
  }

  private initChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('cms-notifications');
        this.channel.addEventListener('message', (ev: MessageEvent) => this.handleChannelMessage(ev.data));
      } else if (typeof window !== 'undefined') {
        // fallback: listen to storage events (narrow window type)
        const w = window as unknown as Window & typeof globalThis;
        if (typeof w.addEventListener === 'function') {
          w.addEventListener('storage', (ev: StorageEvent) => this.handleStorageEvent(ev));
        }
      }
    } catch {
      // Feature not supported or blocked
      this.channel = null;
    }
  }

  private handleChannelMessage(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const d = data as Record<string, unknown>;
    const type = typeof d.type === 'string' ? d.type : undefined;
    const messageId = typeof d.messageId === 'string' ? d.messageId : undefined;
    if ((type === 'will-show' || type === 'claim') && messageId) {
      // mark dedupe locally when another tab claims the message
      this.markSeenLocal(messageId);
    }
  }

  private handleStorageEvent(ev: StorageEvent) {
    if (!ev.key) return;
    if (ev.key.startsWith(this.localDedupePrefix)) {
      // storage update used as fallback coordination
      const messageId = ev.key.substring(this.localDedupePrefix.length);
      this.markSeenLocal(messageId);
    }
  }

  private startCleanup() {
    if (typeof window === 'undefined') return;
    this.cleanupTimer = window.setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of Array.from(this.dedupeMap.entries())) {
        if (entry.expiresAt <= now) this.dedupeMap.delete(key);
      }
    }, 30 * 1000) as unknown as number;
  }

  private markSeenLocal(messageId: string) {
    this.dedupeMap.set(messageId, { expiresAt: Date.now() + this.dedupeTTL });
  }

  private hasSeen(messageId: string) {
    const entry = this.dedupeMap.get(messageId);
    if (entry && entry.expiresAt > Date.now()) return true;
    return false;
  }

  private markSeenPersistent(messageId: string) {
    try {
      const key = this.localDedupePrefix + messageId;
      localStorage.setItem(key, String(Date.now()));
      // also keep in-memory
      this.markSeenLocal(messageId);
      this.cleanupPersistentKey(messageId);
    } catch {
      // ignore storage errors
    }
  }

  private cleanupPersistentKey(messageId: string) {
    try {
      const key = this.localDedupePrefix + messageId;
      setTimeout(() => {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
      }, this.dedupeTTL);
    } catch { /* ignore */ }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    try {
      const p = await Notification.requestPermission();
      return p;
    } catch {
      return 'denied';
    }
  }

  setPreferences(pref: Preferences) {
    try {
      localStorage.setItem(this.prefKey, JSON.stringify(pref));
      this.emit('prefsChanged', pref);
    } catch {
      // ignore
    }
  }

  getPreferences(): Preferences {
    try {
      const raw = localStorage.getItem(this.prefKey);
      if (raw) return JSON.parse(raw) as Preferences;
    } catch {
      // ignore
    }
    return { enabled: true, preview: true };
  }

  on(event: string, handler: NotificationHandler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: NotificationHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload?: unknown) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch { /* ignore */ }
    }
  }

  async notify(payload: NotifyPayload): Promise<NotifyResult> {
    if (!payload || !payload.messageId) return { shown: false, reason: 'invalid-payload' };

    // Dedup in-memory
    if (this.hasSeen(payload.messageId)) return { shown: false, reason: 'deduped' };

    // Coordination: announce a claim to other tabs and persist a marker
    const claimKey = this.localDedupePrefix + payload.messageId;
    try {
      if (this.channel) {
        try { this.channel.postMessage({ type: 'claim', messageId: payload.messageId, tabId: this.tabId }); } catch { /* ignore */ }
      } else {
        // fallback: write to localStorage to signal other tabs
        localStorage.setItem(claimKey, String(Date.now()));
      }
    } catch {
      // ignore
    }

    // Wait briefly to allow other tabs to mark the message as seen
    await new Promise(resolve => setTimeout(resolve, this.claimWait));

    // If some other tab already marked it seen, abort
    if (this.hasSeen(payload.messageId)) return { shown: false, reason: 'deduped-after-claim' };

    // Mark persistent now (we will show)
    this.markSeenPersistent(payload.messageId);

    // Preferences
    const prefs = this.getPreferences();
    if (!prefs.enabled) return { shown: false, reason: 'disabled' };

    // Compose text: prefer processedContent. If missing, try rawContent -> decrypt once as fallback.
    let body = 'Nova mensagem';
    if (prefs.preview && payload.processedContent) {
      body = payload.processedContent;
    } else if (prefs.preview && payload.rawContent) {
      try {
        // Try decrypt once as fallback. Do not persist result.
        const decrypted = EncryptionService.processMessageForDisplay(payload.rawContent, payload.chatId);
        body = decrypted || 'Nova mensagem';
        // Note: do not write decrypted content to storage or broadcast it.
        console.warn('[NotificationService] processedContent missing: used rawContent fallback for message', payload.messageId);
      } catch {
        console.warn('[NotificationService] fallback decryption failed for message', payload.messageId);
        body = 'Nova mensagem';
      }
    }
    const title = 'Nova mensagem';

    // System notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const options: NotificationOptions = {
          body,
          tag: payload.tag || `chat-${payload.chatId}`,
          silent: false
        };
        // Create notification
        // Not replacing existing application state; service is passive
        new Notification(title, options);
        this.emit('shown', { payload });
        return { shown: true };
      } catch {
        // fallback to in-app
      }
    }

    // Fallback: notify UI via event (caller can show visual toast)
    this.emit('inApp', { payload, text: body });
    return { shown: false, reason: 'in-app' };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
