export interface Settings {
  darkMode: boolean;
  notifications: boolean;
  autoComplete: boolean;
  backendUrl: string;
}

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: Settings;
  private listeners: Map<keyof Settings, Set<(value: any) => void>> = new Map();
  private readonly STORAGE_KEY = 'genesis-ai-settings';

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private loadSettings(): Settings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const defaults: Settings = {
      darkMode: false,
      notifications: true,
      autoComplete: true,
      backendUrl: 'http://localhost:8000/api/chat'
    };

    if (stored) {
      try {
        return { ...defaults, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }

    return defaults;
  }

  private saveSettings(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    if (this.settings[key] !== value) {
      this.settings[key] = value;
      this.saveSettings();
      this.notifyListeners(key, value);
    }
  }

  getAll(): Settings {
    return { ...this.settings };
  }

  subscribe<K extends keyof Settings>(key: K, callback: (value: Settings[K]) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  private notifyListeners<K extends keyof Settings>(key: K, value: Settings[K]): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(value));
    }
  }
}