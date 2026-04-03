import type { ProxyOptions } from 'vite';

type ViteEnv = Record<string, string | undefined>;
type OptionalProxyGroup = 'billing' | 'watchedWallets' | 'transactions' | 'contacts' | 'labels';

export const CORE_FUNCTIONS_PROXY_APIS = [
  'getNonce',
  'verifyWalletConnect',
  'verifyGoogleToken',
  'verifyLineToken',
  'startAsGuest',
  'linkLogin',
  'exchangeGoogleAuthCode',
  'linkGoogleAuthCode',
  'getVersions',
  'getMaintenance',
  'getMaintenanceAll',
  'getInformation',
];

export const OPTIONAL_FUNCTIONS_PROXY_APIS: Record<OptionalProxyGroup, readonly string[]> = {
  billing: [
    'getPlanStatus',
    'createPlanCheckout',
    'verifyPlanPayment',
  ],
  watchedWallets: [
    'addWatchedWallet',
    'getWatchedWallets',
    'deleteWatchedWallet',
    'toggleWatchedWallet',
    'updateWalletLabel',
  ],
  transactions: [
    'getTransactions',
    'getUserTransactionDeltas',
    'syncTransactions',
    'updateTransactionState',
  ],
  contacts: [
    'getContacts',
    'addContact',
    'updateContact',
    'deleteContact',
  ],
  labels: [
    'getLabels',
    'createLabel',
    'updateLabel',
    'deleteLabel',
    'assignLabel',
    'removeLabel',
  ],
} as const;

export const FUNCTIONS_PROXY_APIS = [
  ...CORE_FUNCTIONS_PROXY_APIS,
  ...Object.values(OPTIONAL_FUNCTIONS_PROXY_APIS).flat(),
] as const;

function readBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getEnabledFunctionsProxyApis(env: ViteEnv): string[] {
  const enabledApis = [...CORE_FUNCTIONS_PROXY_APIS];

  if (readBooleanEnv(env.VITE_ENABLE_BILLING, false)) {
    enabledApis.push(...OPTIONAL_FUNCTIONS_PROXY_APIS.billing);
  }
  if (readBooleanEnv(env.VITE_ENABLE_WATCHED_WALLETS, false)) {
    enabledApis.push(...OPTIONAL_FUNCTIONS_PROXY_APIS.watchedWallets);
  }
  if (readBooleanEnv(env.VITE_ENABLE_TRANSACTIONS, false)) {
    enabledApis.push(...OPTIONAL_FUNCTIONS_PROXY_APIS.transactions);
  }
  if (readBooleanEnv(env.VITE_ENABLE_CONTACTS, false)) {
    enabledApis.push(...OPTIONAL_FUNCTIONS_PROXY_APIS.contacts);
  }
  if (readBooleanEnv(env.VITE_ENABLE_LABELS, false)) {
    enabledApis.push(...OPTIONAL_FUNCTIONS_PROXY_APIS.labels);
  }

  return enabledApis;
}

export function getFunctionsTarget(env: ViteEnv): string {
  const explicitTarget = env.VITE_FUNCTIONS_URL || env.VITE_FUNCTIONS_PUBLIC_URL;
  if (explicitTarget) {
    return explicitTarget.replace(/\/+$/, '');
  }

  const region = env.VITE_FUNCTIONS_REGION || 'asia-northeast1';
  const projectId = env.VITE_FUNCTIONS_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('VITE_FUNCTIONS_PROJECT_ID or VITE_FIREBASE_PROJECT_ID is required');
  }

  return `https://${region}-${projectId}.cloudfunctions.net`;
}

export function buildFunctionsProxy(
  env: ViteEnv,
  suffix: 'Dev' | 'Prd' = 'Dev',
): Record<string, ProxyOptions> {
  const target = getFunctionsTarget(env);
  const enabledApis = getEnabledFunctionsProxyApis(env);

  return Object.fromEntries(
    enabledApis.map((apiName) => [
      `/api/${apiName}`,
      {
        target,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(`/api/${apiName}`, `/${apiName}${suffix}`),
      },
    ]),
  );
}
