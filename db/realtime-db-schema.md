# Firebase Realtime Database スキーマ

環境ごとに `dev` / `prd` のルートパスで分離。

---

## ツリー構造

```
root/
├── nonces/
│   └── {walletAddress}/          # ウォレット認証用 nonce（Cloud Functions のみ書き込み）
│       └── nonce: string
│
├── dev/                          # 開発環境
│   ├── master/                   # 読み取り専用マスターデータ（管理者のみ書き込み）
│   │   ├── maintenance/          # メンテナンス設定
│   │   │   ├── active: boolean
│   │   │   ├── message: string
│   │   │   └── scheduledEnd: string | null
│   │   └── information/          # お知らせ
│   │       └── {infoId}/
│   │           ├── title: string
│   │           ├── body: string
│   │           ├── publishedAt: string
│   │           └── active: boolean
│   │
│   └── users/
│       └── {uid}/                # Firebase Auth UID
│           ├── billing/          # 課金情報 ※将来 TiDB に移行予定
│           │   ├── stripeCustomerId: string
│           │   ├── stripeSubscriptionId: string | null
│           │   ├── subscribedAt: string | null         # ISO 8601
│           │   ├── cancelAtPeriodEnd: boolean
│           │   ├── cancelRequestedAt: string | null
│           │   └── cancelledAt: string | null
│           │
│           └── points/           # 使用量ポイント ※将来 TiDB に移行予定
│               └── {pushId}/
│                   ├── type: "transaction" | "kyc_email"
│                   ├── description: string
│                   ├── points: number
│                   ├── createdAt: string               # ISO 8601
│                   ├── sessionId?: string
│                   └── sessionName?: string
│
└── prd/                          # 本番環境（dev と同じ構造）
    ├── master/
    └── users/
```

---

## アクセスルール概要

| パス | 読み | 書き |
|------|------|------|
| `nonces/{address}` | 不可 | Cloud Functions のみ |
| `{env}/master` | ログイン済みユーザー | 不可（Cloud Functions のみ） |
| `{env}/users/{uid}` | 本人のみ | 本人のみ |

---

## 注意事項

- `billing/` と `points/` は将来 TiDB に移行予定 → `db/tidb-create.sql` 参照
- ルートファイル: `db/realtime-db-rules.json`（デプロイ元）
- `database.rules.json`（ルートのファイル）は Firebase CLI がデプロイに使用するため、`db/` の内容を反映してから `firebase deploy --only database` を実行すること
