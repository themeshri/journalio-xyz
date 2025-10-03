// Settings management utilities with best practices

export interface UserSettings {
  displayName: string;
  email: string;
  defaultWallet: string;
  transactionLimit: string;
  showUSDValues: boolean;
  darkMode: boolean;
}

const SETTINGS_KEY = 'walletTrackerSettings';

const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  email: '',
  defaultWallet: '',
  transactionLimit: '50',
  showUSDValues: true,
  darkMode: false,
};

/**
 * Get user settings from localStorage
 * Returns default settings if none exist
 */
export function getSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored);
    // Merge with defaults to handle new settings added over time
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings to localStorage
 */
export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Reset settings to default values
 */
export function resetSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

/**
 * Validate Solana wallet address format
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are 32-44 characters, base58 encoded
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}
