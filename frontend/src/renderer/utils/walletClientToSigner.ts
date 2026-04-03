import { ethers } from 'ethers';
import type { WalletClient } from 'viem';

/** EIP-1193 リクエスト引数の型 */
type Eip1193RequestArgs = { method: string; params?: readonly unknown[] };

/**
 * wagmiのWalletClientをethersのSignerに変換
 */
export async function walletClientToSigner(walletClient: WalletClient): Promise<ethers.Signer> {
  const { account, chain, transport } = walletClient;
  
  if (!account) {
    throw new Error('WalletClient has no account');
  }
  
  if (!chain) {
    throw new Error('WalletClient has no chain');
  }

  // ethersのBrowserProviderを作成
  const network = {
    chainId: chain.id,
    name: chain.name,
  };

  // カスタムプロバイダーを作成
  const provider = new ethers.BrowserProvider(
    {
      request: async ({ method, params }: Eip1193RequestArgs) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [account.address];
        }

        if (method === 'eth_chainId') {
          return `0x${chain.id.toString(16)}`;
        }

        // personal_sign / eth_sign はwalletClient.signMessage()を直接使う。
        // transport.request()経由だとWalletConnect v2でモバイルに署名リクエストが届かないため。
        if (method === 'personal_sign') {
          const [data, addr] = params as [`0x${string}`, `0x${string}`];
          return walletClient.signMessage({
            account: addr,
            message: { raw: data },
          });
        }

        if (method === 'eth_sendTransaction') {
          type SendTxParams = Parameters<typeof walletClient.sendTransaction>[0];
          return walletClient.sendTransaction(params![0] as SendTxParams);
        }

        // その他のメソッドはtransportに委譲
        return (transport.request as (args: Eip1193RequestArgs) => Promise<unknown>)({ method, params });
      },
    },
    network
  );

  // Signerを作成
  return await provider.getSigner(account.address);
}
