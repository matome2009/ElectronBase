import { ethers } from 'ethers';
import type { WalletClient } from 'viem';

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
      request: async ({ method, params }: any) => {
        // wagmiのtransportを使ってリクエストを送信
        if (method === 'eth_sendTransaction') {
          const hash = await walletClient.sendTransaction(params[0]);
          return hash;
        }
        
        if (method === 'eth_accounts') {
          return [account.address];
        }
        
        if (method === 'eth_chainId') {
          return `0x${chain.id.toString(16)}`;
        }
        
        if (method === 'eth_requestAccounts') {
          return [account.address];
        }

        // その他のメソッドはtransportに委譲
        return transport.request({ method, params } as any);
      },
    },
    network
  );

  // Signerを作成
  return await provider.getSigner(account.address);
}
