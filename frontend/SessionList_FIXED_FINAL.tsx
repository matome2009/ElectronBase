// 完全修正版 SessionList.tsx
// このファイルの内容を frontend/src/renderer/components/SessionList.tsx にコピーしてください

import React, { useEffect, useState } from 'react';
import { PaymentSession, PaymentRecord, VerificationStatus } from '../types';
import { SessionService } from '../services/SessionService';
import { BlockchainService } from '../services/BlockchainService';
import { useDirectWallet } from '../hooks/useDirectWallet';
import { ethers } from 'ethers';

// Props定義を追加
interface SessionListProps {
  wallet?: {
    address: string;
    signer: ethers.Signer;
    provider?: ethers.Provider;
  } | null;
}

const SessionList: React.FC<SessionListProps> = ({ wallet: externalWallet }) => {
  const [sessions, setSessions] = useState<PaymentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PaymentSession | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{
    current: number;
    total: number;
    status: string;
  } | null>(null);

  // ウォレット接続 - 外部から渡されたwalletを優先、なければuseDirectWalletを使用
  const { wallet: directWallet, connectWallet, isConnecting, error: walletError } = useDirectWallet();
  const wallet = externalWallet || directWallet;

  // 支払い実行状態
  const [executionResults, setExecutionResults] = useState<{
    success: number;
    failed: number;
    details: Array<{ record: PaymentRecord; success: boolean; error?: string }>;
  } | null>(null);

  // ガス代チェック
  const checkGasBalance = async (walletToCheck: typeof wallet) => {
    if (!walletToCheck) return false;

    try {
      const balance = await walletToCheck.provider!.getBalance(walletToCheck.address);
      const balanceInEth = ethers.formatEther(balance);
      if (parseFloat(balanceInEth) < 0.01) {
        alert(`ガス代が不足しています。\n現在の残高: ${balanceInEth} ETH\n最低必要額: 0.01 ETH`);
        return false;
      }
      return true;
    } catch (error) {
      console.error('ガス代チェックエラー:', error);
      return false;
    }
  };

  // 支払い実行（修正版）
  const handleExecutePayments = async (session: PaymentSession) => {
    try {
      console.log('=== handleExecutePayments 開始 ===');
      console.log('wallet状態:', wallet);
      console.log('wallet存在:', !!wallet);

      // 1. ネットワーク整合性チェック
      const networkValidation = SessionService.validateNetworkConsistency(session);
      if (!networkValidation.isValid) {
        alert(`ネットワークエラー\n\n${networkValidation.error}\n\n異なるネットワークのレコードは別々のセッションに分ける必要があります。`);
        return;
      }

      // 2. ウォレット接続確認（簡素化）
      if (!wallet) {
        alert('ウォレットが接続されていません。画面上部の「ウォレット接続」ボタンから接続してください。');
        return;
      }

      console.log('ウォレット接続済み - 処理を続行');
      console.log('wallet.address:', wallet.address);
      console.log('wallet.chainId:', wallet.signer);

      // 3. 実行可能なレコードを取得
      const pendingRecords = session.paymentRecords?.filter(
        (r) => r.status === 'Pending' && r.verificationStatus === 'Verified'
      ) || [];

      if (pendingRecords.length === 0) {
        alert('実行可能な支払いレコードがありません。');
        return;
      }

      // 4. ウォレットのネットワークとセッションのネットワークが一致するか確認
      // Note: privateKeyWalletの場合、chainIdがない可能性があるのでスキップ
      if (wallet && 'chainId' in wallet && networkValidation.networkId && (wallet as any).chainId !== networkValidation.networkId) {
        const sessionNetwork = pendingRecords[0]?.networkConfiguration?.name || `Chain ID ${networkValidation.networkId}`;
        const walletNetwork = (wallet as any).chainId;
        alert(
          `ネットワークの不一致\n\n` +
          `セッションのネットワーク: ${sessionNetwork}\n` +
          `ウォレットのネットワーク: Chain ID ${walletNetwork}\n\n` +
          `ウォレットを正しいネットワークに切り替えてください。`
        );
        return;
      }

      // 5. ガス代チェック
      if (wallet.provider) {
        const hasEnoughGas = await checkGasBalance(wallet);
        if (!hasEnoughGas) return;
      }

      // 6. 確認ダイアログ
      const totalAmount = pendingRecords.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const confirmed = window.confirm(
        `${pendingRecords.length}件の支払いを実行します。\n` +
        `合計金額: ${totalAmount.toFixed(4)} ${pendingRecords[0]?.networkConfiguration?.nativeCurrency || 'ETH'}\n\n` +
        `実行しますか？`
      );

      if (!confirmed) return;

      // 7. 支払い実行
      setIsExecuting(true);
      setExecutionProgress({ current: 0, total: pendingRecords.length, status: '準備中...' });
      setExecutionResults(null);

      const results: Array<{ record: PaymentRecord; success: boolean; error?: string }> = [];
      let successCount = 0;
      let failedCount = 0;

      try {
        // BlockchainService.sendBatch()を使用
        const networkConfig = pendingRecords[0].networkConfiguration;
        if (!networkConfig) {
          throw new Error('ネットワーク設定が見つかりません');
        }

        setExecutionProgress({ current: 0, total: pendingRecords.length, status: 'バッチ送金を実行中...' });

        const batchResult = await BlockchainService.sendBatch(
          pendingRecords.map(r => ({
            to: r.recipientAddress,
            amount: r.amount
          })),
          wallet.signer,
          networkConfig
        );

        // 結果を処理
        for (let i = 0; i < pendingRecords.length; i++) {
          const record = pendingRecords[i];
          const success = batchResult.results[i].success;

          if (success) {
            record.status = 'Completed';
            record.transactionHash = batchResult.results[i].txHash;
            successCount++;
          } else {
            record.status = 'Failed';
            record.errorMessage = batchResult.results[i].error;
            failedCount++;
          }

          results.push({
            record,
            success,
            error: batchResult.results[i].error
          });

          setExecutionProgress({
            current: i + 1,
            total: pendingRecords.length,
            status: `処理中: ${i + 1}/${pendingRecords.length}`
          });
        }

        // セッションを更新
        await SessionService.updateSession(session.id, {
          ...session,
          paymentRecords: session.paymentRecords
        });

        // 結果を表示
        setExecutionResults({
          success: successCount,
          failed: failedCount,
          details: results
        });

        // セッションリストを更新
        loadSessions();

      } catch (error) {
        console.error('支払い実行エラー:', error);
        alert('支払い実行中にエラーが発生しました: ' + (error as Error).message);
      }

    } catch (error) {
      console.error('handleExecutePayments エラー:', error);
      alert('予期しないエラーが発生しました: ' + (error as Error).message);
    } finally {
      setIsExecuting(false);
      setExecutionProgress(null);
    }
  };

  // テスト支払い（修正版）
  const handleTestPayment = async (session: PaymentSession) => {
    try {
      // 1. ネットワーク整合性チェック
      const networkValidation = SessionService.validateNetworkConsistency(session);
      if (!networkValidation.isValid) {
        alert(`ネットワークエラー\n\n${networkValidation.error}`);
        return;
      }

      // 2. ウォレット接続確認（簡素化）
      if (!wallet) {
        alert('ウォレットが接続されていません。画面上部の「ウォレット接続」ボタンから接続してください。');
        return;
      }

      // 3. テスト用の最初のレコードを取得
      const testRecord = session.paymentRecords?.find(
        (r) => r.status === 'Pending' && r.verificationStatus === 'Verified'
      );

      if (!testRecord) {
        alert('テスト可能な支払いレコードがありません。');
        return;
      }

      // 4. ガス代チェック
      if (wallet.provider) {
        const hasEnoughGas = await checkGasBalance(wallet);
        if (!hasEnoughGas) return;
      }

      // 5. 確認ダイアログ
      const confirmed = window.confirm(
        `テスト支払いを実行します。\n` +
        `受取人: ${testRecord.recipientAddress}\n` +
        `金額: ${testRecord.amount} ${testRecord.networkConfiguration?.nativeCurrency || 'ETH'}\n\n` +
        `実行しますか？`
      );

      if (!confirmed) return;

      // 6. テスト支払い実行
      setIsExecuting(true);

      try {
        const networkConfig = testRecord.networkConfiguration;
        if (!networkConfig) {
          throw new Error('ネットワーク設定が見つかりません');
        }

        const result = await BlockchainService.sendBatch(
          [{ to: testRecord.recipientAddress, amount: testRecord.amount }],
          wallet.signer,
          networkConfig
        );

        if (result.results[0].success) {
          testRecord.status = 'Completed';
          testRecord.transactionHash = result.results[0].txHash;
          alert(`テスト支払いが成功しました！\nトランザクションハッシュ: ${result.results[0].txHash}`);
        } else {
          testRecord.status = 'Failed';
          testRecord.errorMessage = result.results[0].error;
          alert(`テスト支払いが失敗しました。\nエラー: ${result.results[0].error}`);
        }

        // セッションを更新
        await SessionService.updateSession(session.id, {
          ...session,
          paymentRecords: session.paymentRecords
        });

        // セッションリストを更新
        loadSessions();

      } catch (error) {
        console.error('テスト支払いエラー:', error);
        alert('テスト支払い中にエラーが発生しました: ' + (error as Error).message);
      }

    } catch (error) {
      console.error('handleTestPayment エラー:', error);
      alert('予期しないエラーが発生しました: ' + (error as Error).message);
    } finally {
      setIsExecuting(false);
    }
  };

  // セッション読み込み
  const loadSessions = async () => {
    try {
      const allSessions = await SessionService.getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('セッション読み込みエラー:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // 以下、UIレンダリング部分は既存のコードをそのまま使用
  // ...（省略）

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">支払いセッション</h2>
        
        {/* ウォレット接続状態表示 */}
        {wallet && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-sm text-gray-600 flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              接続済み: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </div>
          </div>
        )}

        {/* セッションリスト */}
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedSession(session)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{session.name}</h3>
                  <p className="text-sm text-gray-600">
                    {session.paymentRecords?.length || 0}件の支払い
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    作成日: {new Date(session.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 選択されたセッションの詳細 */}
        {selectedSession && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-xl font-bold mb-4">{selectedSession.name}</h3>
            
            {/* 実行ボタン */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => handleExecutePayments(selectedSession)}
                disabled={isExecuting || !selectedSession.paymentRecords?.some(r => r.status === 'Pending')}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? '実行中...' : '支払いを実行'}
              </button>
              <button
                onClick={() => handleTestPayment(selectedSession)}
                disabled={isExecuting || !selectedSession.paymentRecords?.some(r => r.status === 'Pending')}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                テスト支払い
              </button>
            </div>

            {/* 進捗表示 */}
            {executionProgress && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-semibold mb-2">{executionProgress.status}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(executionProgress.current / executionProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {executionProgress.current} / {executionProgress.total}
                </div>
              </div>
            )}

            {/* 実行結果 */}
            {executionResults && (
              <div className="mb-4 p-4 bg-gray-50 border rounded">
                <h4 className="font-semibold mb-2">実行結果</h4>
                <div className="text-sm space-y-1">
                  <div className="text-green-600">成功: {executionResults.success}件</div>
                  <div className="text-red-600">失敗: {executionResults.failed}件</div>
                </div>
              </div>
            )}

            {/* レコードリスト */}
            <div className="space-y-2">
              {selectedSession.paymentRecords?.map((record, index) => (
                <div key={index} className="border rounded p-3 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{record.recipientName}</div>
                      <div className="text-gray-600">{record.recipientAddress}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{record.amount} {record.networkConfiguration?.nativeCurrency || 'ETH'}</div>
                      <div className={`text-xs ${
                        record.status === 'Completed' ? 'text-green-600' :
                        record.status === 'Failed' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {record.status}
                      </div>
                    </div>
                  </div>
                  {record.transactionHash && (
                    <div className="mt-2 text-xs text-gray-600">
                      TX: {record.transactionHash.slice(0, 10)}...{record.transactionHash.slice(-8)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionList;
