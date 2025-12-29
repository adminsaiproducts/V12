# CRM V12 開発ガイド

**最終更新**: 2025-12-29

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

### 2.2 顧客商談フラグ更新

顧客が各種商談を持っているかのフラグを計算・更新:

```bash
# ドライラン（確認のみ）
node scripts/update-customer-deal-flags.cjs --dry-run

# 本番実行
node scripts/update-customer-deal-flags.cjs

# 実行後はAlgolia同期も必要
node scripts/sync-firestore-to-algolia.cjs
```

このスクリプトは以下のフラグを更新:
- `hasDeals`: 一般商談（Dealsコレクション）との紐づけ有無
- `hasTreeBurialDeals`: 樹木墓商談（TreeBurialDealsコレクション）との紐づけ有無
- `hasBurialPersons`: 樹木墓オプション（BurialPersonsコレクション）との紐づけ有無

### 2.3 商談担当者名の更新

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

### 2.5 外部ネットワークからのアクセス

開発中のアプリを外部から確認する場合:

```bash
# Firebase Hostingにデプロイ（推奨）
npm run build
firebase deploy --only hosting
# URL: https://crm-appsheet-v7.web.app
```

**注意**: localtunnelやngrokは不安定なため、Firebase Hostingを使用すること

---

## 3. 過去の失敗と教訓（再発防止策）

### 3.1 【最重要】顧客リンクはtrackingNoを使用する

**発生状況**:
- 樹木墓商談詳細、樹木墓オプション詳細で「顧客詳細へ」をクリックすると「顧客が見つかりません」エラー
- URLが `/customers/customer_11545` のようにFirestoreドキュメントID形式になっていた

**原因**:
- `linkedCustomer.id`（FirestoreドキュメントID）を使用していた
- CustomerDetailは`getCustomerByTrackingNo`を使用するため、`customer_XXXXX`形式では見つからない

**正しい実装**:
```typescript
// ✅ 正しい: trackingNoを使用
navigate(`/customers/${deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo}`)

// ❌ 間違い: FirestoreドキュメントIDを使用（絶対にしない）
navigate(`/customers/${linkedCustomer.id}`)
```

**チェックリスト**:
- [ ] 顧客リンクには必ず`trackingNo`を使用
- [ ] `linkedCustomer.id`はURLに**絶対に**使用しない
- [ ] 紐づけ保存時は`linkedCustomerTrackingNo`フィールドを必ず保存

### 3.2 【重要】Firestore databaseId の設定漏れ

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

### 3.3 【重要】trackingNo の型不整合

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

### 3.4 【重要】Algolia の古いデータ残存

**発生状況**:
- Firestoreを更新してもAlgoliaに古いデータが残る
- 検索結果が古いtrackingNo形式（M-prefix）を返す

**対応策**:
```javascript
// 同期前に必ずクリア
await index.clearObjects();
```

**注意**: `clearObjects()`を実行すると一時的に検索が使えなくなる

### 3.5 【重要】バッチ更新でのエラー

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

### 3.6 ブラウザキャッシュ

**発生状況**:
- コード修正後もブラウザに古いJSがキャッシュされている
- 特にAPIクライアント (`src/api/*.ts`) の変更が反映されない

**対応策**:
- `Ctrl+Shift+R` でハードリフレッシュ
- または DevTools > Application > Storage > Clear site data

### 3.7 【重要】2つの商談編集画面

**発生状況**:
- DealForm.tsx（ダイアログ）のみ修正して完了と思い込む
- DealEdit.tsx（独立ページ）に変更が反映されていなかった

**対応策**:
- 商談編集には2つのコンポーネントがあることを認識
  - `src/components/DealForm.tsx` - ダイアログ形式
  - `src/pages/DealEdit.tsx` - 独立ページ形式
- 変更時は両方を確認すること

### 3.8 【重要】従業員名の空白不一致

**発生状況**:
- TreeBurialDealEditで既存の受付担当者名がドロップダウンで選択できない
- 既存データは「山田太郎」、マスターは「山田 太郎」

**原因**:
- 既存データには姓と名の間に空白がない
- 従業員マスターは空白ありで登録されている

**対応策**:
```typescript
// 名前比較時は必ず空白を正規化（半角・全角両方対応）
const normalizeName = (name: string) => name.replace(/[\s　]+/g, '');
const matchingEmployee = employees.find(emp =>
  normalizeName(emp.name) === normalizeName(currentValue)
);
```

### 3.9 【重要】Firebase Hostingデプロイ後にキャッシュが残る

**発生状況**:
- デプロイ完了後もブラウザに古いJSが読み込まれる
- シークレットウィンドウでも変化なし
- Ctrl+Shift+Rでハードリフレッシュしても解決しない

**原因**:
- `firebase.json`でJS/CSSファイルが1年間キャッシュされる設定
- `index.html`にキャッシュ制御ヘッダーがなく、古いJSファイルへの参照が残る

**対応策**:
```json
// firebase.json に index.html の no-cache 設定を追加
{
  "headers": [
    {
      "source": "index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

**チェックリスト**:
- [ ] デプロイ前に`dist`フォルダを削除してクリーンビルド
- [ ] ブラウザのDevTools → Network → "Disable cache"でテスト
- [ ] `firebase.json`で`index.html`はno-cache設定になっているか確認

### 3.10 【重要】Algoliaデータの住所フィールド構造

**発生状況**:
- 都道府県フィルターを実装したが0件しかマッチしない
- `addressPrefecture`フィールドが`undefined`

**原因**:
- Algoliaデータには`addressPrefecture`/`addressCity`フィールドが存在しない場合がある
- 住所は`address`フィールドに連結文字列として格納されている
  - 例: `"東京都 新宿区 市谷本村町 7-4-3305"`

**対応策**:
```typescript
// フィールドが存在しない場合は住所文字列から抽出
if (customer.addressPrefecture) {
  value = customer.addressPrefecture;
} else if (typeof customer.address === 'string') {
  const prefectureMatch = customer.address.match(
    /^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/
  );
  value = prefectureMatch ? prefectureMatch[1] : '';
}
```

**チェックリスト**:
- [ ] Algoliaのデータ構造を必ずコンソールでサンプルデータ確認
- [ ] フィールドが`undefined`の場合のフォールバック処理を実装
- [ ] 複数のデータソース（専用フィールド / 連結文字列）を考慮

### 3.11 【重要】新規APIファイルのFirebaseインポートパス

**発生状況**:
- 新規作成した`src/api/searchLists.ts`でビルドエラー
- `Cannot find module '../firebase'`

**原因**:
- `import { db } from '../firebase'`と記述したが、正しいパスは`../firebase/config`

**対応策**:
```typescript
// ❌ 間違い
import { db } from '../firebase';

// ✅ 正しい
import { db } from '../firebase/config';
```

**チェックリスト**:
- [ ] 新規APIファイル作成時は既存の`src/api/*.ts`からインポート文をコピー
- [ ] Firebase関連は常に`../firebase/config`からインポート

### 3.12 【重要】Firestoreにundefined値を書き込めない

**発生状況**:
- BurialPersonsの更新時にFirestoreエラー
- `Cannot use "undefined" as a Firestore value`

**原因**:
- APIの更新処理でundefinedの値をそのままFirestoreに渡した
- Firestoreはundefinedを値として受け付けない

**対応策**:
```typescript
// undefined値を除外してから保存
const cleanData = Object.fromEntries(
  Object.entries(data).filter(([_, v]) => v !== undefined)
);
await updateDoc(docRef, cleanData);
```

**チェックリスト**:
- [ ] Firestore保存前にundefined値をフィルタリング
- [ ] `firebase/config.ts`で`ignoreUndefinedProperties: true`を設定
- [ ] 新規API作成時は既存APIのデータクレンジング処理を確認

### 3.13 【重要】localtunnelは不安定

**発生状況**:
- `npx localtunnel --port 3000`でトンネルURL取得
- 外部からHTTP 400エラーまたは空白ページ
- レート制限メッセージ

**原因**:
- localtunnelの無料サービスは安定性に欠ける
- レート制限やサービス障害が頻発

**対応策**:
- 外部アクセスが必要な場合はFirebase Hostingにデプロイ
- URL: https://crm-appsheet-v7.web.app

**チェックリスト**:
- [ ] 安定した外部公開にはFirebase Hosting/Vercel/Netlifyを使用
- [ ] localtunnelは一時的なテスト用途のみ
- [ ] 本番デモや顧客確認にはFirebase Hostingを使用

### 3.14 【重要】BurialPersonsの顧客紐づけフィールド名の違い

**発生状況**:
- 商談フラグ計算スクリプトで、BurialPersonsから顧客紐づけを取得しようとしたところ0件

**原因**:
- Deals/TreeBurialDeals: `linkedCustomerTrackingNo` フィールドを使用
- BurialPersons: `linkedCustomerId` フィールドを使用（形式: `customer_XXXXX`）

**対応策**:
```javascript
// BurialPersonsの場合は両方のフィールドを確認
if (data.linkedCustomerTrackingNo) {
  customerWithBurialPersons.add(data.linkedCustomerTrackingNo);
} else if (data.linkedCustomerId) {
  // customer_XXXXX 形式からtrackingNoを抽出
  const trackingNo = data.linkedCustomerId.replace('customer_', '');
  customerWithBurialPersons.add(trackingNo);
}
```

**チェックリスト**:
- [ ] 新しいコレクションを扱う前にサンプルデータを確認
- [ ] 顧客紐づけフィールド名がコレクションによって異なる可能性を考慮
- [ ] `linkedCustomerId`は`customer_`プレフィックス付きであることに注意

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
| `src/api/treeBurialDeals.ts` | 樹木墓商談CRUD API |
| `src/api/burialPersons.ts` | 樹木墓オプションCRUD API |
| `src/api/relationships.ts` | 関係性CRUD API |
| `src/pages/Customers.tsx` | 顧客一覧ページ |
| `src/pages/CustomerDetail.tsx` | 顧客詳細ページ |
| `src/pages/DealEdit.tsx` | 商談編集ページ |
| `src/pages/Relationships.tsx` | 関係性一覧ページ |
| `src/pages/TreeBurialDealList.tsx` | 樹木墓商談一覧 |
| `src/pages/TreeBurialDealDetail.tsx` | 樹木墓商談詳細 |
| `src/pages/TreeBurialDealEdit.tsx` | 樹木墓商談編集 |
| `src/pages/BurialPersonList.tsx` | 樹木墓オプション一覧 |
| `src/pages/BurialPersonDetail.tsx` | 樹木墓オプション詳細 |
| `src/pages/TreeBurialSummaryByTemple.tsx` | 寺院別樹木墓集計 |
| `src/components/DealForm.tsx` | 商談フォームダイアログ |
| `src/hooks/useAlgoliaSearch.ts` | Algolia検索フック |
| `src/hooks/useMasters.ts` | マスターデータフック |
| `src/firebase/config.ts` | Firebase初期化 |
| `src/lib/algolia.ts` | Algoliaクライアント、AlgoliaCustomerHit型 |
| `src/data/employees.json` | 従業員マスター |
| `src/utils/format.ts` | formatCurrency等のフォーマット関数 |
| `src/types/searchList.ts` | 検索リスト条件の型定義 |
| `src/api/searchLists.ts` | 検索リストCRUD API |
| `src/lib/filterEngine.ts` | 顧客フィルタリングロジック |
| `src/lib/csvExport.ts` | CSVエクスポート機能 |
| `src/components/SearchListBuilder.tsx` | 検索条件ビルダーUI |
| `scripts/update-customer-deal-flags.cjs` | 顧客商談フラグ更新スクリプト |
| `scripts/sync-firestore-to-algolia.cjs` | Firestore→Algolia同期スクリプト |

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
| 2025-12-14 | 顧客リンク問題修正（trackingNo統一）、寺院別樹木墓集計ページ追加、従業員名空白正規化対応、樹木葬→樹木墓名称変更 |
| 2025-12-20 | 顧客一覧に拠点・商談アイコン追加、顧客商談フラグ更新スクリプト追加、BurialPersonsの紐づけフィールド差異に関する教訓追加 |
| 2025-12-29 | 検索リスト機能追加（フィルター・CSV出力）、Firebase Hostingキャッシュ問題対応、住所フィールド構造・Firestore undefined値・localtunnel不安定に関する教訓追加 |
