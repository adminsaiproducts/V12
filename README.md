# CRM V12

Firebase Hosting + Firestore + Algolia による高速CRMシステム

## アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐
│  Firebase       │     │    Algolia      │
│  Hosting        │     │    Search       │
│  (React SPA)    │────▶│    (顧客検索)    │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Firebase       │     │   Firebase      │
│  Auth           │────▶│   Firestore     │
│  (Google認証)   │     │   (データ)      │
└─────────────────┘     └─────────────────┘
```

## V9からの主な変更点

| 機能 | V9 (GAS) | V12 (Firebase) |
|------|----------|----------------|
| ホスティング | GAS iframe | Firebase Hosting |
| URL制御 | △ クエリパラメータ方式 | ✓ 完全なパスルーティング |
| 認証 | なし（GAS権限） | Firebase Auth (Google) |
| 検索 | Firestore クエリ | Algolia（高速・タイポ許容） |
| オフライン | ✗ | ✓ PWA対応可能 |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーして設定:

```bash
cp .env.example .env.local
```

必要な値:
- Firebase Console から取得したFirebase設定
- Algolia Dashboard から取得したApp ID / Search API Key

### 3. 開発サーバー起動

```bash
npm run dev
```

### 4. ビルド

```bash
npm run build
```

### 5. Firebase Hostingへデプロイ

```bash
npm run deploy
```

## ディレクトリ構造

```
V12/
├── src/
│   ├── api/              # API層（Firestore/Algolia）
│   │   ├── customers.ts
│   │   └── algolia.ts
│   ├── auth/             # 認証
│   │   ├── AuthProvider.tsx
│   │   └── ProtectedRoute.tsx
│   ├── components/       # UIコンポーネント
│   │   └── Layout/
│   ├── firebase/         # Firebase設定
│   │   └── config.ts
│   ├── pages/            # ページコンポーネント
│   │   ├── Dashboard.tsx
│   │   ├── Customers.tsx
│   │   ├── CustomerDetail.tsx
│   │   └── Login.tsx
│   ├── types/            # 型定義
│   │   └── firestore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── theme.ts
├── firebase.json         # Firebase Hosting設定
├── firestore.rules       # Firestoreセキュリティルール
└── package.json
```

## 移行計画 (V9 → V12)

### Phase 1: 基盤構築 ✅
- [x] プロジェクト初期化
- [x] Vite + React + TypeScript
- [x] Firebase設定
- [x] 認証実装

### Phase 2: Firestore直接アクセス
- [ ] V9と同じFirestoreプロジェクトに接続
- [ ] 顧客CRUD実装
- [ ] リアルタイム同期

### Phase 3: Algolia検索
- [ ] Algoliaアカウント設定
- [ ] インデックス作成
- [ ] 検索UI実装

### Phase 4: UI移植
- [ ] ダッシュボード（グラフ含む）
- [ ] 顧客一覧
- [ ] 顧客詳細
- [ ] 商談機能

### Phase 5: テスト・最適化
- [ ] 50人同時アクセステスト
- [ ] PWA設定
- [ ] パフォーマンス最適化

## コスト見積もり（50人規模）

| サービス | 月額 |
|---------|------|
| Firebase Hosting | 無料枠内 |
| Firestore | ¥500-2,000 |
| Firebase Auth | 無料枠内 |
| Algolia | ¥2,000-5,000 |
| **合計** | **¥2,500-7,000** |

## 関連リポジトリ

- [V9](https://github.com/adminsaiproducts/V9) - GASベース版（維持・参照用）

## ライセンス

Private - SAI Products Co., Ltd.

---

*作成日: 2025-12-07*
*作成者: Claude Code*
