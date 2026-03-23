// SessionList.tsxの支払い実行部分の完全な修正版
// このコードを既存のSessionList.tsxに統合してください

// ========== 状態の追加（既存の状態の後に追加）==========
  // 支払い実行待機用の状態
  const [pendingPaymentSession, setPendingPaymentSession] = useState<PaymentSession | null>(null);

// ========== useEffectの追加（既存のuseEffectの後に追加）==========
  // ウォレット接続後、自動的に支払いを実行
  useEffect(() => {
    if (wallet && pendingPaymentSession) {
      console.log('✅ ウォレット接続完了 - 支払い実行を自動開始');
      executePaymentsInternal(pendingPaymentSession);
      setPendingPaymentSession(null);
    }
  }, [wallet, pendingPaymentSession]);

// ========== handleExecutePayments（既存のものを置き換え）==========
  const handleExecutePayments = async (session: PaymentSession) => {
    console.log('=== handleExecutePayments 開始 ===');
    console.log('wallet状態:', wallet);
    
    // ウォレット未接続の場合
    if (!wallet) {
      console.log('ウォレット未接続 - 接続後に自動実行します');
      const confirmed = window.confirm('ウォレットを接続しますか？');
      if (!confirmed) return;
      
      try {
        console.log('connectWallet呼び出し');
        await connectWallet();
        console.log('connectWallet完了 - useEffectが自動実行します');
        // 接続後の実行をuseEffectに任せる
        setPendingPaymentSession(session);
        return;
      } catch (error) {
        console.error('ウォレット接続失敗:', error);
        alert('ウォレット接続に失敗しました');
        return;
      }
    }

    // ウォレット接続済みの場合、直接実行
    console.log('ウォレット接続済み - 直接実行');
    executePaymentsInternal(session);
  };

// ========== executePaymentsInternal（新規追加）==========
  const executePaymentsInternal = async (session: PaymentSession) => {
    console.log('=== executePaymentsInternal 開始 ===');
    
    if (!wallet) {
      console.error('エラー: walletがnull');
      alert('ウォレットが接続されていません。ページをリロードしてください。');
      return;
    }

    console.log('wallet.address:', wallet.address);
    console.log('wallet.chainId:', wallet.chainId);

    // 1. ネットワーク整合性チェック
    const networkValidation = SessionService.validateNetworkConsistency(session.id);
    if (!networkValidation.valid) {
      alert(`ネットワークエラー\n\n${networkValidation.error}\n\nセッションを修正してから再度実行してください。`);
      return;
    }

    // 2. 実行可能なレコードを取得
    const pendingRecords = session.paymentRecords?.filter(
      r => r.status === 'Pending'
    ) || [];

    if (pendingRecords.length === 0) {
      alert('実行可能な支払いがありません');
      return;
    }

    // 3. ネットワーク一致確認
    if (networkValidation.networkId && wallet.chainId !== networkValidation.networkId) {
      const sessionNetwork = pendingRecords[0]?.networkConfiguration?.name || `Chain ID ${networkValidation.networkId}`;
      alert(
        `ネットワークの不一致\n\n` +
        `セッションのネットワーク: ${sessionNetwork}\n` +
        `ウォレットのネットワーク: Chain ID ${wallet.chainId}\n\n` +
        `MetaMaskで正しいネットワークに切り替えてから再度実行してください。`
      );
      return;
    }

    // 4. ガス代チェック
    console.log('ガス代チェック開始');
    const hasGas = await checkGasBalance(wallet);
    if (!hasGas) return;

    // 5. 確認ダイアログ
    const totalAmount = pendingRecords.reduce((sum, r) => sum + r.amount, 0);
    const confirmed = window.confirm(
      `${pendingRecords.length}件の支払いを実行しますか？\n` +
      `合計金額: ${totalAmount} ${pendingRecords[0].tokenConfiguration?.symbol || 'トークン'}\n\n` +
      `注意: この操作は取り消せません。`
    );

    if (!confirmed) return;

    // 6. 支払い実行
    console.log('支払い実行開始');
    setIsExecuting(true);
    setExecutionProgress({ current: 0, total: pendingRecords.length });
    setExecutionResults(null);

    try {
      const results = await BlockchainService.sendBatch(
        wallet.signer,
        pendingRecords,
        (current, total) => {
          setExecutionProgress({ current, total });
        }
      );

      // 7. 結果を保存
      for (const result of results.results) {
        if (result.txHash) {
          await SessionService.updatePaymentAfterExecution(
            session.id,
            result.paymentId,
            result.txHash,
            false
          );
        }
      }

      // 8. 結果を表示
      setExecutionResults(results);
      alert(
        `支払い実行完了\n` +
        `成功: ${results.success}件\n` +
        `失敗: ${results.failed}件`
      );

      loadSessions();
      if (selectedSession) {
        const updatedSession = SessionService.getSession(selectedSession.id);
        if (updatedSession) {
          setSelectedSession(updatedSession);
        }
      }

    } catch (error) {
      console.error('支払い実行エラー:', error);
      alert(`支払い実行に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsExecuting(false);
    }
  };
