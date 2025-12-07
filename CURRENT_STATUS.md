# CRM V12 Current Status

## プロジェクト情報

| 項目 | 値 |
| :--- | :--- |
| プロジェクト名 | CRM V12 System |
| GitHub Repository | https://github.com/adminsaiproducts/V12 |
| Firestore Database | `crm-database-v9` (GCP: `crm-appsheet-v7`) |
| Firebase Hosting | crm-appsheet-v7.web.app |
| Algolia Index | `customers` (App ID: `5PE7L5U694`) |

## 技術スタック

| カテゴリ | 技術 |
| :--- | :--- |
| Frontend | React 18 + TypeScript + Vite |
| UI | Material UI v6 |
| Routing | React Router DOM v6 |
| Form | React Hook Form + Zod |
| Database | Firestore (Firebase JS SDK) |
| Search | Algolia (algoliasearch) |
| Hosting | Firebase Hosting |

## 完了したマイルストーン

### Phase 1: Firebase Hosting Setup ✅
1. **Firebase Hostingプロジェクト設定** (crm-appsheet-v7)
2. **Vite + React + TypeScript基盤構築**
3. **Material UI統合**
4. **React Router DOM設定**

### Phase 2: Firestore Integration ✅
5. **Firebase JS SDK統合**
6. **Firestore直接アクセス実装**
7. **顧客データ取得機能** (13,673件)

### Phase 3: Customer Edit Features ✅ (2025-12-07)
8. **顧客編集機能:**
   - React Hook Form + Zodバリデーション
   - 既存データとの整合性（性別「男」「女」対応）
9. **郵便番号→住所変換:**
   - zipcloud API連携
   - 複数結果がある場合の選択UI
10. **住所→郵便番号検索:**
    - HeartRails Geo API連携
    - 逆引き機能
11. **整合性チェック:**
    - 郵便番号と住所の不一致警告機能

### Phase 4: Algolia Search Integration ✅ (2025-12-07)
12. **Algoliaインデックス設定:**
    - searchableAttributes設定
    - 日本語対応（queryLanguages: ['ja']）
13. **Firestore→Algolia同期スクリプト作成:**
    - `scripts/sync-firestore-to-algolia.cjs`
    - Firebase Admin SDK使用
    - 13,673件の顧客データを同期
14. **住所データ完全同期問題の解決:**
    - **問題**: 一覧で住所が短く表示（「東京都目黒区青葉台」のみ）
    - **原因**: Algoliaが古いJSONファイルから同期されていた
    - **解決**: Firestoreから直接Algoliaに同期するスクリプトを作成

### Phase 5: Customer CRUD Completion ✅ (2025-12-07)
15. **顧客サービス層作成:**
    - `src/lib/customerService.ts`
    - CRUD操作 + Algolia自動同期
16. **顧客新規作成機能:**
    - trackingNoの自動採番（数字最大+1）
    - 作成時にAlgoliaへ自動同期
17. **顧客削除機能（論理削除）:**
    - status: 'deleted'による論理削除
    - 削除確認ダイアログ
    - 削除時にAlgoliaから自動削除
18. **Algoliaリアルタイム同期:**
    - 作成・更新・削除時に個別同期
    - バッチ同期スクリプトとの併用可能

### 現在のデータ統計
| データ種別 | 件数 | 備考 |
|-----------|------|------|
| 通常顧客 | 10,852件 | 数字始まりの追客NO |
| 典礼責任者顧客 | 2,821件 | M番号 |
| **合計顧客数** | **13,673件** | Algolia同期済み |

## 次のステップ

### 優先タスク
1. [ ] **Firebase Auth実装**: Google認証
2. [ ] **顧客詳細ページ改善**: 関係性表示
3. [ ] **Deals Integration**: 顧客に紐づく案件表示

### 将来的な拡張
- **Dashboard**: 売上ダッシュボード移植（V9から）
- **関係性機能**: 顧客間関係性の表示・編集

## 既知の課題

### Technical Debt
- Firebase AuthはAdmin SDK認証のみ（ユーザー認証未実装）
- 削除済み顧客（status: 'deleted'）の検索除外フィルタ未実装

### 重要な注意点
詳細は `docs/DEVELOPMENT_GUIDE.md` を参照

1. **Algolia同期は必ずFirestoreから直接行う**（古いJSONファイル禁止）
2. **住所データはオブジェクトとして保存**（JSON文字列ではない）
3. **Zodスキーマは既存データのフォーマットを確認してから設計**

## 変更履歴 (Changelog)

| Date | Type | Details | Status |
| :--- | :--- | :--- | :--- |
| 2025-12-07 | SETUP | V12プロジェクト初期化（Vite + React + TypeScript） | ✅ Done |
| 2025-12-07 | FEATURE | Firebase Hosting設定 | ✅ Done |
| 2025-12-07 | FEATURE | Material UI + React Router統合 | ✅ Done |
| 2025-12-07 | FEATURE | Firestore直接アクセス実装 | ✅ Done |
| 2025-12-07 | FEATURE | 顧客編集機能（React Hook Form + Zod） | ✅ Done |
| 2025-12-07 | FEATURE | 郵便番号⇔住所の双方向検索機能 | ✅ Done |
| 2025-12-07 | FEATURE | Algoliaインデックス設定 | ✅ Done |
| 2025-12-07 | BUG | 顧客一覧で住所が短く表示される問題を発見 | ✅ Fixed |
| 2025-12-07 | FIX | sync-firestore-to-algolia.cjs作成（Firestore直接同期） | ✅ Done |
| 2025-12-07 | DOCS | PROJECT_MANIFEST.md作成 | ✅ Done |
| 2025-12-07 | DOCS | CURRENT_STATUS.md作成 | ✅ Done |
| 2025-12-07 | DOCS | DEVELOPMENT_GUIDE.md作成 | ✅ Done |
| 2025-12-07 | FEATURE | 顧客新規作成機能（自動採番付き） | ✅ Done |
| 2025-12-07 | FEATURE | 顧客削除機能（論理削除 + 確認ダイアログ） | ✅ Done |
| 2025-12-07 | FEATURE | Algoliaリアルタイム同期（CRUD連動） | ✅ Done |
| 2025-12-07 | FEATURE | customerService.ts作成（CRUD統合層） | ✅ Done |

---

*最終更新: 2025-12-07*
