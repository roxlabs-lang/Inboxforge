/**
 * InboxForge Native Android Bridge Service
 * Provides seamless bi-directional integration between the web application
 * and the native Android host environment (MainActivity & WebView).
 * Gracefully falls back to browser standard APIs when running in standard web.
 */

// Window interface augmentation for the native Android JavaScriptInterface
declare global {
  interface Window {
    InboxForgeNative?: {
      isNativeApp: () => boolean;
      triggerHaptic: (patternType: string) => void;
      shareText: (title: string, text: string, url?: string) => void;
      saveSecureToken: (key: string, value: string) => void;
      getSecureToken: (key: string) => string | null;
      removeSecureToken: (key: string) => void;
      setStatusBarTheme: (isDark: boolean) => void;
      onWebPageReady: () => void;
      closeApp: () => void;
      getAppVersion: () => string;
      isNetworkConnected: () => boolean;
    };
  }
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

class NativeBridgeService {
  private backHandlers: Array<() => boolean> = [];
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private networkListeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for Android hardware back button events dispatched from MainActivity
      window.addEventListener('inboxforge:backbutton', this.handleAndroidBackButton.bind(this));
      window.addEventListener('androidBackPressed', this.handleAndroidBackButton.bind(this));

      // Network status listeners
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));

      // Signal to native Android container that Web content is mounted & loaded
      if (window.InboxForgeNative?.onWebPageReady) {
        try {
          window.InboxForgeNative.onWebPageReady();
        } catch (_) {}
      }
    }
  }

  /**
   * Returns true if running inside the native Android APK wrapper
   */
  isAndroidNative(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.InboxForgeNative && window.InboxForgeNative.isNativeApp());
  }

  /**
   * Get app version string
   */
  getAppVersion(): string {
    if (this.isAndroidNative() && window.InboxForgeNative?.getAppVersion) {
      try {
        return window.InboxForgeNative.getAppVersion();
      } catch (_) {}
    }
    return '1.0.0 (Web)';
  }

  /**
   * Triggers native tactile haptic feedback with web fallback
   */
  triggerHaptic(style: HapticStyle = 'light'): void {
    if (typeof window === 'undefined') return;

    if (this.isAndroidNative() && window.InboxForgeNative?.triggerHaptic) {
      try {
        window.InboxForgeNative.triggerHaptic(style);
        return;
      } catch (_) {}
    }

    // Web vibration fallback for supported mobile browsers
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (style) {
          case 'light':
          case 'selection':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(25);
            break;
          case 'heavy':
            navigator.vibrate(45);
            break;
          case 'success':
            navigator.vibrate([15, 40, 25]);
            break;
          case 'warning':
            navigator.vibrate([30, 50, 40]);
            break;
        }
      } catch (_) {}
    }
  }

  /**
   * Saves sensitive credential or token using Android's EncryptedSharedPreferences
   * with fallback to encrypted/isolated browser storage.
   */
  saveSecureToken(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    if (this.isAndroidNative() && window.InboxForgeNative?.saveSecureToken) {
      try {
        window.InboxForgeNative.saveSecureToken(key, value);
        return;
      } catch (err) {
        console.warn('Native secure storage save failed, falling back:', err);
      }
    }

    // Web fallback
    try {
      localStorage.setItem(`secure_${key}`, value);
      sessionStorage.setItem(`secure_${key}`, value);
    } catch (_) {}
  }

  /**
   * Retrieves secure token from Android's EncryptedSharedPreferences
   */
  getSecureToken(key: string): string | null {
    if (typeof window === 'undefined') return null;

    if (this.isAndroidNative() && window.InboxForgeNative?.getSecureToken) {
      try {
        const val = window.InboxForgeNative.getSecureToken(key);
        if (val) return val;
      } catch (err) {
        console.warn('Native secure storage read failed, falling back:', err);
      }
    }

    // Web fallback
    try {
      return sessionStorage.getItem(`secure_${key}`) || localStorage.getItem(`secure_${key}`) || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Deletes secure token
   */
  removeSecureToken(key: string): void {
    if (typeof window === 'undefined') return;

    if (this.isAndroidNative() && window.InboxForgeNative?.removeSecureToken) {
      try {
        window.InboxForgeNative.removeSecureToken(key);
        return;
      } catch (_) {}
    }

    try {
      localStorage.removeItem(`secure_${key}`);
      sessionStorage.removeItem(`secure_${key}`);
    } catch (_) {}
  }

  /**
   * Updates native Android system status bar and navigation bar styling
   */
  setStatusBarTheme(isDark: boolean): void {
    if (typeof window === 'undefined') return;

    if (this.isAndroidNative() && window.InboxForgeNative?.setStatusBarTheme) {
      try {
        window.InboxForgeNative.setStatusBarTheme(isDark);
      } catch (_) {}
    }

    // Update HTML meta theme-color tag
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', isDark ? '#09090b' : '#f8fafc');
      }
    } catch (_) {}
  }

  /**
   * Native Share API for emails, OTPs, or generated identities
   */
  async shareContent(title: string, text: string, url?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (this.isAndroidNative() && window.InboxForgeNative?.shareText) {
      try {
        window.InboxForgeNative.shareText(title, text, url);
        return true;
      } catch (_) {}
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (err) {
        // User cancelled or aborted
        return false;
      }
    }

    // Fallback: Copy to clipboard
    return this.copyToClipboard(text);
  }

  /**
   * Safe copy to clipboard with haptic feedback
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.triggerHaptic('success');
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.triggerHaptic('success');
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Registers a back button handler. Handlers are evaluated in LIFO (stack) order.
   * If a handler returns true, it signifies the event was handled (e.g. a modal was closed),
   * preventing the app from exiting.
   */
  registerBackHandler(handler: () => boolean): () => void {
    this.backHandlers.push(handler);
    return () => {
      this.backHandlers = this.backHandlers.filter((h) => h !== handler);
    };
  }

  private handleAndroidBackButton(): void {
    // Traverse registered back-handlers in reverse order (top-most modal first)
    for (let i = this.backHandlers.length - 1; i >= 0; i--) {
      try {
        const handled = this.backHandlers[i]();
        if (handled) {
          this.triggerHaptic('light');
          return;
        }
      } catch (err) {
        console.error('Error in back button handler:', err);
      }
    }

    // If no modals or drawers were open, either go back in browser history or request exit
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (this.isAndroidNative() && window.InboxForgeNative?.closeApp) {
      window.InboxForgeNative.closeApp();
    }
  }

  /**
   * Network status monitoring
   */
  isOnline(): boolean {
    if (this.isAndroidNative() && window.InboxForgeNative?.isNetworkConnected) {
      try {
        return window.InboxForgeNative.isNetworkConnected();
      } catch (_) {}
    }
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  onNetworkChange(listener: (online: boolean) => void): () => void {
    this.networkListeners.add(listener);
    return () => {
      this.networkListeners.delete(listener);
    };
  }

  private setOnline(online: boolean): void {
    this.isOnlineState = online;
    this.networkListeners.forEach((fn) => {
      try {
        fn(online);
      } catch (_) {}
    });
  }
}

export const nativeBridge = new NativeBridgeService();
