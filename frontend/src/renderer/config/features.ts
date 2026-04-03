function readBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const FEATURE_FLAGS = {
  billing: readBooleanEnv(import.meta.env.VITE_ENABLE_BILLING as string | undefined, false),
  watchedWallets: readBooleanEnv(import.meta.env.VITE_ENABLE_WATCHED_WALLETS as string | undefined, false),
  transactions: readBooleanEnv(import.meta.env.VITE_ENABLE_TRANSACTIONS as string | undefined, false),
  contacts: readBooleanEnv(import.meta.env.VITE_ENABLE_CONTACTS as string | undefined, false),
  labels: readBooleanEnv(import.meta.env.VITE_ENABLE_LABELS as string | undefined, false),
};

export const ENABLE_WORKSPACE = FEATURE_FLAGS.billing || FEATURE_FLAGS.watchedWallets || FEATURE_FLAGS.labels;
export const ENABLE_INBOX = FEATURE_FLAGS.transactions;
export const ENABLE_CONTACTS = FEATURE_FLAGS.contacts;
export const HAS_OPTIONAL_FEATURES = ENABLE_WORKSPACE || ENABLE_INBOX || ENABLE_CONTACTS;

export function getEnabledOptionalFeatureKeys(): string[] {
  const keys: string[] = [];
  if (FEATURE_FLAGS.billing) keys.push('billing');
  if (FEATURE_FLAGS.watchedWallets) keys.push('watchedWallets');
  if (FEATURE_FLAGS.transactions) keys.push('transactions');
  if (FEATURE_FLAGS.contacts) keys.push('contacts');
  if (FEATURE_FLAGS.labels) keys.push('labels');
  return keys;
}
