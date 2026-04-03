import { LoggingService } from '../../services/LoggingService';
import { getAlchemyBaseUrl } from '../../config/chains';
import {
  ChainId,
  AlchemyTransfer,
  AlchemyAssetTransfersResponse,
} from '../../models/index';

/** 開発時モックデータ（VITE_ALCHEMY_API_KEY 未設定時に使用） */
const MOCK_TRANSFERS: AlchemyTransfer[] = [
  {
    blockNum: '0x12a05f2',
    hash: '0xmock0000000000000000000000000000000000000000000000000000000001',
    from: '0x0000000000000000000000000000000000000001',
    to:   '0x0000000000000000000000000000000000000002',
    value: 1.5,
    asset: 'ETH',
    category: 'external',
    rawContract: {
      value: '0x14d1120d7b160000',
      address: null,
      decimal: '0x12',
    },
    metadata: { blockTimestamp: new Date().toISOString() },
    tokenId: null,
    erc1155Metadata: null,
  },
  {
    blockNum: '0x12a05f1',
    hash: '0xmock0000000000000000000000000000000000000000000000000000000002',
    from: '0x0000000000000000000000000000000000000003',
    to:   '0x0000000000000000000000000000000000000001',
    value: 100,
    asset: 'USDC',
    category: 'erc20',
    rawContract: {
      value: '0x5F5E100',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimal: '0x6',
    },
    metadata: { blockTimestamp: new Date(Date.now() - 3600_000).toISOString() },
    tokenId: null,
    erc1155Metadata: null,
  },
];

export class AlchemyService {
  private static getApiKey(): string | null {
    return import.meta.env.VITE_ALCHEMY_API_KEY || null;
  }

  static isMockMode(): boolean {
    return !this.getApiKey();
  }

  /**
   * Alchemy alchemy_getAssetTransfers を呼び出す。
   * VITE_ALCHEMY_API_KEY が未設定の場合はモックデータを返す（開発用）。
   *
   * @param chainId   対象チェーンID
   * @param address   監視対象ウォレットアドレス
   * @param direction 'in' = toAddress, 'out' = fromAddress
   * @param pageKey   ページネーション継続キー（省略で先頭から）
   */
  static async getAssetTransfers(
    chainId: ChainId,
    address: string,
    direction: 'in' | 'out',
    pageKey?: string,
  ): Promise<AlchemyAssetTransfersResponse> {
    if (this.isMockMode()) {
      const IS_PRODUCTION = import.meta.env.VITE_ENV === 'production' || import.meta.env.VITE_ENV === 'prd';
      if (IS_PRODUCTION) {
        LoggingService.error('AlchemyService: 本番環境で VITE_ALCHEMY_API_KEY が未設定です。モックデータを返します');
      } else {
        LoggingService.warn('AlchemyService: VITE_ALCHEMY_API_KEY が未設定のためモックデータを返します');
      }
      // モックは direction に応じてフィルタして返す
      const filtered = MOCK_TRANSFERS.filter((t) =>
        direction === 'in'
          ? t.to?.toLowerCase() === address.toLowerCase()
          : t.from.toLowerCase() === address.toLowerCase(),
      );
      return { transfers: filtered };
    }

    const apiKey = this.getApiKey()!;
    const baseUrl = getAlchemyBaseUrl(chainId);
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} は Alchemy Enhanced API に未対応です`);
    }
    const url = `${baseUrl}/${apiKey}`;

    const params: Record<string, unknown> = {
      fromBlock: '0x0',
      toBlock: 'latest',
      category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: '0x64',  // 100件/ページ
    };

    if (direction === 'in') {
      params.toAddress = address;
    } else {
      params.fromAddress = address;
    }

    if (pageKey) {
      params.pageKey = pageKey;
    }

    LoggingService.debug('AlchemyService.getAssetTransfers', { chainId, address, direction, pageKey });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [params],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      LoggingService.error('AlchemyService HTTP error', { status: response.status, errorText });
      throw new Error(`Alchemy API error: ${response.status} ${errorText}`);
    }

    const json = await response.json() as {
      result: AlchemyAssetTransfersResponse;
      error?: { message: string };
    };

    if (json.error) {
      LoggingService.error('AlchemyService JSON-RPC error', { error: json.error });
      throw new Error(`Alchemy RPC error: ${json.error.message}`);
    }

    return json.result;
  }
}
