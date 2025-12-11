# CRM V12 開発ガイド

**最終更新**: 2025-12-11

このドキュメントは、CRM V12 の開発を再開する際に必要な情報をまとめています。

---

## 1. 環境セットアップ

### 前提条件

- Node.js 18+
- npm 9+
- Firebase CLI
- Git

### 初回セットアップ

```bash
cd V12
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

デフォルトで http://localhost:3000 で起動します。
ポートが使用中の場合は 3001, 3002, 3003 に自動変更されます。

---

## 2. よくあるタスク

### 2.1 データ移行（GENIEE CSVから）

```bash
# ドライラン（確認のみ）
node scripts/migrate-geniee-csv.cjs --csv "C:\path\to\geniee-export.csv" --dry-run

# 本番実行
node scripts/migrate-geniee-csv.cjs --csv "C:\path\to\geniee-export.csv"
```

**重要**: 移行後は必ずAlgolia同期を実行

```bash
node scripts/sync-firestore-to-algolia.cjs
```

### 2.2 商談担当者名の更新

既存商談の担当者名を従業員マスターの正式名形式に更新:

```bash
node scripts/fix-deal-assigned-to.cjs
```

このスクリプトは:
- 「冨田恵」→「冨田 恵」のようにスペースなし形式をスペースあり形式に変換
- 450件ごとにバッチコミット
- マッチしなかった担当者名を一覧表示

### 2.3 データ確認

```bash
# Firestoreの件数とサンプルデータ確認
node scripts/check-firestore-data.cjs

# Algoliaの件数とサンプルデータ確認
node scripts/check-algolia.cjs
```

### 2.4 ビルド・デプロイ

```bash
# ローカルビルド
npm run build

# Firebaseへデプロイ
firebase deploy --only hosting
```

---

## 3. 過去の失敗と教訓（再発防止策）

### 3.1 【重要】Firestore databaseId の設定漏れ

**発生状況**:
- スクリプトで `databaseId: 'crm-database-v9'` を設定し忘れ
- データがデフォルトFirestoreに書き込まれ、アプリから見えなくなった

**チェックリスト**:
```javascript
// 必ずこの設定を含めること
const db = admin.firestore();
db.settings({
  databaseId: 'crm-database-v9',  // ← これを忘れない！
  ignoreUndefinedProperties: true
});
```

**影響範囲**:
- 全ての管理スクリプト (`scripts/*.cjs`)
- Firebase Admin SDKを使う全てのコード

### 3.2 【重要】trackingNo の型不整合

**発生状況**:
- CSVパーサーが数値を数値型として解釈
- Firestoreに文字列と数値が混在
- フロントエンドのクエリがマッチしない

**対応策**:
```javascript
// CSVから読み込む際は必ず文字列に変換
const trackingNo = String(record['追客NO'] || '').trim();
```

**フロントエンド側の対応** (`src/api/customers.ts`):
```typescript
// 文字列と数値の両方でクエリ
const qString = query(ref, where('trackingNo', '==', trackingNo), limit(1));
if (snapshotString.empty) {
  const qNumber = query(ref, where('trackingNo', '==', parseInt(trackingNo, 10)), limit(1));
}
```

### 3.3 【重要】Algolia の古いデータ残存

**発生状況**:
- Firestoreを更新してもAlgoliaに古いデータが残る
- 検索結果が古いtrackingNo形式（M-prefix）を返す

**対応策**:
```javascript
// 同期前に必ずクリア
await index.clearObjects();
```

**注意**: `clearObjects()`を実行すると一時的に検索が使えなくなる

### 3.4 【重要】バッチ更新でのエラー

**発生状況**:
- 450件ごとにバッチをコミット後、同じバッチオブジェクトを再利用
- "Cannot modify a WriteBatch that has been committed" エラー

**対応策**:
```javascript
// コミット後に新しいバッチを作成
if (batchCount >= 450) {
  await batch.commit();
  batch = db.batch();  // ← 新しいバッチを作成
  batchCount = 0;
}
```

### 3.5 ブラウザキャッシュ

**発生状況**:
- コード修正後もブラウザに古いJSがキャッシュされている
- 特にAPIクライアント (`src/api/*.ts`) の変更が反映されない

**対応策**:
- `Ctrl+Shift+R` でハードリフレッシュ
- または DevTools > Application > Storage > Clear site data

### 3.6 【重要】2つの商談編集画面

**発生状況**:
- DealForm.tsx（ダイアログ）のみ修正して完了と思い込む
- DealEdit.tsx（独立ページ）に変更が反映されていなかった

**対応策**:
- 商談編集には2つのコンポーネントがあることを認識
  - `src/components/DealForm.tsx` - ダイアログ形式
  - `src/pages/DealEdit.tsx` - 独立ページ形式
- 変更時は両方を確認すること

---

## 4. コードベースの重要ポイント

### 4.1 ディレクトリ構造

```
src/
├── api/          # Firestore CRUD操作
├── components/   # 再利用可能なUIコンポーネント
│   └── DealForm.tsx  # 商談フォーム（ダイアログ版）
├── hooks/        # カスタムフック（useAlgoliaSearch, useMasters等）
├── data/         # マスターデータ（employees.json等）
├── lib/          # 外部サービス設定（Algolia等）
├── pages/        # ルーティング対象のページ
│   └── DealEdit.tsx  # 商談編集（独立ページ版）
├── firebase/     # Firebase設定
├── types/        # TypeScript型定義
└── utils/        # ユーティリティ関数
```

### 4.2 データフロー

```
[顧客一覧画面]
    ↓ Algolia検索
    ↓ trackingNoでナビゲート
[顧客詳細画面]
    ↓ getCustomerByTrackingNo(trackingNo)
    ↓ Firestoreクエリ
[顧客データ表示]
```

### 4.3 主要ファイル

| ファイル | 役割 |
|---------|-----|
| `src/api/customers.ts` | 顧客CRUD API |
| `src/api/deals.ts` | 商談CRUD API |
| `src/api/relationships.ts` | 関係性CRUD API |
| `src/pages/Customers.tsx` | 顧客一覧ページ |
| `src/pages/CustomerDetail.tsx` | 顧客詳細ページ |
| `src/pages/DealEdit.tsx` | 商談編集ページ |
| `src/pages/Relationships.tsx` | 関係性一覧ページ |
| `src/components/DealForm.tsx` | 商談フォームダイアログ |
| `src/hooks/useAlgoliaSearch.ts` | Algolia検索フック |
| `src/hooks/useMasters.ts` | マスターデータフック |
| `src/firebase/config.ts` | Firebase初期化 |
| `src/lib/algolia.ts` | Algoliaクライアント |
| `src/data/employees.json` | 従業員マスター |

### 4.4 マスターデータの使い方

```typescript
// 従業員マスターを取得
import { useMaster } from '../hooks/useMasters';

const { master: employeesMaster, loading } = useMaster('employees');

// アクティブな従業員のみ取得
const activeEmployees = employeesMaster?.items
  ?.filter(item => item.isActive)
  .sort((a, b) => a.sortOrder - b.sortOrder) || [];
```

---

## 5. Firebase設定詳細

### プロジェクト情報

| 項目 | 値 |
|-----|---|
| プロジェクトID | `crm-appsheet-v7` |
| データベースID | `crm-database-v9` |
| リージョン | `asia-northeast1` |

### サービスアカウント

管理スクリプトで使用:
```
C:\Users\satos\OneDrive\○大西\〇新CRMプロジェクト\Githubとの連携リポジトリ宛先\V9\crm-appsheet-v7-4cce8f749b52.json
```

### セキュリティルール

`firestore.rules` でドメイン制限を設定:
```
request.auth.token.email.matches('.*@saiproducts\\.co\\.jp')
```

---

## 6. Algolia設定詳細

| 項目 | 値 |
|-----|---|
| アプリID | `5PE7L5U694` |
| インデックス名 | `customers` |

### 検索可能属性

- `name` (顧客名)
- `nameKana` (フリガナ)
- `phone` (電話番号)
- `address` (住所)
- `memo` (備考)

---

## 7. トラブルシューティング

### 「顧客が見つかりません」エラー

1. **Firestoreにデータがあるか確認**
   ```bash
   node scripts/check-firestore-data.cjs
   ```

2. **trackingNoの型を確認**
   - 文字列 `"823"` と数値 `823` は別物

3. **正しいデータベースを参照しているか確認**
   - `crm-database-v9` を使用しているか

### 検索結果が古い

1. **Algoliaデータを確認**
   ```bash
   node scripts/check-algolia.cjs
   ```

2. **再同期**
   ```bash
   node scripts/sync-firestore-to-algolia.cjs
   ```

### ページが更新されない

1. **ハードリフレッシュ**: `Ctrl+Shift+R`
2. **開発サーバー再起動**: `npm run dev`

### 商談編集で担当者がテキストフィールドのまま

1. **DealEdit.tsx も修正されているか確認**
2. **ブラウザのハードリフレッシュ**
3. **開発サーバー再起動**

---

## 8. 開発チェックリスト

### 新しい管理スクリプトを作成する時

- [ ] `databaseId: 'crm-database-v9'` を設定
- [ ] サービスアカウントパスを確認 (`V9/crm-appsheet-v7-4cce8f749b52.json`)
- [ ] `--dry-run` オプションを実装
- [ ] エラーハンドリングを実装
- [ ] バッチ処理時は450件ごとに新しいバッチを作成

### 商談フォームを変更する時

- [ ] `src/components/DealForm.tsx` を修正
- [ ] `src/pages/DealEdit.tsx` も同様に修正
- [ ] ブラウザで両方の画面を確認

### データ移行を実行する時

- [ ] ドライランで件数確認
- [ ] 既存データのバックアップ
- [ ] 移行実行
- [ ] Firestoreデータ確認
- [ ] Algolia同期
- [ ] ブラウザで動作確認

### コード変更をデプロイする時

- [ ] ローカルでビルド確認 (`npm run build`)
- [ ] TypeScriptエラーがないか確認
- [ ] Firebase deploy
- [ ] 本番環境で動作確認

---

## 9. 連絡先・リソース

### GitHub

- リポジトリ: https://github.com/adminsaiproducts/V12

### Firebase Console

- https://console.firebase.google.com/project/crm-appsheet-v7

### Algolia Dashboard

- https://dashboard.algolia.com/apps/5PE7L5U694

---

## 10. 変更履歴

| 日付 | 変更内容 |
|-----|---------|
| 2025-12-07 | 初版作成、データ移行完了、trackingNo型修正 |
| 2025-12-11 | 商談担当者の従業員マスター連携、関係性ページからの遷移機能追加 |
