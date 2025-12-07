# CRM V12 開発ガイド

このドキュメントは、V12開発で得られた知見・失敗・ベストプラクティスをまとめ、今後の開発者（人間・AI問わず）が同じ問題を繰り返さないための指針です。

## 1. V12アーキテクチャの概要

### 1.1 V9からの移行背景

V9はGASウェブアプリとして動作していたが、以下の制限がありV12で解消：

| 制限 | V9 | V12 |
|------|-----|-----|
| URL制御 | ✗ iframe内で不可 | ✓ React Router完全対応 |
| API制限 | URLFetch 20,000/day | Firebase SDK無制限 |
| 検索 | GAS経由Firestore | Algolia直接アクセス |
| デプロイ | clasp push + deploy | firebase deploy |

### 1.2 技術スタック

```
Frontend: React 18 + TypeScript + Vite
UI:       Material UI v6
Routing:  React Router DOM v6
Form:     React Hook Form + Zod
Database: Firestore (Firebase JS SDK)
Search:   Algolia
Hosting:  Firebase Hosting
```

## 2. Algolia同期の重要ルール（最重要）

### 2.1 絶対に守るべきルール

**Algoliaへのデータ同期は、必ずFirestoreから直接行う**

```javascript
// ✅ 正しい方法: Firestoreから直接同期
const admin = require('firebase-admin');
const serviceAccount = require('path/to/crm-appsheet-v7-xxx.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crm-appsheet-v7',
});

const db = admin.firestore();
db.settings({ databaseId: 'crm-database-v9' });

const snapshot = await db.collection('Customers').get();
// → このデータをAlgoliaに同期

// ❌ 間違った方法: 古いJSONファイルから同期
const data = JSON.parse(fs.readFileSync('old-export.json'));
// → 古いデータでAlgoliaが上書きされ、データ不整合が発生
```

### 2.2 発生した問題と教訓（2025-12-07）

**問題:**
顧客一覧で住所が短く表示される（「東京都目黒区青葉台」のみ、「4-4-16」が欠落）

**原因分析:**
1. 顧客詳細ページはFirestoreから直接データを取得 → 正しい住所表示
2. 顧客一覧ページはAlgoliaから検索結果を取得 → 住所が短い
3. Algoliaが古いJSONエクスポートファイルから同期されていた

**解決策:**
`scripts/sync-firestore-to-algolia.cjs` を作成し、Firestoreから直接Algoliaに同期

**教訓:**
- 検索と詳細表示でデータソースが異なる場合、必ず同期状態を確認
- Algoliaのデータソースは「Firestore直接」以外認めない

### 2.3 同期スクリプトの使用方法

```bash
# Firestore → Algolia 同期
node scripts/sync-firestore-to-algolia.cjs
```

**実行結果:**
```
🚀 Firestore → Algolia 同期を開始...
🔥 Firebase Admin を初期化中...
📥 Firestoreから顧客データを取得中...
   13,673 件の顧客データを取得
📤 Algoliaにデータをアップロード中...
   13,673 / 13,673 件完了
⚙️ インデックス設定を構成中...
✅ 同期完了!
```

## 3. Firebase Admin SDK認証

### 3.1 サービスアカウント設定

**サービスアカウントファイルの場所:**
```
V9/crm-appsheet-v7-4cce8f749b52.json
```

**使用方法:**
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('path/to/crm-appsheet-v7-4cce8f749b52.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'crm-appsheet-v7',  // projectIdも明示的に指定
});
```

### 3.2 非デフォルトデータベースへのアクセス

```javascript
const db = admin.firestore();
// crm-database-v9 を指定（デフォルトの(default)ではない）
db.settings({ databaseId: 'crm-database-v9' });
```

## 4. 住所データの構造

### 4.1 Firestoreの住所データ形式

```javascript
// V9移行データの形式
address: {
  zipCode: "153-0042",
  prefecture: "東京都",
  city: "目黒区",
  town: "青葉台",
  streetNumber: "4-4-16",        // 番地
  building: "ハイツ青葉台201",   // 建物名（任意）
  fullAddress: "東京都目黒区青葉台4-4-16 ハイツ青葉台201"
}

// V12で更新した場合の形式
address: {
  zipCode: "153-0042",
  prefecture: "東京都",
  city: "目黒区",
  town: "青葉台",
  streetNumber: "4-4-16",
  building: "ハイツ青葉台201",
  full: "東京都目黒区青葉台4-4-16 ハイツ青葉台201"  // fullAddress → full
}
```

### 4.2 住所表示の変換関数

```javascript
function formatAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    // V12形式: fullがあればそれを使用
    if (address.full) return address.full;
    // V9形式: fullAddressがあればそれを使用
    if (address.fullAddress) return address.fullAddress;
    // パーツを結合
    return [
      address.prefecture,
      address.city,
      address.town,
      address.streetNumber,
      address.building
    ].filter(Boolean).join('');
  }
  return '';
}
```

## 5. フォームバリデーション

### 5.1 Zodスキーマと既存データの整合性

**問題:**
既存データに「男」「女」が保存されているが、スキーマは「male」「female」のみを許可

**解決策:**
```typescript
// ❌ 新しいデータのみを想定
gender: z.enum(['male', 'female', 'other', '']).optional()

// ✅ 既存データも許可
gender: z.enum(['male', 'female', 'other', '男', '女', '']).optional()
```

### 5.2 必須フィールドの緩和

既存データに欠損がある場合を考慮：

```typescript
const customerSchema = z.object({
  name: z.string().optional(),  // 空の場合もある
  phone: z.string().optional(),
  address: z.object({
    zipCode: z.string().optional(),
    prefecture: z.string().optional(),
    // ...
  }).optional().nullable(),
});
```

## 6. 外部API利用

### 6.1 郵便番号API

| API | 用途 | URL |
|-----|------|-----|
| zipcloud | 郵便番号→住所 | `https://zipcloud.ibsnet.co.jp/api/search?zipcode=XXX` |
| HeartRails Geo | 住所→郵便番号 | `https://geoapi.heartrails.com/api/json?method=getTowns&...` |

**注意:**
- zipcloudは郵便番号→住所の**一方向のみ**
- 住所→郵便番号の逆引きにはHeartRails Geo APIを使用
- 複数結果がある場合はユーザーに選択させる

### 6.2 Algolia Search API

```typescript
import algoliasearch from 'algoliasearch';

const client = algoliasearch('5PE7L5U694', 'YOUR_SEARCH_ONLY_API_KEY');
const index = client.initIndex('customers');

// 検索
const { hits } = await index.search('検索語', {
  hitsPerPage: 50,
  attributesToRetrieve: ['objectID', 'name', 'address', 'phone'],
});
```

## 7. 開発フロー

### 7.1 ローカル開発

```bash
# 開発サーバー起動
npm run dev
# → http://localhost:3000

# ビルド
npm run build

# プレビュー
npm run preview
```

### 7.2 デプロイ

```bash
# Firebase Hostingにデプロイ
firebase deploy --only hosting
```

### 7.3 Algolia同期

```bash
# Firestoreから最新データを同期
node scripts/sync-firestore-to-algolia.cjs
```

## 8. トラブルシューティング

### 8.1 よくある問題と解決策

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 住所が一覧で短い | Algoliaが古いデータを保持 | `sync-firestore-to-algolia.cjs`で再同期 |
| Firebase認証エラー | サービスアカウント未設定/誤り | V9/crm-appsheet-v7-...jsonを使用 |
| Firestore接続エラー | Database IDが違う | `crm-database-v9`を指定 |
| フォーム送信が動かない | Zodスキーマと既存データ不整合 | 既存データの値を確認してスキーマ修正 |
| Algoliaで検索できない | インデックス未設定 | searchableAttributesを設定 |

### 8.2 デバッグ手順

**Firestoreデータの確認:**
1. Firebase Console → Firestore Database
2. `crm-database-v9` を選択
3. `Customers` コレクションを確認

**Algoliaデータの確認:**
1. Algolia Dashboard → Indices
2. `customers` インデックスを選択
3. Browse → 特定のレコードを検索

## 9. V9からの教訓（過去の失敗事例）

### 9.1 GAS固有の問題（V12では解消）

| V9の問題 | V12での状況 |
|----------|-------------|
| GAS :// パターン問題 | 該当なし（純粋SPA） |
| add-bridge.js必須 | 該当なし（直接API呼び出し） |
| URLFetchクォータ超過 | Firebase SDK使用で制限なし |
| iframe URL制限 | React Routerで完全制御 |

### 9.2 データ構造の問題（引き続き注意）

**住所がJSON文字列で保存される問題:**
```javascript
// ❌ 誤: 文字列として保存
address: '{"zipCode":"232-0063","prefecture":"神奈川県",...}'

// ✅ 正: オブジェクトとして保存
address: { zipCode: "232-0063", prefecture: "神奈川県", ... }
```

**電話番号パースの正規表現バグ:**
```javascript
// ❌ 最後の1桁が切れる
const phoneWithText = original.match(/^([\d\-\(\)\s]+)(.+)$/);

// ✅ 正しい正規表現
const phoneWithText = original.match(/^([\d\-\(\)\s]+)([^\d\-\(\)\s].*)$/);
```

### 9.3 データ同期の問題（最重要）

**Single Source of Truth原則:**
- データ生成は1か所で行う
- Algoliaの同期元は**必ずFirestore**
- 古いエクスポートファイルからの同期は厳禁

## 10. Claude Code / AI開発者への指示

このプロジェクトでAI開発者が作業する際は、以下を必ず確認してください：

### 10.1 新機能追加時

1. **Firestore操作を追加する場合**
   - `crm-database-v9` データベースを使用
   - Firebase Admin SDKの認証を確認

2. **検索機能を追加する場合**
   - Algoliaを使用
   - 新しいフィールドはsearchableAttributesに追加

3. **フォームを実装する場合**
   - 既存データのフォーマットを先に確認
   - Zodスキーマに既存値を含める

### 10.2 Algolia同期が必要な場合

**必ずFirestoreから直接同期する:**
```bash
node scripts/sync-firestore-to-algolia.cjs
```

**絶対にやってはいけないこと:**
- 古いJSONファイルからAlgoliaに同期
- `migration/output/` のファイルをAlgolia同期に使用

### 10.3 セッション終了時のチェックリスト

- [ ] 新しい知見があれば `DEVELOPMENT_GUIDE.md` に追記したか
- [ ] `CURRENT_STATUS.md` の変更履歴を更新したか
- [ ] Gitコミット・プッシュしたか
- [ ] Algoliaのデータが最新か確認したか

## 11. ドキュメント運用ルール

### 11.1 知見の記録フロー

```
1. 本ドキュメント (DEVELOPMENT_GUIDE.md) に詳細を追記
   - 問題の症状
   - 原因
   - 解決策
   - コード例（あれば）

2. CURRENT_STATUS.md の変更履歴に記録
   - 日付、Type（FIX/FEATURE/DOCS等）、概要

3. 重要な失敗パターンは PROJECT_MANIFEST.md にも追加
```

### 11.2 ドキュメント構成と役割

| ドキュメント | 役割 | 更新タイミング |
|-------------|------|----------------|
| `DEVELOPMENT_GUIDE.md` | 開発時の注意点・知見の詳細 | 新しい知見が得られたとき |
| `CURRENT_STATUS.md` | 進捗・完了機能・変更履歴 | 機能完了/問題解決時 |
| `PROJECT_MANIFEST.md` | プロジェクト全体像・鉄則 | アーキテクチャ変更時 |

## 12. ファイル構成と責務

```
V12/
├── src/
│   ├── App.tsx                 # メインアプリ（ルーティング）
│   ├── components/             # 共通UIコンポーネント
│   ├── features/
│   │   └── customers/          # 顧客機能
│   │       ├── CustomerList.tsx
│   │       ├── CustomerDetail.tsx
│   │       └── CustomerEditForm.tsx
│   └── lib/
│       ├── firebase.ts         # Firebase初期化
│       └── algolia.ts          # Algolia設定
├── scripts/
│   ├── sync-firestore-to-algolia.cjs  # Algolia同期（重要）
│   ├── check-address-data.cjs         # 住所データ確認
│   └── sync-to-algolia.cjs            # 旧同期スクリプト（使用禁止）
├── docs/
│   └── DEVELOPMENT_GUIDE.md    # 本ドキュメント
├── CURRENT_STATUS.md           # 進捗・完了機能
├── PROJECT_MANIFEST.md         # プロジェクト全体像
└── vite.config.ts              # Vite設定
```

---

*最終更新: 2025-12-07*
*作成者: Claude Code*
