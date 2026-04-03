# Template Bootstrap

1. `cp template.config.example.json template.config.json`
2. `template.config.json` を案件用に編集
3. `npm run template:bootstrap`
4. ルート `.env.example` から `.env.dev` と `.env.prd` を作成して、必要なら `npm run env:sync:functions:dev` / `npm run env:sync:functions:prd` を実行
5. `db/core/tidb-create.sql` を USER DB / ADMIN DB に適用
6. `db/core/tidb-seed.sql` を ADMIN DB に適用
7. optional 機能を使う場合だけ `db/optional/tidb-create.sql` と `db/optional/tidb-seed.sql` を追加適用
8. `npm run template:admin-user -- --email admin@example.com --password change-me`

## Notes

- WalletConnect ログインは標準搭載のままです。ルート `.env.dev` / `.env.prd` の `VITE_WALLETCONNECT_PROJECT_ID` を設定してください。
- optional 機能はルート `.env.dev` / `.env.prd` の `VITE_ENABLE_*` と `ENABLE_*_API` を揃えて使ってください。
- `frontend/vite.functions.ts` は `VITE_ENABLE_*` が `false` の optional API を proxy しません。
- core API と optional API の一覧は `README.md` の `Functions API 構成` を参照してください。
- Windows ビルドスクリプトは `-WslRoot` または `TAURI_TEMPLATE_WSL_ROOT` を使って WSL 側のパスを指定できます。
- Firebase デプロイスクリプトは `FIREBASE_PROJECT_ID` を優先して使います。未指定の場合は `.firebaserc` の `default` を参照します。
