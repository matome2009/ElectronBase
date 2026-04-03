function readBooleanEnv(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const OPTIONAL_API_FLAGS = {
  billing: readBooleanEnv('ENABLE_BILLING_API', false),
  wallet: readBooleanEnv('ENABLE_WALLET_API', false),
  transaction: readBooleanEnv('ENABLE_TRANSACTION_API', false),
  contact: readBooleanEnv('ENABLE_CONTACT_API', false),
  label: readBooleanEnv('ENABLE_LABEL_API', false),
};
