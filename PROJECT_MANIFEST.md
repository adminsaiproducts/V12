# CRM V12 プロジェクトマニフェスト

**バージョン**: 12.0.0
**最終更新**: 2025-12-29

## プロジェクト概要

CRM V12は、墓石販売業向けの顧客管理システムです。
V9からの移行版として、以下の改善を実現しています：

- GENIEE CRMからのクリーンなデータ移行
- React + TypeScript + Material UI によるモダンなフロントエンド
- Firebase (Firestore) + Algolia によるスケーラブルなバックエンド

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|-----|-----------|-----|
| React | 18.x | UIフレームワーク |
| TypeScript | 5.x | 型安全な開発 |
| Vite | 5.x | ビルドツール |
| Material UI | 5.x | UIコンポーネント |
| React Router | 6.x | ルーティング |
| React Hook Form | - | フォーム管理 |
| Zod | - | バリデーション |

### バックエンド

| 技術 | 用途 |
|-----|-----|
| Firebase Firestore | データベース (crm-database-v9) |
| Firebase Authentication | 認証 (Google OAuth) |
| Firebase Hosting | ホスティング |
| Algolia | 全文検索 |

### 開発ツール

| ツール | 用途 |
|-------|-----|
| Node.js | 18+ |
| npm | パッケージ管理 |
| ESLint | リンター |
| Prettier | コードフォーマッタ |

---

## ディレクトリ構造

```
V12/
├── src/
│   ├── api/              # APIクライアント
│   │   ├── customers.ts  # 顧客API
│   │   ├── deals.ts      # 商談API
│   │   ├── relationships.ts  # 関係性API
│   │   ├── sales.ts      # 売上API
│   │   └── searchLists.ts # 検索リストAPI
│   ├── components/       # 再利用可能なコンポーネント
│   │   ├── DealForm.tsx  # 商談フォーム（ダイアログ）
│   │   ├── RelationshipCard.tsx  # 関係性カード
│   │   ├── SearchListBuilder.tsx # 検索条件ビルダー
│   │   └── ...
│   ├── hooks/            # カスタムフック
│   │   ├── useAlgoliaSearch.ts  # Algolia検索
│   │   └── useMasters.ts        # マスターデータ取得
│   ├── data/             # マスターデータ (JSON)
│   │   ├── employees.json       # 従業員マスター
│   │   └── relationshipTypes.json  # 関係性タイプ
│   ├── lib/              # ライブラリ設定
│   │   ├── algolia.ts    # Algolia設定
│   │   ├── filterEngine.ts  # 顧客フィルタリングロジック
│   │   └── csvExport.ts  # CSVエクスポート機能
│   ├── pages/            # ページコンポーネント
│   │   ├── Customers.tsx       # 顧客一覧
│   │   ├── CustomerDetail.tsx  # 顧客詳細
│   │   ├── DealList.tsx        # 商談一覧
│   │   ├── DealEdit.tsx        # 商談編集
│   │   ├── Relationships.tsx   # 関係性一覧
│   │   ├── TreeBurialDealList.tsx      # 樹木墓商談一覧
│   │   ├── TreeBurialDealDetail.tsx    # 樹木墓商談詳細
│   │   ├── TreeBurialDealEdit.tsx      # 樹木墓商談編集
│   │   ├── BurialPersonList.tsx        # 樹木墓オプション一覧
│   │   ├── BurialPersonDetail.tsx      # 樹木墓オプション詳細
│   │   ├── TreeBurialSummaryByTemple.tsx # 寺院別樹木墓集計
│   │   └── ...
│   ├── firebase/         # Firebase設定
│   │   └── config.ts     # Firebase初期化 (databaseId: crm-database-v9)
│   ├── types/            # TypeScript型定義
│   │   ├── firestore.ts  # Firestoreエンティティ型
│   │   └── searchList.ts # 検索リスト条件型
│   └── utils/            # ユーティリティ関数
│       └── format.ts     # formatCurrency等
├── scripts/              # 管理スクリプト
│   ├── migrate-geniee-csv.cjs      # GENIEE CSVからの移行
│   ├── sync-firestore-to-algolia.cjs # Algolia同期
│   ├── update-customer-deal-flags.cjs # 顧客商談フラグ更新
│   ├── fix-deal-assigned-to.cjs    # 商談担当者名更新
│   ├── check-firestore-data.cjs    # Firestore確認
│   ├── check-algolia.cjs           # Algolia確認
│   └── delete-all-customers.cjs    # 顧客全削除
├── docs/                 # ドキュメント
│   └── DEVELOPMENT_GUIDE.md
├── firestore.rules       # Firestoreセキュリティルール
├── firestore.indexes.json # Firestoreインデックス
├── CURRENT_STATUS.md     # 現在の状況
└── PROJECT_MANIFEST.md   # このファイル
```

---

## Firebase設定

### プロジェクト情報

| 項目 | 値 |
|-----|---|
| プロジェクトID | crm-appsheet-v7 |
| データベースID | crm-database-v9 |
| リージョン | asia-northeast1 |

### コレクション構造

| コレクション | 説明 |
|-------------|-----|
| Customers | 顧客情報 |
| Deals | 商談情報 |
| TreeBurialDeals | 樹木墓商談 |
| BurialPersons | 樹木墓オプション（埋葬者情報） |
| Relationships | 顧客間関係性 |
| Temples | 寺院情報 |
| Activities | 活動履歴 |
| CustomerSearchLists | 検索条件リスト（カスタム保存） |

### 認証

- Google OAuth認証
- ドメイン制限: `@saiproducts.co.jp`

---

## Algolia設定

| 項目 | 値 |
|-----|---|
| アプリケーションID | 5PE7L5U694 |
| インデックス名 | customers |
| 検索可能属性 | name, nameKana, phone, address, memo |

---

## データ仕様

### Customer (顧客)

```typescript
interface Customer {
  id: string;                    // Firestoreドキュメント ID (customer_XXXX)
  trackingNo: string;            // 追客番号 (数値文字列)
  name: string;                  // 使用者名
  nameKana?: string;             // フリガナ
  phone?: string;                // 電話番号
  mobile?: string;               // 携帯番号
  email?: string;                // メールアドレス
  address?: {                    // 住所
    postalCode?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    streetNumber?: string;
    building?: string;
    full?: string;
  };
  branch?: string;               // 拠点
  visitRoute?: string;           // 来寺経緯
  receptionist?: string;         // 受付担当
  doNotContact?: boolean;        // 営業活動不可
  crossSellTarget?: boolean;     // クロスセル対象
  memo?: string;                 // 備考
  memorialContact?: {...};       // 典礼責任者
  needs?: {...};                 // ニーズ情報
  customerCategory?: string;     // 顧客区分 (individual/corporation/professional)
  hasDeals?: boolean;            // 一般商談有無
  hasTreeBurialDeals?: boolean;  // 樹木墓商談有無
  hasBurialPersons?: boolean;    // 樹木墓オプション有無
  createdAt?: string;            // 作成日時
  updatedAt?: string;            // 更新日時
}
```

### Deal (商談)

```typescript
interface Deal {
  id: string;                    // Firestoreドキュメント ID
  title: string;                 // 商談名
  stage: DealStage;              // ステージ
  probability?: number;          // 確度
  amount?: number;               // 金額
  assignedTo?: string;           // 担当者（従業員マスターのname）
  templeName?: string;           // 寺院名
  visitRoute?: string;           // 流入経路
  // ... その他フィールド
}
```

### 重要な型の注意点

**trackingNo**:
- 常に **文字列** として扱う
- URLパラメータ、クエリ、保存すべて文字列で統一
- 数値との比較時は型変換に注意

**assignedTo (担当者)**:
- 従業員マスター (employees.json) の name フィールドを使用
- 形式: 「姓 名」（スペース区切り）例: 「冨田 恵」

---

## マスターデータ

### 従業員マスター (src/data/employees.json)

```typescript
interface Employee {
  id: string;          // 従業員ID
  name: string;        // 名前（姓 名）例: "冨田 恵"
  lastName: string;    // 姓
  firstName: string;   // 名
  isActive: boolean;   // アクティブフラグ
  sortOrder: number;   // 表示順
}
```

### 関係性タイプマスター (src/data/relationshipTypes.json)

```typescript
interface RelationshipType {
  code: string;        // コード
  name: string;        // 名称
}
```

---

## 外部サービス認証情報

### サービスアカウント

```
C:\Users\satos\OneDrive\○大西\〇新CRMプロジェクト\Githubとの連携リポジトリ宛先\V9\crm-appsheet-v7-4cce8f749b52.json
```

### 環境変数 (.env)

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=crm-appsheet-v7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=crm-appsheet-v7
VITE_ALGOLIA_APP_ID=5PE7L5U694
VITE_ALGOLIA_SEARCH_KEY=...
```

---

## 開発フロー

### 開発サーバー起動

```bash
cd V12
npm run dev
# http://localhost:3000 (または 3001, 3002, 3003)
```

### ビルド

```bash
npm run build
```

### デプロイ

```bash
firebase deploy --only hosting
```

---

## スクリプト使用方法

### データ移行 (GENIEE CSV)

```bash
node scripts/migrate-geniee-csv.cjs --csv <CSVファイルパス>

# オプション
--dry-run       # ドライラン（書き込みなし）
--skip-delete   # 既存データ削除スキップ
--skip-algolia  # Algolia同期スキップ
```

### Algolia同期

```bash
node scripts/sync-firestore-to-algolia.cjs
```

### 顧客商談フラグ更新

顧客が各種商談を持っているかのフラグを更新:

```bash
# ドライラン（確認のみ）
node scripts/update-customer-deal-flags.cjs --dry-run

# 本番実行
node scripts/update-customer-deal-flags.cjs
```

このスクリプトは:
- Deals, TreeBurialDeals, BurialPersonsの3コレクションを走査
- 各顧客の `hasDeals`, `hasTreeBurialDeals`, `hasBurialPersons` フラグを更新
- 実行後はAlgolia同期も必要

### 商談担当者名更新

```bash
node scripts/fix-deal-assigned-to.cjs
```

### データ確認

```bash
node scripts/check-firestore-data.cjs  # Firestore
node scripts/check-algolia.cjs         # Algolia
```

---

## 既知の問題と対応策

### 【最重要】顧客リンクはtrackingNoを使用する

**問題**: 顧客へのリンクで`linkedCustomer.id`（Firestore ドキュメントID）を使用すると、CustomerDetailで「顧客が見つかりません」エラーになる

**原因**:
- `linkedCustomer.id`は`customer_11545`形式（FirestoreドキュメントID）
- CustomerDetailは`getCustomerByTrackingNo`を使用しており、`11545`形式（trackingNo）を期待
- この2つは異なる形式のため、マッチしない

**正しい実装**:
```typescript
// 顧客へのリンクは必ずtrackingNoを使用
navigate(`/customers/${deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo}`)

// ❌ 間違った実装（絶対に使わない）
navigate(`/customers/${linkedCustomer.id}`)
```

**再発防止策**:
- 顧客URLには**常に`trackingNo`（管理番号）**を使用
- `linkedCustomer.id`は**URLに使用しない**
- 紐づけ時は`linkedCustomerTrackingNo`フィールドを必ず保存

### trackingNoの型不整合

**問題**: Firestoreに数値と文字列が混在
**対応**: `getCustomerByTrackingNo`で両方の型をクエリ
**恒久対応**: 次回移行時に全て文字列で統一

### Algoliaキャッシュ

**問題**: ブラウザにキャッシュが残る
**対応**: ハードリフレッシュ (Ctrl+Shift+R)

### 関係性データの品質

**問題**: 2,005件がtargetCustomerId=null
**対応**: APIでnullチェックを追加し有効なデータのみ表示
**恒久対応**: 将来的に顧客名マッチングを改善

### 従業員名の空白不一致

**問題**: 既存データは「山田太郎」（空白なし）、従業員マスターは「山田 太郎」（空白あり）で比較がマッチしない

**対応策**:
```typescript
// 名前比較時は必ず空白を正規化
const normalizeName = (name: string) => name.replace(/[\s　]+/g, '');
const matchingEmployee = employees.find(emp =>
  normalizeName(emp.name) === normalizeName(currentValue)
);
```

**注意**: 半角スペース`\s`と全角スペース`　`の両方を考慮すること

### BurialPersonsの顧客紐づけフィールドが異なる

**問題**:
- Deals/TreeBurialDeals は `linkedCustomerTrackingNo` で顧客紐づけ
- BurialPersons は `linkedCustomerId` で顧客紐づけ（形式: `customer_XXXXX`）

**対応策**:
```javascript
// BurialPersonsから顧客trackingNoを取得する場合
if (data.linkedCustomerTrackingNo) {
  trackingNo = data.linkedCustomerTrackingNo;
} else if (data.linkedCustomerId) {
  // customer_XXXXX 形式からtrackingNoを抽出
  trackingNo = data.linkedCustomerId.replace('customer_', '');
}
```

**教訓**: コレクションごとにフィールド名が異なる可能性があるため、サンプルデータを必ず確認してからスクリプトを作成すること

---

## V9からの主な変更点

1. **データソース**: MongoDB形式 → GENIEE CSV直接移行
2. **trackingNo形式**: M-prefix (`M1744`) → 数値文字列 (`823`)
3. **電話番号**: 10桁切り捨て問題を解消
4. **備考欄**: 「電話番号欄から移動」ノイズを除去
5. **フロントエンド**: React + Material UI で刷新
6. **商談担当者**: 従業員マスターとの連携を実装

---

## 関連ドキュメント

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 現在の作業状況
- [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) - 開発ガイド
- [firestore.rules](./firestore.rules) - セキュリティルール
