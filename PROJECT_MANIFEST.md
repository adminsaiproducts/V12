# CRM V12 MANIFEST: Firebase Hosting + Modern React Architecture

## Repository Information
- **Name**: CRM V12
- **URL**: https://github.com/adminsaiproducts/V12
- **Branch**: main
- **Hosting**: Firebase Hosting (crm-appsheet-v7.web.app)

## 0. 戦略的使命 (Strategic Mission)

本プロジェクトは、V9のGAS制限（iframe内動作、URL制御不可）を完全に解消し、**Firebase Hosting + Firestore + Algolia**による次世代CRMを実現する。

### V9 → V12 移行の背景

V9はGASウェブアプリとして動作していたが、以下の制限により完全なWeb体験が提供できなかった：
- ブラウザアドレスバーのURL変更不可（iframe制限）
- ディープリンクがクエリパラメータ方式に限定
- GASのURLFetchクォータ制限（20,000/day）

V12ではFirebase Hostingに移行し、これらの制限を完全に解消する。

## 1. 環境設定

### Firebase/Firestore設定
| プロパティ名 | 設定値 |
| :--- | :--- |
| `Firebase Project ID` | `crm-appsheet-v7` |
| `Firestore Database ID` | `crm-database-v9` |
| `Firebase Hosting URL` | `https://crm-appsheet-v7.web.app` |

### Algolia設定
| プロパティ名 | 設定値 |
| :--- | :--- |
| `ALGOLIA_APP_ID` | `5PE7L5U694` |
| `ALGOLIA_INDEX_NAME` | `customers` |

### サービスアカウント
- サービスアカウントファイル: `V9/crm-appsheet-v7-4cce8f749b52.json`
- 用途: Firebase Admin SDK認証、Firestore REST API

## 2. 技術アーキテクチャ

### A. Firebase Hosting + React SPA
```
V12/
├── dist/                # [Deploy Target] Firebase Hosting
├── src/                 # [Client Side] React + TypeScript + Vite
│   ├── components/      # 共通コンポーネント
│   ├── features/        # 機能別モジュール
│   │   └── customers/   # 顧客機能
│   ├── lib/             # ユーティリティ・API
│   │   ├── firebase.ts  # Firebase初期化
│   │   └── algolia.ts   # Algolia検索
│   └── App.tsx          # メインアプリ
├── scripts/             # ユーティリティスクリプト
│   └── sync-firestore-to-algolia.cjs  # Firestore→Algolia同期
└── vite.config.ts
```

### B. Technical Rules (鉄の掟)
1. **Direct Firestore Access**: Firebase JS SDKでFirestoreに直接アクセス
2. **Algolia for Search**: 検索機能はAlgoliaを使用（Firestoreの全文検索制限回避）
3. **React Router DOM**: 完全なURLルーティング（v6）
4. **Firebase Auth**: Google認証によるアクセス制御

### C. データ同期アーキテクチャ
```
[Firestore] ←→ [V12 React App]
     ↓
[Algolia] ← sync-firestore-to-algolia.cjs
     ↓
[高速検索]
```

**重要**: Algoliaは必ずFirestoreから直接同期する。古いJSONファイルからの同期は厳禁。

## 3. 開発ワークフロー

### Build Commands
```bash
npm run dev             # 開発サーバー起動 (localhost:3000)
npm run build           # 本番ビルド
npm run preview         # ビルド結果プレビュー
firebase deploy         # Firebase Hostingにデプロイ
```

### Algolia同期
```bash
node scripts/sync-firestore-to-algolia.cjs  # Firestore→Algolia同期
```

## 4. 完了済み機能

### Phase 1: Firebase Hosting Setup ✅
- [x] Firebase Hostingプロジェクト設定
- [x] Vite + React + TypeScript基盤
- [x] Firebase JS SDK統合

### Phase 2: Firestore Integration ✅
- [x] Firestore直接アクセス実装
- [x] 顧客データ取得・更新機能

### Phase 3: Customer Edit Features ✅ (2025-12-07)
- [x] 顧客編集機能（React Hook Form + Zod）
- [x] 郵便番号→住所自動入力（複数候補選択対応）
- [x] 住所→郵便番号逆引き
- [x] 整合性チェック（郵便番号と住所の不一致警告）

### Phase 4: Algolia Search Integration ✅ (2025-12-07)
- [x] Algoliaインデックス設定
- [x] Firestore→Algolia同期スクリプト
- [x] 高速顧客検索（13,673件を即座に検索）
- [x] 住所データの完全同期（番地・建物名含む）

## 5. 次のステップ

### 優先タスク
1. **CRUD Operations - Create**: 顧客新規作成機能
2. **CRUD Operations - Delete**: 顧客削除機能（論理削除）
3. **Firebase Auth**: Google認証の実装

### 将来的な拡張
- **Deals Integration**: 顧客に紐づく案件表示
- **Relationships**: 顧客間関係性表示
- **Dashboard**: 売上ダッシュボード移植

## 6. 既知の問題と対策

### よくある失敗パターン

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 住所が一覧で短い | Algoliaが古いデータを保持 | `sync-firestore-to-algolia.cjs`で再同期 |
| Algolia検索結果が古い | JSONファイルから同期した | **必ずFirestoreから直接同期** |
| Firebase認証エラー | サービスアカウント未設定 | V9/crm-appsheet-v7-...jsonを使用 |
| Firestore接続エラー | Database IDが違う | `crm-database-v9`を指定 |

### Algolia同期の重要ルール

**絶対守るべきルール**: AlgoliaへのデータはFirestoreから直接取得して同期する

```javascript
// ✅ 正しい方法: Firestoreから直接
const db = admin.firestore();
db.settings({ databaseId: 'crm-database-v9' });
const snapshot = await db.collection('Customers').get();
// → Algoliaに同期

// ❌ 間違った方法: 古いJSONファイルから
const data = JSON.parse(fs.readFileSync('old-export.json'));
// → 古いデータでAlgoliaを上書きしてしまう
```

## 7. 参照ドキュメント

| ドキュメント | 役割 | 更新タイミング | 必読度 |
|-------------|------|----------------|--------|
| [CURRENT_STATUS.md](./CURRENT_STATUS.md) | 進捗・完了機能・変更履歴 | 機能完了/問題解決時 | ★★★ |
| [PROJECT_MANIFEST.md](./PROJECT_MANIFEST.md) | プロジェクト全体像・鉄則・環境設定 | アーキテクチャ変更時 | ★★★ |
| [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) | **開発ガイド（必読）** - 知見・失敗・ベストプラクティス | 新しい知見が得られたとき | ★★★ |

### ドキュメントの使い方

1. **開発開始時**: `CURRENT_STATUS.md` → `PROJECT_MANIFEST.md` → `DEVELOPMENT_GUIDE.md` の順で読む
2. **新機能実装時**: 該当する設計書を確認してから実装
3. **問題発生時**: `DEVELOPMENT_GUIDE.md` のトラブルシューティングを確認
4. **セッション終了時**: 知見を `DEVELOPMENT_GUIDE.md` に追記し、`CURRENT_STATUS.md` の変更履歴を更新

## 8. V9からの移行情報

### データソース
- **Firestore**: `crm-database-v9` (V9と共通)
- **顧客データ**: 13,673件（通常顧客 + 典礼責任者）

### V9のコードで参照できるもの
- `V9/scripts/`: データ処理スクリプトの参考
- `V9/docs/DEVELOPMENT_GUIDE.md`: 過去の失敗事例と解決策
- `V9/migration/output/gas-scripts/`: Firestoreインポート用データ

### V9の教訓（V12で解消済み）
| V9の問題 | V12での解決 |
|----------|-------------|
| GAS iframe制限 | Firebase Hosting（完全URL制御） |
| URLFetch クォータ | Firebase JS SDK（制限なし） |
| クエリパラメータ方式ディープリンク | React Routerによる完全パスルーティング |
| GAS :// パターン問題 | 該当なし（純粋React SPA） |

---

*最終更新: 2025-12-07*
