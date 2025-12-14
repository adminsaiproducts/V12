# CRM V12 現在の状況

**最終更新**: 2025-12-14 JST

## 現在のステータス: 寺院別樹木墓集計ページ完成、顧客リンク問題修正完了

### 直近で実施した作業 (2025-12-14)

1. **寺院別樹木墓集計ページの作成**
   - `src/pages/TreeBurialSummaryByTemple.tsx` を新規作成
   - 月別→寺院別の階層で商談件数、合計金額、彩プロ売上を集計
   - 寺院行クリックで商談一覧ダイアログ表示
   - 商談クリックで詳細画面に遷移
   - メニュー「寺院別樹木墓」からアクセス可能

2. **顧客リンクの統一修正（重大な修正）**
   - 樹木墓商談詳細、樹木墓オプション詳細で顧客リンクが切れていた問題を修正
   - `linkedCustomer.id`（FirestoreドキュメントID）ではなく`linkedCustomerTrackingNo`を使用するよう修正
   - CustomerDetailにFirestoreドキュメントID形式へのフォールバックを追加

3. **樹木葬→樹木墓への名称変更**
   - 全14ファイルで「樹木葬」を「樹木墓」に変更
   - 対象: TreeBurialDealEdit, TreeBurialDealList, TreeBurialDealDetail, AppLayout, HistoryDialog等

4. **従業員マスター選択の空白対応**
   - TreeBurialDealEditで受付担当/埋葬担当を従業員マスターから選択可能に
   - 既存データに空白がない名前（例:「山田太郎」）でも空白ありマスター（例:「山田 太郎」）にマッチするよう対応

5. **顧客検索での管理番号優先**
   - `useAlgoliaSearch.ts`に管理番号の完全一致・前方一致・部分一致の優先順位を追加

6. **金額の3桁区切り表示**
   - `src/utils/format.ts`に`formatCurrency`を作成し全体で使用

---

## 次に必要なアクション

### 動作確認

1. **寺院別樹木墓ページの確認**
   - `/tree-burial-summary` にアクセス
   - 月別アコーディオンを展開し、寺院行をクリック
   - ダイアログで商談をクリックして詳細画面に遷移することを確認

2. **顧客リンクの確認**
   - 樹木墓商談詳細で「顧客詳細へ」をクリック
   - 樹木墓オプション詳細で紐づけ顧客をクリック
   - 正しい顧客詳細画面に遷移することを確認

---

## 現在のシステム状態

### バックエンド (Firebase/Algolia)

| サービス | 状態 | データ件数 |
|---------|------|-----------|
| Firestore (crm-database-v9) | 正常 | Customers: 10,954件 |
| Firestore (crm-database-v9) | 正常 | Deals: 4,890件 |
| Firestore (crm-database-v9) | 正常 | TreeBurialDeals: 多数 |
| Firestore (crm-database-v9) | 正常 | BurialPersons: 多数 |
| Algolia (customers index) | 正常 | 10,954件 |

### フロントエンド (V12)

| 項目 | 状態 |
|-----|------|
| 開発サーバー | 稼働中 |
| ビルド | 正常 |

---

## ファイル変更履歴 (2025-12-14)

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/TreeBurialSummaryByTemple.tsx` | **新規作成** - 寺院別樹木墓集計ページ |
| `src/pages/TreeBurialDealDetail.tsx` | 顧客リンクをtrackingNo使用に修正、名称変更 |
| `src/pages/TreeBurialDealEdit.tsx` | 受付担当/埋葬担当を従業員マスター選択に、空白正規化対応、名称変更 |
| `src/pages/BurialPersonDetail.tsx` | 顧客リンクをtrackingNo使用に修正 |
| `src/pages/CustomerDetail.tsx` | FirestoreドキュメントIDフォールバック追加 |
| `src/hooks/useAlgoliaSearch.ts` | 管理番号優先ソート追加 |
| `src/pages/Customers.tsx` | 検索プレースホルダー更新 |
| `src/components/Layout/AppLayout.tsx` | 「寺院別樹木墓」メニュー追加、名称変更 |
| `src/App.tsx` | 寺院別樹木墓ルート追加 |
| `src/utils/format.ts` | formatCurrency追加 |
| 他14ファイル | 樹木葬→樹木墓の名称変更 |

---

## 発生した問題と解決策 (2025-12-14)

### 問題1: 顧客リンクが切れていた（重大）

**症状**:
- 樹木墓商談詳細/樹木墓オプション詳細で「顧客詳細へ」をクリックすると「顧客が見つかりません」エラー
- URLが `/customers/customer_11545` のようにFirestoreドキュメントID形式になっていた

**原因**:
- `linkedCustomer.trackingNo || linkedCustomer.id` としていたが、trackingNoがundefinedの場合にFirestoreドキュメントIDが使われた
- CustomerDetailは`getCustomerByTrackingNo`を使用するためFirestoreドキュメントIDでは見つからない

**解決**:
- `deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo` を使用するよう修正
- CustomerDetailにフォールバックを追加（`customer_`で始まる場合は`getCustomerById`を試行）

**再発防止策**:
- **顧客へのリンクは必ず`trackingNo`（管理番号）を使用する**
- `linkedCustomer.id`は**絶対に**URLに使用しない
- 紐づけ時に`linkedCustomerTrackingNo`を必ず保存する

### 問題2: 従業員名の空白不一致

**症状**:
- TreeBurialDealEditで既存の受付担当者名がドロップダウンで選択できない
- 既存データは「山田太郎」、マスターは「山田 太郎」

**原因**:
- 既存データには姓と名の間に空白がないが、従業員マスターは空白ありで登録されている

**解決**:
```typescript
const normalizeName = (name: string) => name.replace(/[\s　]+/g, '');
const matchingEmployee = employees.find(emp => normalizeName(emp.name) === normalizeName(currentValue));
```

**再発防止策**:
- 名前の比較時は必ず空白を正規化してから比較する
- 半角・全角スペースの両方を考慮（`/[\s　]+/g`）

---

## 確認コマンド

```bash
# 開発サーバー起動
cd V12 && npm run dev

# ビルド確認
cd V12 && npm run build
```

---

## 主要な画面URL

| 画面 | URL |
|-----|-----|
| 顧客一覧 | /customers |
| 商談一覧 | /deals |
| 樹木墓商談一覧 | /tree-burial-deals |
| 樹木墓オプション一覧 | /burial-persons |
| 寺院別樹木墓 | /tree-burial-summary |
| 売上管理表 | /sales-report |

---

## 備考

- 「樹木葬」は正式名称「樹木墓」に変更済み
- 顧客リンクは全て管理番号（trackingNo）ベースに統一
- 金額表示は全て3桁区切りで統一
