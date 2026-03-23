// Token Batch Transfer 多言語対応
const translations = {
  ja: {
    site: {
      title: "Web3 Token Batch Transfer - ERC20トークン一括送金ツール"
    },
    nav: {
      features: "機能",
      networks: "対応ネットワーク",
      help: "ヘルプ",
      download: "ダウンロード"
    },
    hero: {
      title: "ERC20トークンの一括送金を<br>もっとシンプルに",
      subtitle: "CSVインポートで宛先を一括登録、ワンクリックで大量送金。<br>Web3での一括支払いに必要な全てが揃っています。",
      download: "無料ダウンロード",
      features: "機能を見る"
    },
    features: {
      title: "主な機能",
      csv: { title: "CSV一括インポート", desc: "送金先リストをCSVで一括インポート。重複検出・バリデーション付きで安全にセッションを作成できます。" },
      wallet: { title: "ウォレット接続", desc: "WalletConnect（QRコード）または秘密鍵でウォレットを接続。MetaMask等のモバイルウォレットにも対応。" },
      session: { title: "セッション管理", desc: "支払いセッションの作成・編集・複製・削除。ラベル管理・検索・ソートで大量のセッションも整理できます。" },
      batch: { title: "バッチ送金", desc: "MultiSendCallOnlyコントラクトを使用した効率的な一括送金。100件ずつ自動分割処理。" },
      kyc: { title: "KYC管理", desc: "受取人へのKYC通知送信・ステータス管理。承認済みアドレスリストで送金先を安全に管理。" },
      security: { title: "セキュリティ", desc: "Firebase認証による安全なログイン。ネットワーク整合性チェックで誤送金を防止。" }
    },
    networks: {
      title: "対応ネットワーク",
      mainnet: "メインネット",
      testnet: "テストネット"
    },
    cta: {
      title: "今すぐ始めましょう",
      subtitle: "無料でダウンロードして、すぐにERC20トークンの一括送金を開始できます。"
    },
    download: {
      title: "ダウンロード",
      subtitle: "お使いのプラットフォームを選択してください",
      comingSoon: "Coming Soon...",
      btnLinux: ".deb をダウンロード",
      version: "バージョン 1.5.0",
      requirements: "システム要件",
      reqWinTitle: "Windows",
      reqWin: "<ul><li>Windows 10 / 11 (64-bit)</li><li>メモリ: 4GB以上推奨</li><li>ディスク: 500MB以上の空き容量</li><li>インターネット接続必須</li></ul>",
      reqMacTitle: "macOS",
      reqMac: "<ul><li>macOS 10.15 (Catalina) 以降</li><li>メモリ: 4GB以上推奨</li><li>ディスク: 500MB以上の空き容量</li><li>インターネット接続必須</li></ul>",
      reqLinuxTitle: "Linux",
      reqLinux: "<ul><li>Ubuntu 18.04 / Debian 10 以降</li><li>メモリ: 4GB以上推奨</li><li>ディスク: 500MB以上の空き容量</li><li>インターネット接続必須</li></ul>",
      guide: "セットアップ手順",
      steps: {
        1: { title: "ダウンロード", desc: "上記のボタンからお使いのプラットフォーム用のインストーラーをダウンロードします。" },
        2: { title: "インストール", desc: "ダウンロードしたファイルを実行し、画面の指示に従ってインストールします。" },
        3: { title: "ログイン", desc: "アプリを起動してウォレットアドレスでログインします。初回ログイン時に自動でアカウントが作成されます。" },
        4: { title: "ウォレット接続", desc: "WalletConnect（QRコード）または秘密鍵で支払い元ウォレットを接続します。" },
        5: { title: "CSVインポートして送金", desc: "送金先リストのCSVをインポートしてセッションを作成し、一括送金を実行します。" }
      }
    },
    footer: {
      description: "ERC20トークンの一括送金を安全・効率的に管理するデスクトップアプリ",
      links: "リンク",
      support: "サポート",
      guide: "使い方ガイド",
      faq: "よくある質問",
      privacy: "プライバシーポリシー",
      contact: "お問い合わせ",
      copyright: "Token Batch Transfer. All rights reserved."
    },
    help: {
      title: "ヘルプ・使い方ガイド",
      quickstart: "🚀 クイックスタート",
      qs1: { title: "アプリをダウンロード", desc: '<a href="download.html">ダウンロードページ</a>からお使いのプラットフォーム用のアプリをダウンロードしてインストールします。' },
      qs2: { title: "ログイン", desc: "ウォレットアドレスでログインします。初回ログイン時に自動でアカウントが作成されます。" },
      qs3: { title: "ウォレットを接続", desc: '画面上部の「支払い元ウォレット接続」ボタンからWalletConnect（QRコード）または秘密鍵で接続します。' },
      qs4: { title: "CSVをインポート", desc: '「CSVインポート」タブから送金先リストのCSVファイルをインポートしてセッションを作成します。' },
      qs5: { title: "送金を実行", desc: '「支払いセッション」タブでセッションを選択し、「送信」ボタンで一括送金を実行します。' },
      csv: "📄 CSV形式",
      csvIntro: "インポートするCSVファイルは以下の形式で作成してください。",
      csvColTitle: "列の説明",
      csvCol1: { title: "RecipientAddress（必須）", desc: "送金先のウォレットアドレス（0xから始まる文字列）" },
      csvCol2: { title: "Amount（必須）", desc: "送金金額（小数点OK）例: 100.50" },
      csvCol3: { title: "TokenName（必須）", desc: "送るトークンのシンボル。設定画面のトークン一覧に表示されている文字と一致させてください。例: USDC / USDT / JPYC" },
      csvCol4: { title: "NetworkName（必須）", desc: "送金するブロックチェーン名。設定画面のネットワーク一覧の名前と完全一致させてください。例: Ethereum / Polygon / BSC Testnet" },
      csvCol5: { title: "NotificationType / NotificationId（任意）", desc: "KYC通知の方法と送信先。不要な場合は空欄でOK。例: email / user@example.com" },
      csvCol6: { title: "AuthId（任意）", desc: "社員番号など管理用のID。自由に使えるメモ欄。例: EMP001" },
      features: "📖 主な機能の使い方",
      featSession: { title: "セッション管理", desc: "「支払いセッション」タブでは、インポートした送金先リストのセッションを管理できます。<br>・タイトル名・ラベルで検索<br>・作成日・タイトル名で昇順/降順ソート<br>・セッションの複製・削除・名前変更<br>・ラベルの追加・削除" },
      featSend: { title: "送金実行", desc: "1. セッションをクリックして詳細を開く<br>2. ウォレットが接続されていることを確認<br>3. 「送信」ボタンをクリック<br>4. 確認ダイアログで内容を確認して実行<br>※ MultiSendCallOnlyコントラクトで100件ずつ一括送金されます" },
      featApproved: { title: "承認済みアドレス管理", desc: "「承認済みアドレス」タブで、KYC確認済みの送金先アドレスを管理できます。<br>登録済みアドレスはCSVインポート時に自動で検証済みとしてマークされます。" },
      featKyc: { title: "KYC管理", desc: "「KYC管理」タブで、受取人へのKYC通知の送信・ステータス確認ができます。<br>CSVにNotificationType/NotificationIdを記載すると、インポート時に自動でKYC通知が送信されます。" },
      featSettings: { title: "設定", desc: "「設定」タブでカスタムトークン・カスタムネットワークの追加、デフォルトネットワークの変更ができます。" },
      faq: "❓ よくある質問",
      faq1: { q: "Q: 無料で使えますか？", a: "A: アプリのダウンロードとインストールは無料です。月間100ポイント（送金件数）まで無料でご利用いただけます。それ以上ご利用の場合は従量課金プランへの登録が必要です。" },
      faq2: { q: "Q: 対応しているトークンは？", a: "A: USDC・USDT・JPYC等の主要ERC20トークンに対応しています。設定画面からカスタムトークンを追加することも可能です。" },
      faq3: { q: "Q: 一度に何件まで送金できますか？", a: "A: 100件ずつバッチ処理されます。CSVに100件以上のデータがある場合は自動的に複数セッションに分割されます。" },
      faq4: { q: "Q: 送金を間違えた場合は？", a: "A: ブロックチェーンの性質上、送金後の取り消しはできません。送金前に必ず宛先アドレスと金額を確認してください。" },
      faq5: { q: "Q: ガス代はどのくらいかかりますか？", a: "A: ネットワークの混雑状況によって変動します。送金実行前にガス残高チェックが行われ、残高不足の場合はアラートが表示されます。" },
      faq6: { q: "Q: データはどこに保存されますか？", a: "A: セッションデータはローカルストレージに保存されます。Firebaseとの同期機能も備えています。" },
      faq7: { q: "Q: WalletConnectで接続できない場合は？", a: "A: QRコードをモバイルウォレットアプリで読み取ってください。接続できない場合は秘密鍵入力（テスト用）をお試しください。" },
      faq8: { q: "Q: テストネットで試せますか？", a: "A: はい。Ethereum Sepolia・Polygon Amoy・BSC Testnet等のテストネットに対応しています。設定画面でデフォルトネットワークをテストネットに変更してお試しください。" },
      troubleshoot: "🔧 トラブルシューティング",
      ts1: { title: "ウォレットが接続できない", desc: "・インターネット接続を確認してください<br>・WalletConnectの場合、モバイルウォレットアプリが最新版か確認してください<br>・一度切断してから再接続してみてください" },
      ts2: { title: "CSVインポートでエラーが出る", desc: "・TokenNameが設定画面のトークンシンボルと完全一致しているか確認してください<br>・NetworkNameが設定画面のネットワーク名と完全一致しているか確認してください<br>・アドレスが正しい形式（0xから始まる42文字）か確認してください" },
      ts3: { title: "送金が失敗する", desc: "・ウォレットのネットワークとセッションのネットワークが一致しているか確認してください<br>・ガス代（ETH/BNB等）が十分にあるか確認してください<br>・トークン残高が送金額以上あるか確認してください" },
      ts4: { title: "残高が表示されない", desc: "・RPC URLが正しいか設定画面で確認してください<br>・ネットワークの接続状況を確認してください<br>・アプリを再起動してみてください" },
      kycFlow: {
        heading: "🔐 KYC認証フロー",
        intro: "本アプリのKYC認証は、送金先の受取人が本当にそのウォレットアドレスの所有者であることを確認するための仕組みです。以下の流れで自動的に処理されます。",
        step1: { title: "Step 1: CSVインポート時にKYC通知を自動送信", desc: "CSVファイルの <code>NotificationType</code> に <code>email</code>、<code>NotificationId</code> に受取人のメールアドレスを記載してインポートすると、受取人に KYC証明用URL が記載されたメールが自動送信されます。" },
        step2: { title: "Step 2: 受取人がKYC証明URLにアクセス", desc: "受取人はメールに記載されたURLをブラウザで開きます。KYC証明ページが表示され、ウォレットアドレスの所有権を証明するよう求められます。" },
        step3: { title: "Step 3: ウォレットで署名して所有権を証明", desc: "受取人はKYC証明ページでウォレット（MetaMask等）を接続し、表示されたメッセージに署名します。この署名により、CSVに記載されたウォレットアドレスの所有者本人であることが暗号学的に証明されます。" },
        step4: { title: "Step 4: KYCステータスが自動更新", desc: '署名が検証されると、アプリ側のKYCステータスが自動的に「承認済み」に更新されます。送金者は「KYC管理」タブでリアルタイムにステータスを確認できます。' },
        statusTitle: "KYCステータス一覧",
        statusPending: "⏳ 未送信 — まだKYC通知が送信されていない状態",
        statusSent: "📧 送信済み — メールは送信されたが、受取人がまだ署名していない状態",
        statusVerified: "✅ 承認済み — 受取人がウォレット署名で所有権を証明済み",
        statusRejected: "❌ 拒否 — 署名の検証に失敗した状態",
        note: "💡 KYC認証が完了したアドレスは「承認済みアドレス」に自動登録されます。次回以降のCSVインポート時に同じアドレスがあれば、自動的に検証済みとしてマークされます。"
      }
    },
    privacy: {
      title: "プライバシーポリシー",
      lastUpdated: "最終更新日: 2026年1月1日",
      intro: "1. はじめに",
      introP1: "Token Batch Transfer（以下「本アプリ」）は、ブロックチェーン上でのERC20トークン一括送金を管理するデスクトップアプリケーションです。本プライバシーポリシーは、本アプリがどのように個人情報および利用データを収集、使用、保護するかを説明します。",
      introP2: "本アプリを使用することで、本プライバシーポリシーに記載された情報の取り扱いに同意したものとみなされます。",
      collect: "2. 収集する情報",
      collect21: "2.1 ユーザーが直接提供する情報",
      collectWallet: "ウォレットアドレス",
      collectWalletDesc: "ログインおよび送金元として使用するウォレットアドレス",
      collectDest: "送金先データ",
      collectDestDesc: "CSVインポートで入力する送金先アドレス・金額・トークン情報",
      collectSettings: "設定情報",
      collectSettingsDesc: "ネットワーク設定・トークン設定・アプリ設定",
      collect22: "2.2 自動的に収集される情報",
      collectUsage: "利用状況データ",
      collectUsageDesc: "送金件数・ポイント使用状況（Firebase経由）",
      collectError: "エラーログ",
      collectErrorDesc: "アプリのエラーや不具合に関する技術情報",
      collectImportant: "<strong>重要:</strong> 本アプリは秘密鍵・シードフレーズを収集・保存しません。秘密鍵入力はテスト用途のみであり、ローカルメモリ上でのみ使用されます。",
      usage: "3. 情報の使用目的",
      usageP1: "収集した情報は以下の目的でのみ使用されます：",
      usageService: "サービスの提供",
      usageServiceDesc: "一括送金・KYC管理・セッション管理機能の提供",
      usageBilling: "課金管理",
      usageBillingDesc: "ポイント使用量の集計・従量課金プランの管理",
      usageImprove: "アプリの改善",
      usageImproveDesc: "利用状況の分析によるバグ修正・機能改善",
      usageSecurity: "セキュリティ",
      usageSecurityDesc: "不正利用の防止・ネットワーク整合性の確認",
      usageP2: "収集した情報を広告配信・マーケティング・第三者への販売の目的で使用することはありません。",
      thirdparty: "4. 第三者サービスの利用",
      thirdpartyP1: "本アプリは以下の第三者サービスを利用しています：",
      tpFirebase: "Firebase (Google LLC)",
      tpFirebaseDesc: "認証・データ保存・同期",
      tpStripe: "Stripe",
      tpStripeDesc: "従量課金プランの決済処理",
      tpWC: "WalletConnect",
      tpWCDesc: "モバイルウォレット接続",
      tpRPC: "各ブロックチェーンRPCノード",
      tpRPCDesc: "トランザクション送信・残高確認",
      thirdpartyLinks: "各サービスのプライバシーポリシー：",
      retention: "5. データの保存と保持期間",
      retentionLocal: "ローカルストレージ",
      retentionLocalDesc: "セッションデータ・設定情報（アプリアンインストールまで保持）",
      retentionCloud: "Firebase（クラウド）",
      retentionCloudDesc: "ユーザーデータ・ポイント履歴（退会まで保持）",
      deletion: "6. データの削除",
      deletionP1: "以下の方法でデータを削除できます：",
      deletionLocal: "ローカルデータ",
      deletionLocalDesc: '設定画面の「すべてのデータをクリア」ボタン、またはアプリのアンインストール',
      deletionCloud: "クラウドデータ",
      deletionCloudDesc: "下記お問い合わせ先にデータ削除を依頼してください",
      security: "7. セキュリティ",
      securityP1: "本アプリは以下のセキュリティ対策を実施しています：",
      securityItem1: "Firebase Authentication による安全な認証",
      securityItem2: "Firebase Security Rules によるアクセス制御",
      securityItem3: "ネットワーク整合性チェックによる誤送金防止",
      securityItem4: "秘密鍵の非保存（メモリ上のみで使用）",
      changes: "8. プライバシーポリシーの変更",
      changesP1: "本プライバシーポリシーは、法令の変更やサービス内容の変更により予告なく変更されることがあります。重要な変更がある場合はアプリ内通知またはこのページでお知らせします。",
      contact: "9. お問い合わせ",
      contactP1: "本プライバシーポリシーに関するご質問・データ削除依頼は以下までご連絡ください：",
      contactP2: "お問い合わせには通常3営業日以内に対応いたします。",
      law: "10. 準拠法と管轄",
      lawP1: "本プライバシーポリシーは日本国の法律に準拠します。本ポリシーに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。"
    }
  },
  en: {
    site: {
      title: "Web3 Token Batch Transfer - ERC20 Token Bulk Transfer Tool"
    },
    nav: {
      features: "Features",
      networks: "Networks",
      help: "Help",
      download: "Download"
    },
    hero: {
      title: "ERC20 Token Batch Transfers<br>Made Simple",
      subtitle: "Bulk-register recipients via CSV import, send with one click.<br>Everything you need for Web3 batch payments.",
      download: "Free Download",
      features: "View Features"
    },
    features: {
      title: "Key Features",
      csv: { title: "CSV Bulk Import", desc: "Bulk import recipient lists via CSV. Safely create sessions with duplicate detection and validation." },
      wallet: { title: "Wallet Connection", desc: "Connect wallets via WalletConnect (QR code) or private key. Supports mobile wallets like MetaMask." },
      session: { title: "Session Management", desc: "Create, edit, duplicate, and delete payment sessions. Organize large numbers of sessions with labels, search, and sorting." },
      batch: { title: "Batch Transfer", desc: "Efficient bulk transfers using MultiSendCallOnly contract. Automatically splits into batches of 100." },
      kyc: { title: "KYC Management", desc: "Send KYC notifications to recipients and manage status. Safely manage transfer destinations with approved address lists." },
      security: { title: "Security", desc: "Secure login via Firebase authentication. Network consistency checks prevent accidental transfers." }
    },
    networks: {
      title: "Supported Networks",
      mainnet: "Mainnet",
      testnet: "Testnet"
    },
    cta: {
      title: "Get Started Now",
      subtitle: "Download for free and start batch transferring ERC20 tokens right away."
    },
    download: {
      title: "Download",
      subtitle: "Select your platform",
      comingSoon: "Coming Soon...",
      btnLinux: "Download .deb",
      version: "Version 1.5.0",
      requirements: "System Requirements",
      reqWinTitle: "Windows",
      reqWin: "<ul><li>Windows 10 / 11 (64-bit)</li><li>RAM: 4GB+ recommended</li><li>Disk: 500MB+ free space</li><li>Internet connection required</li></ul>",
      reqMacTitle: "macOS",
      reqMac: "<ul><li>macOS 10.15 (Catalina) or later</li><li>RAM: 4GB+ recommended</li><li>Disk: 500MB+ free space</li><li>Internet connection required</li></ul>",
      reqLinuxTitle: "Linux",
      reqLinux: "<ul><li>Ubuntu 18.04 / Debian 10 or later</li><li>RAM: 4GB+ recommended</li><li>Disk: 500MB+ free space</li><li>Internet connection required</li></ul>",
      guide: "Setup Guide",
      steps: {
        1: { title: "Download", desc: "Download the installer for your platform from the buttons above." },
        2: { title: "Install", desc: "Run the downloaded file and follow the instructions to install." },
        3: { title: "Login", desc: "Launch the app and login with your wallet address. Account is created automatically on first login." },
        4: { title: "Connect Wallet", desc: "Connect your payment source wallet using WalletConnect (QR) or Private Key." },
        5: { title: "Import CSV & Send", desc: "Import your recipient list CSV to create a session and execute bulk transfer." }
      }
    },
    footer: {
      description: "Desktop app for safe and efficient management of ERC20 token batch transfers",
      links: "Links",
      support: "Support",
      guide: "User Guide",
      faq: "FAQ",
      privacy: "Privacy Policy",
      contact: "Contact",
      copyright: "Token Batch Transfer. All rights reserved."
    },
    help: {
      title: "Help & User Guide",
      quickstart: "🚀 Quick Start",
      qs1: { title: "Download the App", desc: 'Download and install the app for your platform from the <a href="download.html">download page</a>.' },
      qs2: { title: "Login", desc: "Login with your wallet address. An account is automatically created on first login." },
      qs3: { title: "Connect Wallet", desc: 'Click the "Connect Payment Wallet" button at the top to connect via WalletConnect (QR code) or private key.' },
      qs4: { title: "Import CSV", desc: 'Import a CSV file of your recipient list from the "CSV Import" tab to create a session.' },
      qs5: { title: "Execute Transfer", desc: 'Select a session in the "Payment Sessions" tab and click "Send" to execute the batch transfer.' },
      csv: "📄 CSV Format",
      csvIntro: "Create your CSV file in the following format for import.",
      csvColTitle: "Column Descriptions",
      csvCol1: { title: "RecipientAddress (Required)", desc: "Recipient wallet address (string starting with 0x)" },
      csvCol2: { title: "Amount (Required)", desc: "Transfer amount (decimals OK) e.g.: 100.50" },
      csvCol3: { title: "TokenName (Required)", desc: "Token symbol to send. Must match the token list in settings. e.g.: USDC / USDT / JPYC" },
      csvCol4: { title: "NetworkName (Required)", desc: "Blockchain network name. Must exactly match the network list in settings. e.g.: Ethereum / Polygon / BSC Testnet" },
      csvCol5: { title: "NotificationType / NotificationId (Optional)", desc: "KYC notification method and destination. Leave blank if not needed. e.g.: email / user@example.com" },
      csvCol6: { title: "AuthId (Optional)", desc: "Management ID such as employee number. Free-form memo field. e.g.: EMP001" },
      features: "📖 Key Features Usage",
      featSession: { title: "Session Management", desc: 'The "Payment Sessions" tab lets you manage sessions of imported recipient lists.<br>・Search by title and label<br>・Sort by creation date or title (ascending/descending)<br>・Duplicate, delete, rename sessions<br>・Add/remove labels' },
      featSend: { title: "Execute Transfer", desc: "1. Click a session to open details<br>2. Confirm wallet is connected<br>3. Click the \"Send\" button<br>4. Review and confirm in the dialog<br>※ Batch transfers of 100 at a time via MultiSendCallOnly contract" },
      featApproved: { title: "Approved Address Management", desc: 'Manage KYC-verified recipient addresses in the "Approved Addresses" tab.<br>Registered addresses are automatically marked as verified during CSV import.' },
      featKyc: { title: "KYC Management", desc: 'Send KYC notifications and check status in the "KYC Management" tab.<br>Adding NotificationType/NotificationId in CSV automatically sends KYC notifications on import.' },
      featSettings: { title: "Settings", desc: 'Add custom tokens and networks, and change the default network in the "Settings" tab.' },
      faq: "❓ FAQ",
      faq1: { q: "Q: Is it free to use?", a: "A: Download and installation are free. Up to 100 points (transfer count) per month are free. For more, a pay-as-you-go plan registration is required." },
      faq2: { q: "Q: What tokens are supported?", a: "A: Major ERC20 tokens like USDC, USDT, JPYC are supported. You can also add custom tokens in settings." },
      faq3: { q: "Q: How many transfers at once?", a: "A: Processed in batches of 100. If CSV has more than 100 entries, it's automatically split into multiple sessions." },
      faq4: { q: "Q: What if I make a wrong transfer?", a: "A: Due to blockchain nature, transfers cannot be reversed. Always verify recipient addresses and amounts before sending." },
      faq5: { q: "Q: How much are gas fees?", a: "A: Varies by network congestion. Gas balance is checked before transfer, and an alert is shown if insufficient." },
      faq6: { q: "Q: Where is data stored?", a: "A: Session data is stored in local storage. Firebase sync is also available." },
      faq7: { q: "Q: Can't connect via WalletConnect?", a: "A: Scan the QR code with your mobile wallet app. If that doesn't work, try private key input (for testing)." },
      faq8: { q: "Q: Can I test on testnet?", a: "A: Yes. Ethereum Sepolia, Polygon Amoy, BSC Testnet and more are supported. Change the default network to a testnet in settings." },
      troubleshoot: "🔧 Troubleshooting",
      ts1: { title: "Can't connect wallet", desc: "・Check your internet connection<br>・For WalletConnect, ensure your mobile wallet app is up to date<br>・Try disconnecting and reconnecting" },
      ts2: { title: "CSV import errors", desc: "・Verify TokenName exactly matches the token symbol in settings<br>・Verify NetworkName exactly matches the network name in settings<br>・Check address format (42 characters starting with 0x)" },
      ts3: { title: "Transfer fails", desc: "・Verify wallet network matches session network<br>・Check sufficient gas (ETH/BNB etc.)<br>・Check token balance is sufficient for transfer amount" },
      ts4: { title: "Balance not showing", desc: "・Verify RPC URL is correct in settings<br>・Check network connection status<br>・Try restarting the app" },
      kycFlow: {
        heading: "🔐 KYC Verification Flow",
        intro: "The KYC verification in this app confirms that the recipient truly owns the wallet address. The process is handled automatically as follows.",
        step1: { title: "Step 1: KYC notification sent automatically on CSV import", desc: "When you import a CSV with <code>NotificationType</code> set to <code>email</code> and <code>NotificationId</code> set to the recipient's email address, an email containing a KYC verification URL is automatically sent to the recipient." },
        step2: { title: "Step 2: Recipient accesses the KYC verification URL", desc: "The recipient opens the URL from the email in their browser. A KYC verification page is displayed, asking them to prove ownership of their wallet address." },
        step3: { title: "Step 3: Sign with wallet to prove ownership", desc: "The recipient connects their wallet (e.g. MetaMask) on the KYC verification page and signs the displayed message. This signature cryptographically proves that they are the owner of the wallet address listed in the CSV." },
        step4: { title: "Step 4: KYC status updates automatically", desc: 'Once the signature is verified, the KYC status on the app side is automatically updated to "Approved". The sender can check the status in real-time from the "KYC Management" tab.' },
        statusTitle: "KYC Status List",
        statusPending: "⏳ Not Sent — KYC notification has not been sent yet",
        statusSent: "📧 Sent — Email has been sent, but the recipient has not signed yet",
        statusVerified: "✅ Approved — Recipient has proven ownership via wallet signature",
        statusRejected: "❌ Rejected — Signature verification failed",
        note: '💡 Addresses that complete KYC verification are automatically added to "Approved Addresses". If the same address appears in future CSV imports, it will be automatically marked as verified.'
      }
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: Jan 1, 2026",
      intro: "1. Introduction",
      introP1: "Token Batch Transfer (hereinafter \"the App\") is a desktop application for managing ERC20 token batch transfers on the blockchain. This Privacy Policy explains how the App collects, uses, and protects personal information and usage data.",
      introP2: "By using the App, you agree to the handling of information as described in this Privacy Policy.",
      collect: "2. Information We Collect",
      collect21: "2.1 Information Provided Directly by Users",
      collectWallet: "Wallet Address",
      collectWalletDesc: "Wallet address used for login and as transfer source",
      collectDest: "Transfer Destination Data",
      collectDestDesc: "Recipient addresses, amounts, and token information entered via CSV import",
      collectSettings: "Settings Information",
      collectSettingsDesc: "Network settings, token settings, app settings",
      collect22: "2.2 Automatically Collected Information",
      collectUsage: "Usage Data",
      collectUsageDesc: "Transfer count, point usage (via Firebase)",
      collectError: "Error Logs",
      collectErrorDesc: "Technical information about app errors and issues",
      collectImportant: "<strong>Important:</strong> The App does not collect or store private keys or seed phrases. Private key input is for testing purposes only and is used only in local memory.",
      usage: "3. How We Use Information",
      usageP1: "Collected information is used only for the following purposes:",
      usageService: "Service Provision",
      usageServiceDesc: "Providing batch transfer, KYC management, and session management features",
      usageBilling: "Billing Management",
      usageBillingDesc: "Tracking point usage and managing pay-as-you-go plans",
      usageImprove: "App Improvement",
      usageImproveDesc: "Bug fixes and feature improvements through usage analysis",
      usageSecurity: "Security",
      usageSecurityDesc: "Preventing unauthorized use and verifying network consistency",
      usageP2: "We do not use collected information for advertising, marketing, or selling to third parties.",
      thirdparty: "4. Third-Party Services",
      thirdpartyP1: "The App uses the following third-party services:",
      tpFirebase: "Firebase (Google LLC)",
      tpFirebaseDesc: "Authentication, data storage, sync",
      tpStripe: "Stripe",
      tpStripeDesc: "Pay-as-you-go plan payment processing",
      tpWC: "WalletConnect",
      tpWCDesc: "Mobile wallet connection",
      tpRPC: "Blockchain RPC Nodes",
      tpRPCDesc: "Transaction submission, balance checking",
      thirdpartyLinks: "Privacy policies of each service:",
      retention: "5. Data Retention",
      retentionLocal: "Local Storage",
      retentionLocalDesc: "Session data, settings (retained until app uninstall)",
      retentionCloud: "Firebase (Cloud)",
      retentionCloudDesc: "User data, point history (retained until account deletion)",
      deletion: "6. Data Deletion",
      deletionP1: "You can delete data through the following methods:",
      deletionLocal: "Local Data",
      deletionLocalDesc: '"Clear All Data" button in settings, or uninstall the app',
      deletionCloud: "Cloud Data",
      deletionCloudDesc: "Contact us at the address below to request data deletion",
      security: "7. Security",
      securityP1: "The App implements the following security measures:",
      securityItem1: "Secure authentication via Firebase Authentication",
      securityItem2: "Access control via Firebase Security Rules",
      securityItem3: "Network consistency checks to prevent accidental transfers",
      securityItem4: "Private keys are not stored (used only in memory)",
      changes: "8. Changes to Privacy Policy",
      changesP1: "This Privacy Policy may be changed without notice due to legal or service changes. Significant changes will be notified through in-app notifications or this page.",
      contact: "9. Contact Us",
      contactP1: "For questions about this Privacy Policy or data deletion requests, please contact us at:",
      contactP2: "We typically respond to inquiries within 3 business days.",
      law: "10. Governing Law",
      lawP1: "This Privacy Policy is governed by the laws of Japan. Any disputes shall be subject to the exclusive jurisdiction of the Tokyo District Court."
    }
  },
  ko: {
    site: {
      title: "Web3 Token Batch Transfer - ERC20 토큰 일괄 송금 도구"
    },
    nav: {
      features: "기능",
      networks: "지원 네트워크",
      help: "도움말",
      download: "다운로드"
    },
    hero: {
      title: "ERC20 토큰 일괄 송금을<br>더 간편하게",
      subtitle: "CSV 가져오기로 수신자를 일괄 등록하고 원클릭으로 대량 송금.<br>Web3 일괄 결제에 필요한 모든 것이 갖춰져 있습니다.",
      download: "무료 다운로드",
      features: "기능 보기"
    },
    features: {
      title: "주요 기능",
      csv: { title: "CSV 일괄 가져오기", desc: "수신자 목록을 CSV로 일괄 가져오기. 중복 감지 및 유효성 검사로 안전하게 세션을 생성합니다." },
      wallet: { title: "지갑 연결", desc: "WalletConnect(QR 코드) 또는 개인 키로 지갑을 연결. MetaMask 등 모바일 지갑도 지원합니다." },
      session: { title: "세션 관리", desc: "결제 세션의 생성, 편집, 복제, 삭제. 라벨 관리, 검색, 정렬로 대량의 세션도 정리할 수 있습니다." },
      batch: { title: "일괄 송금", desc: "MultiSendCallOnly 컨트랙트를 사용한 효율적인 일괄 송금. 100건씩 자동 분할 처리." },
      kyc: { title: "KYC 관리", desc: "수신자에게 KYC 알림 전송 및 상태 관리. 승인된 주소 목록으로 송금처를 안전하게 관리." },
      security: { title: "보안", desc: "Firebase 인증을 통한 안전한 로그인. 네트워크 정합성 검사로 오송금을 방지." }
    },
    networks: {
      title: "지원 네트워크",
      mainnet: "메인넷",
      testnet: "테스트넷"
    },
    cta: {
      title: "지금 시작하세요",
      subtitle: "무료로 다운로드하고 바로 ERC20 토큰 일괄 송금을 시작하세요."
    },
    download: {
      title: "다운로드",
      subtitle: "플랫폼을 선택하세요",
      comingSoon: "Coming Soon...",
      btnLinux: ".deb 다운로드",
      version: "버전 1.5.0",
      requirements: "시스템 요구 사항",
      reqWinTitle: "Windows",
      reqWin: "<ul><li>Windows 10 / 11 (64-bit)</li><li>메모리: 4GB 이상 권장</li><li>디스크: 500MB 이상 여유 공간</li><li>인터넷 연결 필수</li></ul>",
      reqMacTitle: "macOS",
      reqMac: "<ul><li>macOS 10.15 (Catalina) 이상</li><li>메모리: 4GB 이상 권장</li><li>디스크: 500MB 이상 여유 공간</li><li>인터넷 연결 필수</li></ul>",
      reqLinuxTitle: "Linux",
      reqLinux: "<ul><li>Ubuntu 18.04 / Debian 10 이상</li><li>메모리: 4GB 이상 권장</li><li>디스크: 500MB 이상 여유 공간</li><li>인터넷 연결 필수</li></ul>",
      guide: "설치 가이드",
      steps: {
        1: { title: "다운로드", desc: "위 버튼에서 사용 중인 플랫폼용 설치 프로그램을 다운로드합니다." },
        2: { title: "설치", desc: "다운로드한 파일을 실행하고 화면의 지시에 따라 설치합니다." },
        3: { title: "로그인", desc: "앱을 실행하고 지갑 주소로 로그인합니다. 첫 로그인 시 계정이 자동으로 생성됩니다." },
        4: { title: "지갑 연결", desc: "WalletConnect(QR 코드) 또는 개인 키로 지갑을 연결합니다." },
        5: { title: "CSV 가져오기 및 송금", desc: "수신자 목록 CSV를 가져와 세션을 생성하고 일괄 송금을 실행합니다." }
      }
    },
    footer: {
      description: "ERC20 토큰 일괄 송금을 안전하고 효율적으로 관리하는 데스크톱 앱",
      links: "링크",
      support: "지원",
      guide: "사용 가이드",
      faq: "자주 묻는 질문",
      privacy: "개인정보 처리방침",
      contact: "문의하기",
      copyright: "Token Batch Transfer. All rights reserved."
    },
    help: {
      title: "도움말 및 가이드",
      quickstart: "🚀 빠른 시작",
      qs1: { title: "앱 다운로드", desc: '<a href="download.html">다운로드 페이지</a>에서 사용 중인 플랫폼용 앱을 다운로드하여 설치합니다.' },
      qs2: { title: "로그인", desc: "지갑 주소로 로그인합니다. 첫 로그인 시 계정이 자동으로 생성됩니다." },
      qs3: { title: "지갑 연결", desc: '화면 상단의 "결제 지갑 연결" 버튼에서 WalletConnect(QR 코드) 또는 개인 키로 연결합니다.' },
      qs4: { title: "CSV 가져오기", desc: '"CSV 가져오기" 탭에서 수신자 목록 CSV 파일을 가져와 세션을 생성합니다.' },
      qs5: { title: "송금 실행", desc: '"결제 세션" 탭에서 세션을 선택하고 "전송" 버튼으로 일괄 송금을 실행합니다.' },
      csv: "📄 CSV 형식",
      csvIntro: "가져올 CSV 파일은 다음 형식으로 작성하세요.",
      csvColTitle: "열 설명",
      csvCol1: { title: "RecipientAddress (필수)", desc: "수신자 지갑 주소 (0x로 시작하는 문자열)" },
      csvCol2: { title: "Amount (필수)", desc: "송금 금액 (소수점 가능) 예: 100.50" },
      csvCol3: { title: "TokenName (필수)", desc: "보낼 토큰의 심볼. 설정 화면의 토큰 목록과 일치해야 합니다. 예: USDC / USDT / JPYC" },
      csvCol4: { title: "NetworkName (필수)", desc: "송금할 블록체인 이름. 설정 화면의 네트워크 목록 이름과 정확히 일치해야 합니다. 예: Ethereum / Polygon / BSC Testnet" },
      csvCol5: { title: "NotificationType / NotificationId (선택)", desc: "KYC 알림 방법과 수신처. 불필요한 경우 비워두세요. 예: email / user@example.com" },
      csvCol6: { title: "AuthId (선택)", desc: "사원번호 등 관리용 ID. 자유롭게 사용할 수 있는 메모 필드. 예: EMP001" },
      features: "📖 주요 기능 사용법",
      featSession: { title: "세션 관리", desc: '"결제 세션" 탭에서 가져온 수신자 목록의 세션을 관리할 수 있습니다.<br>・제목 및 라벨로 검색<br>・생성일, 제목으로 오름차순/내림차순 정렬<br>・세션 복제, 삭제, 이름 변경<br>・라벨 추가/삭제' },
      featSend: { title: "송금 실행", desc: '1. 세션을 클릭하여 상세 정보 열기<br>2. 지갑이 연결되어 있는지 확인<br>3. "전송" 버튼 클릭<br>4. 확인 대화상자에서 내용 확인 후 실행<br>※ MultiSendCallOnly 컨트랙트로 100건씩 일괄 송금됩니다' },
      featApproved: { title: "승인된 주소 관리", desc: '"승인된 주소" 탭에서 KYC 확인된 수신자 주소를 관리할 수 있습니다.<br>등록된 주소는 CSV 가져오기 시 자동으로 검증 완료로 표시됩니다.' },
      featKyc: { title: "KYC 관리", desc: '"KYC 관리" 탭에서 수신자에게 KYC 알림 전송 및 상태 확인이 가능합니다.<br>CSV에 NotificationType/NotificationId를 기재하면 가져오기 시 자동으로 KYC 알림이 전송됩니다.' },
      featSettings: { title: "설정", desc: '"설정" 탭에서 커스텀 토큰, 커스텀 네트워크 추가, 기본 네트워크 변경이 가능합니다.' },
      faq: "❓ 자주 묻는 질문",
      faq1: { q: "Q: 무료로 사용할 수 있나요?", a: "A: 앱 다운로드 및 설치는 무료입니다. 월 100포인트(송금 건수)까지 무료로 이용 가능합니다. 그 이상은 종량제 플랜 등록이 필요합니다." },
      faq2: { q: "Q: 지원되는 토큰은?", a: "A: USDC, USDT, JPYC 등 주요 ERC20 토큰을 지원합니다. 설정 화면에서 커스텀 토큰을 추가할 수도 있습니다." },
      faq3: { q: "Q: 한 번에 몇 건까지 송금할 수 있나요?", a: "A: 100건씩 배치 처리됩니다. CSV에 100건 이상의 데이터가 있으면 자동으로 여러 세션으로 분할됩니다." },
      faq4: { q: "Q: 잘못 송금한 경우는?", a: "A: 블록체인 특성상 송금 후 취소가 불가능합니다. 송금 전에 반드시 수신 주소와 금액을 확인하세요." },
      faq5: { q: "Q: 가스비는 얼마나 드나요?", a: "A: 네트워크 혼잡 상황에 따라 변동됩니다. 송금 실행 전 가스 잔액 확인이 이루어지며, 잔액 부족 시 알림이 표시됩니다." },
      faq6: { q: "Q: 데이터는 어디에 저장되나요?", a: "A: 세션 데이터는 로컬 스토리지에 저장됩니다. Firebase 동기화 기능도 제공됩니다." },
      faq7: { q: "Q: WalletConnect로 연결할 수 없는 경우?", a: "A: QR 코드를 모바일 지갑 앱으로 스캔하세요. 연결할 수 없는 경우 개인 키 입력(테스트용)을 시도하세요." },
      faq8: { q: "Q: 테스트넷에서 테스트할 수 있나요?", a: "A: 네. Ethereum Sepolia, Polygon Amoy, BSC Testnet 등의 테스트넷을 지원합니다. 설정 화면에서 기본 네트워크를 테스트넷으로 변경하세요." },
      troubleshoot: "🔧 문제 해결",
      ts1: { title: "지갑 연결 불가", desc: "・인터넷 연결을 확인하세요<br>・WalletConnect의 경우 모바일 지갑 앱이 최신 버전인지 확인하세요<br>・연결을 끊고 다시 연결해 보세요" },
      ts2: { title: "CSV 가져오기 오류", desc: "・TokenName이 설정 화면의 토큰 심볼과 정확히 일치하는지 확인하세요<br>・NetworkName이 설정 화면의 네트워크 이름과 정확히 일치하는지 확인하세요<br>・주소 형식이 올바른지 확인하세요 (0x로 시작하는 42자)" },
      ts3: { title: "송금 실패", desc: "・지갑 네트워크와 세션 네트워크가 일치하는지 확인하세요<br>・가스비(ETH/BNB 등)가 충분한지 확인하세요<br>・토큰 잔액이 송금액 이상인지 확인하세요" },
      ts4: { title: "잔액이 표시되지 않음", desc: "・설정 화면에서 RPC URL이 올바른지 확인하세요<br>・네트워크 연결 상태를 확인하세요<br>・앱을 재시작해 보세요" },
      kycFlow: {
        heading: "🔐 KYC 인증 플로우",
        intro: "본 앱의 KYC 인증은 송금 대상 수신자가 실제로 해당 지갑 주소의 소유자인지 확인하는 구조입니다. 다음 흐름으로 자동 처리됩니다.",
        step1: { title: "Step 1: CSV 가져오기 시 KYC 알림 자동 전송", desc: "CSV 파일의 <code>NotificationType</code>에 <code>email</code>, <code>NotificationId</code>에 수신자의 이메일 주소를 기재하여 가져오면, 수신자에게 KYC 인증용 URL이 포함된 이메일이 자동 전송됩니다." },
        step2: { title: "Step 2: 수신자가 KYC 인증 URL에 접속", desc: "수신자는 이메일에 기재된 URL을 브라우저에서 엽니다. KYC 인증 페이지가 표시되며, 지갑 주소의 소유권을 증명하도록 요청됩니다." },
        step3: { title: "Step 3: 지갑으로 서명하여 소유권 증명", desc: "수신자는 KYC 인증 페이지에서 지갑(MetaMask 등)을 연결하고 표시된 메시지에 서명합니다. 이 서명을 통해 CSV에 기재된 지갑 주소의 실제 소유자임이 암호학적으로 증명됩니다." },
        step4: { title: "Step 4: KYC 상태 자동 업데이트", desc: '서명이 검증되면 앱 측의 KYC 상태가 자동으로 "승인됨"으로 업데이트됩니다. 송금자는 "KYC 관리" 탭에서 실시간으로 상태를 확인할 수 있습니다.' },
        statusTitle: "KYC 상태 목록",
        statusPending: "⏳ 미전송 — 아직 KYC 알림이 전송되지 않은 상태",
        statusSent: "📧 전송됨 — 이메일은 전송되었지만 수신자가 아직 서명하지 않은 상태",
        statusVerified: "✅ 승인됨 — 수신자가 지갑 서명으로 소유권을 증명 완료",
        statusRejected: "❌ 거부 — 서명 검증에 실패한 상태",
        note: '💡 KYC 인증이 완료된 주소는 "승인된 주소"에 자동 등록됩니다. 이후 CSV 가져오기 시 동일한 주소가 있으면 자동으로 검증 완료로 표시됩니다.'
      }
    },
    privacy: {
      title: "개인정보 처리방침",
      lastUpdated: "최종 업데이트: 2026년 1월 1일",
      intro: "1. 개요",
      introP1: "Token Batch Transfer(이하 \"본 앱\")는 블록체인상의 ERC20 토큰 일괄 송금을 관리하는 데스크톱 애플리케이션입니다. 본 개인정보 처리방침은 본 앱이 개인정보 및 이용 데이터를 어떻게 수집, 사용, 보호하는지 설명합니다.",
      introP2: "본 앱을 사용함으로써 본 개인정보 처리방침에 기재된 정보 취급에 동의한 것으로 간주됩니다.",
      collect: "2. 수집하는 정보",
      collect21: "2.1 사용자가 직접 제공하는 정보",
      collectWallet: "지갑 주소",
      collectWalletDesc: "로그인 및 송금원으로 사용하는 지갑 주소",
      collectDest: "송금처 데이터",
      collectDestDesc: "CSV 가져오기로 입력하는 수신 주소, 금액, 토큰 정보",
      collectSettings: "설정 정보",
      collectSettingsDesc: "네트워크 설정, 토큰 설정, 앱 설정",
      collect22: "2.2 자동으로 수집되는 정보",
      collectUsage: "이용 현황 데이터",
      collectUsageDesc: "송금 건수, 포인트 사용 현황 (Firebase 경유)",
      collectError: "오류 로그",
      collectErrorDesc: "앱 오류 및 문제에 관한 기술 정보",
      collectImportant: "<strong>중요:</strong> 본 앱은 개인 키나 시드 구문을 수집하거나 저장하지 않습니다. 개인 키 입력은 테스트 목적으로만 사용되며 로컬 메모리에서만 사용됩니다.",
      usage: "3. 정보 사용 목적",
      usageP1: "수집된 정보는 다음 목적으로만 사용됩니다:",
      usageService: "서비스 제공",
      usageServiceDesc: "일괄 송금, KYC 관리, 세션 관리 기능 제공",
      usageBilling: "과금 관리",
      usageBillingDesc: "포인트 사용량 집계 및 종량제 플랜 관리",
      usageImprove: "앱 개선",
      usageImproveDesc: "이용 현황 분석을 통한 버그 수정 및 기능 개선",
      usageSecurity: "보안",
      usageSecurityDesc: "부정 이용 방지 및 네트워크 정합성 확인",
      usageP2: "수집된 정보를 광고, 마케팅, 제3자 판매 목적으로 사용하지 않습니다.",
      thirdparty: "4. 제3자 서비스 이용",
      thirdpartyP1: "본 앱은 다음 제3자 서비스를 이용합니다:",
      tpFirebase: "Firebase (Google LLC)",
      tpFirebaseDesc: "인증, 데이터 저장, 동기화",
      tpStripe: "Stripe",
      tpStripeDesc: "종량제 플랜 결제 처리",
      tpWC: "WalletConnect",
      tpWCDesc: "모바일 지갑 연결",
      tpRPC: "블록체인 RPC 노드",
      tpRPCDesc: "트랜잭션 전송, 잔액 확인",
      thirdpartyLinks: "각 서비스의 개인정보 처리방침:",
      retention: "5. 데이터 저장 및 보관 기간",
      retentionLocal: "로컬 스토리지",
      retentionLocalDesc: "세션 데이터, 설정 정보 (앱 삭제 시까지 보관)",
      retentionCloud: "Firebase (클라우드)",
      retentionCloudDesc: "사용자 데이터, 포인트 이력 (탈퇴 시까지 보관)",
      deletion: "6. 데이터 삭제",
      deletionP1: "다음 방법으로 데이터를 삭제할 수 있습니다:",
      deletionLocal: "로컬 데이터",
      deletionLocalDesc: '설정 화면의 "모든 데이터 삭제" 버튼 또는 앱 삭제',
      deletionCloud: "클라우드 데이터",
      deletionCloudDesc: "아래 문의처로 데이터 삭제를 요청하세요",
      security: "7. 보안",
      securityP1: "본 앱은 다음 보안 조치를 시행합니다:",
      securityItem1: "Firebase Authentication을 통한 안전한 인증",
      securityItem2: "Firebase Security Rules를 통한 접근 제어",
      securityItem3: "네트워크 정합성 검사로 오송금 방지",
      securityItem4: "개인 키 미저장 (메모리에서만 사용)",
      changes: "8. 개인정보 처리방침 변경",
      changesP1: "본 개인정보 처리방침은 법령 변경이나 서비스 변경으로 예고 없이 변경될 수 있습니다. 중요한 변경이 있는 경우 앱 내 알림 또는 이 페이지에서 안내합니다.",
      contact: "9. 문의하기",
      contactP1: "본 개인정보 처리방침에 관한 질문이나 데이터 삭제 요청은 아래로 연락하세요:",
      contactP2: "문의에는 보통 영업일 기준 3일 이내에 대응합니다.",
      law: "10. 준거법 및 관할",
      lawP1: "본 개인정보 처리방침은 일본 법률에 준거합니다. 본 방침에 관한 분쟁은 도쿄 지방재판소를 제1심 전속적 합의 관할 법원으로 합니다."
    }
  },
  zh: {
    site: {
      title: "Web3 Token Batch Transfer - ERC20代币批量转账工具"
    },
    nav: {
      features: "功能",
      networks: "支持的网络",
      help: "帮助",
      download: "下载"
    },
    hero: {
      title: "ERC20代币批量转账<br>更加简单",
      subtitle: "通过CSV导入批量注册收款人，一键大量转账。<br>Web3批量支付所需的一切都已准备就绪。",
      download: "免费下载",
      features: "查看功能"
    },
    features: {
      title: "主要功能",
      csv: { title: "CSV批量导入", desc: "通过CSV批量导入收款人列表。具备重复检测和验证功能，安全创建会话。" },
      wallet: { title: "钱包连接", desc: "通过WalletConnect（二维码）或私钥连接钱包。支持MetaMask等移动钱包。" },
      session: { title: "会话管理", desc: "创建、编辑、复制和删除支付会话。通过标签管理、搜索和排序整理大量会话。" },
      batch: { title: "批量转账", desc: "使用MultiSendCallOnly合约进行高效批量转账。自动按100笔分批处理。" },
      kyc: { title: "KYC管理", desc: "向收款人发送KYC通知并管理状态。通过已批准地址列表安全管理转账目标。" },
      security: { title: "安全性", desc: "通过Firebase认证实现安全登录。网络一致性检查防止误转账。" }
    },
    networks: {
      title: "支持的网络",
      mainnet: "主网",
      testnet: "测试网"
    },
    cta: {
      title: "立即开始",
      subtitle: "免费下载，立即开始ERC20代币批量转账。"
    },
    download: {
      title: "下载",
      subtitle: "请选择您的平台",
      comingSoon: "即将推出...",
      btnLinux: "下载 .deb",
      version: "版本 1.5.0",
      requirements: "系统要求",
      reqWinTitle: "Windows",
      reqWin: "<ul><li>Windows 10 / 11 (64位)</li><li>内存：建议4GB以上</li><li>磁盘：500MB以上可用空间</li><li>需要互联网连接</li></ul>",
      reqMacTitle: "macOS",
      reqMac: "<ul><li>macOS 10.15 (Catalina) 或更高版本</li><li>内存：建议4GB以上</li><li>磁盘：500MB以上可用空间</li><li>需要互联网连接</li></ul>",
      reqLinuxTitle: "Linux",
      reqLinux: "<ul><li>Ubuntu 18.04 / Debian 10 或更高版本</li><li>内存：建议4GB以上</li><li>磁盘：500MB以上可用空间</li><li>需要互联网连接</li></ul>",
      guide: "安装指南",
      steps: {
        1: { title: "下载", desc: "从上面的按钮下载适用于您平台的安装程序。" },
        2: { title: "安装", desc: "运行下载的文件并按照屏幕上的说明进行安装。" },
        3: { title: "登录", desc: "启动应用程序并使用钱包地址登录。首次登录时会自动创建帐户。" },
        4: { title: "连接钱包", desc: "使用WalletConnect（二维码）或私钥连接付款钱包。" },
        5: { title: "导入CSV并发送", desc: "导入收款人列表CSV以创建会话并执行批量转账。" }
      }
    },
    footer: {
      description: "安全高效管理ERC20代币批量转账的桌面应用程序",
      links: "链接",
      support: "支持",
      guide: "使用指南",
      faq: "常见问题",
      privacy: "隐私政策",
      contact: "联系我们",
      copyright: "Token Batch Transfer. All rights reserved."
    },
    help: {
      title: "帮助与指南",
      quickstart: "🚀 快速入门",
      qs1: { title: "下载应用", desc: '从<a href="download.html">下载页面</a>下载并安装适用于您平台的应用。' },
      qs2: { title: "登录", desc: "使用钱包地址登录。首次登录时会自动创建账户。" },
      qs3: { title: "连接钱包", desc: '点击屏幕顶部的"连接付款钱包"按钮，通过WalletConnect（二维码）或私钥连接。' },
      qs4: { title: "导入CSV", desc: '从"CSV导入"选项卡导入收款人列表CSV文件以创建会话。' },
      qs5: { title: "执行转账", desc: '在"支付会话"选项卡中选择会话，点击"发送"按钮执行批量转账。' },
      csv: "📄 CSV格式",
      csvIntro: "请按以下格式创建要导入的CSV文件。",
      csvColTitle: "列说明",
      csvCol1: { title: "RecipientAddress（必填）", desc: "收款人钱包地址（以0x开头的字符串）" },
      csvCol2: { title: "Amount（必填）", desc: "转账金额（可含小数）例：100.50" },
      csvCol3: { title: "TokenName（必填）", desc: "要发送的代币符号。必须与设置画面中的代币列表一致。例：USDC / USDT / JPYC" },
      csvCol4: { title: "NetworkName（必填）", desc: "转账的区块链名称。必须与设置画面中的网络列表名称完全一致。例：Ethereum / Polygon / BSC Testnet" },
      csvCol5: { title: "NotificationType / NotificationId（可选）", desc: "KYC通知方式和发送目标。不需要时留空即可。例：email / user@example.com" },
      csvCol6: { title: "AuthId（可选）", desc: "员工编号等管理用ID。可自由使用的备注字段。例：EMP001" },
      features: "📖 主要功能使用方法",
      featSession: { title: "会话管理", desc: '"支付会话"选项卡可管理导入的收款人列表会话。<br>・按标题和标签搜索<br>・按创建日期、标题升序/降序排序<br>・复制、删除、重命名会话<br>・添加/删除标签' },
      featSend: { title: "执行转账", desc: '1. 点击会话打开详情<br>2. 确认钱包已连接<br>3. 点击"发送"按钮<br>4. 在确认对话框中确认内容后执行<br>※ 通过MultiSendCallOnly合约每次批量转账100笔' },
      featApproved: { title: "已批准地址管理", desc: '在"已批准地址"选项卡中管理KYC验证通过的收款人地址。<br>已注册地址在CSV导入时会自动标记为已验证。' },
      featKyc: { title: "KYC管理", desc: '在"KYC管理"选项卡中可向收款人发送KYC通知并确认状态。<br>在CSV中填写NotificationType/NotificationId后，导入时会自动发送KYC通知。' },
      featSettings: { title: "设置", desc: '在"设置"选项卡中可添加自定义代币和网络，更改默认网络。' },
      faq: "❓ 常见问题",
      faq1: { q: "Q: 可以免费使用吗？", a: "A: 应用下载和安装免费。每月100积分（转账笔数）以内免费使用。超出部分需要注册按量计费方案。" },
      faq2: { q: "Q: 支持哪些代币？", a: "A: 支持USDC、USDT、JPYC等主要ERC20代币。也可以在设置画面添加自定义代币。" },
      faq3: { q: "Q: 一次最多可以转账多少笔？", a: "A: 每100笔批量处理。如果CSV中有超过100条数据，会自动分割为多个会话。" },
      faq4: { q: "Q: 转账错误怎么办？", a: "A: 由于区块链的特性，转账后无法撤销。请在转账前务必确认收款地址和金额。" },
      faq5: { q: "Q: Gas费用是多少？", a: "A: 根据网络拥堵情况而变化。转账执行前会检查Gas余额，余额不足时会显示警告。" },
      faq6: { q: "Q: 数据存储在哪里？", a: "A: 会话数据存储在本地存储中。同时提供Firebase同步功能。" },
      faq7: { q: "Q: 无法通过WalletConnect连接？", a: "A: 请用移动钱包应用扫描二维码。如果仍无法连接，请尝试私钥输入（仅用于测试）。" },
      faq8: { q: "Q: 可以在测试网上测试吗？", a: "A: 是的。支持Ethereum Sepolia、Polygon Amoy、BSC Testnet等测试网。请在设置画面将默认网络更改为测试网。" },
      troubleshoot: "🔧 故障排除",
      ts1: { title: "无法连接钱包", desc: "・请检查互联网连接<br>・使用WalletConnect时，请确认移动钱包应用是否为最新版本<br>・尝试断开后重新连接" },
      ts2: { title: "CSV导入错误", desc: "・请确认TokenName与设置画面中的代币符号完全一致<br>・请确认NetworkName与设置画面中的网络名称完全一致<br>・请确认地址格式是否正确（以0x开头的42个字符）" },
      ts3: { title: "转账失败", desc: "・请确认钱包网络与会话网络是否一致<br>・请确认Gas费（ETH/BNB等）是否充足<br>・请确认代币余额是否大于等于转账金额" },
      ts4: { title: "余额不显示", desc: "・请在设置画面确认RPC URL是否正确<br>・请检查网络连接状态<br>・请尝试重启应用" },
      kycFlow: {
        heading: "🔐 KYC认证流程",
        intro: "本应用的KYC认证是用于确认转账目标收款人确实是该钱包地址所有者的机制。按以下流程自动处理。",
        step1: { title: "Step 1: CSV导入时自动发送KYC通知", desc: "在CSV文件的 <code>NotificationType</code> 中填写 <code>email</code>，<code>NotificationId</code> 中填写收款人的邮箱地址后导入，系统会自动向收款人发送包含KYC验证URL的邮件。" },
        step2: { title: "Step 2: 收款人访问KYC验证URL", desc: "收款人在浏览器中打开邮件中的URL。将显示KYC验证页面，要求证明钱包地址的所有权。" },
        step3: { title: "Step 3: 使用钱包签名证明所有权", desc: "收款人在KYC验证页面连接钱包（如MetaMask），对显示的消息进行签名。通过此签名，可以用密码学方式证明其为CSV中所列钱包地址的实际所有者。" },
        step4: { title: "Step 4: KYC状态自动更新", desc: '签名验证通过后，应用端的KYC状态会自动更新为"已批准"。发送者可以在"KYC管理"选项卡中实时查看状态。' },
        statusTitle: "KYC状态列表",
        statusPending: "⏳ 未发送 — KYC通知尚未发送",
        statusSent: "📧 已发送 — 邮件已发送，但收款人尚未签名",
        statusVerified: "✅ 已批准 — 收款人已通过钱包签名证明所有权",
        statusRejected: "❌ 已拒绝 — 签名验证失败",
        note: '💡 完成KYC认证的地址会自动添加到"已批准地址"中。后续CSV导入时如有相同地址，将自动标记为已验证。'
      }
    },
    privacy: {
      title: "隐私政策",
      lastUpdated: "最后更新：2026年1月1日",
      intro: "1. 简介",
      introP1: "Token Batch Transfer（以下简称\u201C本应用\u201D）是一款用于管理区块链上ERC20代币批量转账的桌面应用程序。本隐私政策说明本应用如何收集、使用和保护个人信息及使用数据。",
      introP2: "使用本应用即表示您同意本隐私政策中所述的信息处理方式。",
      collect: "2. 我们收集的信息",
      collect21: "2.1 用户直接提供的信息",
      collectWallet: "钱包地址",
      collectWalletDesc: "用于登录和作为转账来源的钱包地址",
      collectDest: "转账目标数据",
      collectDestDesc: "通过CSV导入输入的收款地址、金额和代币信息",
      collectSettings: "设置信息",
      collectSettingsDesc: "网络设置、代币设置、应用设置",
      collect22: "2.2 自动收集的信息",
      collectUsage: "使用数据",
      collectUsageDesc: "转账笔数、积分使用情况（通过Firebase）",
      collectError: "错误日志",
      collectErrorDesc: "与应用错误和问题相关的技术信息",
      collectImportant: "<strong>重要：</strong>本应用不收集或存储私钥或助记词。私钥输入仅用于测试目的，仅在本地内存中使用。",
      usage: "3. 信息使用目的",
      usageP1: "收集的信息仅用于以下目的：",
      usageService: "服务提供",
      usageServiceDesc: "提供批量转账、KYC管理和会话管理功能",
      usageBilling: "计费管理",
      usageBillingDesc: "积分使用量统计和按量计费方案管理",
      usageImprove: "应用改进",
      usageImproveDesc: "通过使用情况分析进行错误修复和功能改进",
      usageSecurity: "安全",
      usageSecurityDesc: "防止未授权使用和验证网络一致性",
      usageP2: "我们不会将收集的信息用于广告投放、营销或向第三方出售。",
      thirdparty: "4. 第三方服务的使用",
      thirdpartyP1: "本应用使用以下第三方服务：",
      tpFirebase: "Firebase (Google LLC)",
      tpFirebaseDesc: "认证、数据存储、同步",
      tpStripe: "Stripe",
      tpStripeDesc: "按量计费方案的支付处理",
      tpWC: "WalletConnect",
      tpWCDesc: "移动钱包连接",
      tpRPC: "区块链RPC节点",
      tpRPCDesc: "交易提交、余额查询",
      thirdpartyLinks: "各服务的隐私政策：",
      retention: "5. 数据存储和保留期限",
      retentionLocal: "本地存储",
      retentionLocalDesc: "会话数据、设置信息（保留至应用卸载）",
      retentionCloud: "Firebase（云端）",
      retentionCloudDesc: "用户数据、积分历史（保留至账户注销）",
      deletion: "6. 数据删除",
      deletionP1: "您可以通过以下方式删除数据：",
      deletionLocal: "本地数据",
      deletionLocalDesc: '设置画面的"清除所有数据"按钮，或卸载应用',
      deletionCloud: "云端数据",
      deletionCloudDesc: "请联系以下联系方式请求删除数据",
      security: "7. 安全性",
      securityP1: "本应用实施以下安全措施：",
      securityItem1: "通过Firebase Authentication实现安全认证",
      securityItem2: "通过Firebase Security Rules实现访问控制",
      securityItem3: "网络一致性检查防止误转账",
      securityItem4: "不存储私钥（仅在内存中使用）",
      changes: "8. 隐私政策的变更",
      changesP1: "本隐私政策可能因法律变更或服务变更而不经通知进行修改。如有重大变更，将通过应用内通知或本页面告知。",
      contact: "9. 联系我们",
      contactP1: "如对本隐私政策有疑问或需要请求删除数据，请联系：",
      contactP2: "我们通常在3个工作日内回复咨询。",
      law: "10. 适用法律和管辖权",
      lawP1: "本隐私政策受日本法律管辖。与本政策相关的争议以东京地方法院为第一审专属合意管辖法院。"
    }
  }
};

function getNestedTranslation(obj, key) {
  if (!obj || !key) return null;
  return key.split('.').reduce((o, i) => (o ? o[i] : null), obj);
}

function setLanguage(lang) {
  const targetLang = translations[lang] ? lang : 'en';
  localStorage.setItem('preferredLanguage', lang);

  // Update button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    let translation = getNestedTranslation(translations[targetLang], key);
    if (!translation && targetLang !== 'en') {
      translation = getNestedTranslation(translations['en'], key);
    }
    if (!translation && targetLang !== 'ja') {
      translation = getNestedTranslation(translations['ja'], key);
    }
    if (translation) {
      if (element.tagName === 'META' && element.getAttribute('name') === 'description') {
        element.setAttribute('content', translation);
      } else {
        element.innerHTML = translation;
      }
    }
  });

  // Update html lang attribute
  document.documentElement.lang = targetLang;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  const savedLang = urlLang || localStorage.getItem('preferredLanguage') || 'en';
  setLanguage(savedLang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });
});
