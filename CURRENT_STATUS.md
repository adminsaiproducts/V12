# CRM V12 現在の状況

**最終更新**: 2025-12-30 JST (全データ移行完了)

## 現在のステータス: Firebase biz-01プロジェクトへの全データ移行完了

### 直近で実施した作業 (2025-12-30)

1. **残りデータの移行完了**
   - Relationships: 1,122件移行完了
   - DealProducts: 11,541件移行完了
   - Activities: 12,317件追加移行（合計32,117件）

### 直近で実施した作業 (2025-12-29 午後)

1. **Firebase biz-01プロジェクトへの移行**
   - 新プロジェクトID: `biz-01`（会社名変更に耐える中立なURL）
   - 新URL: https://biz-01.web.app
   - データベース: デフォルトDB使用（名前付きDBから変更）
   - 認証: Google OAuth（@saiproducts.co.jpドメイン制限）

2. **データ移行状況（全て完了）**
   - ✅ Customers: 11,063件
   - ✅ TreeBurialDeals: 3,073件
   - ✅ BurialPersons: 5,452件
   - ✅ GeneralSalesDeals: 106件
   - ✅ ConstructionProjects: 43件
   - ✅ Masters: 14件
   - ✅ RelationshipTypes: 49件
   - ✅ Relationships: 1,122件
   - ✅ DealProducts: 11,541件
   - ✅ Activities: 32,117件

3. **Firestoreセキュリティルール修正**
   - 不足していた全コレクションのルールを追加
   - 「Missing or insufficient permissions」エラーを解決

4. **作成・更新したファイル**
   - `scripts/migrate-firestore-data.cjs` - プロジェクト間データ移行スクリプト
   - `scripts/check-biz01-data.cjs` - biz-01データ確認スクリプト
   - `config/serviceAccount-dest.json` - biz-01用サービスアカウント
   - `config/serviceAccount-v9.json` - 移行元データ読み取り用
   - `firestore.rules` - 全コレクションのルール追加
   - `.env.local` - biz-01 Firebase設定
   - `src/firebase/config.ts` - デフォルトDB使用に変更

---

### 直近で実施した作業 (2025-12-29 午前)

1. **検索リスト機能の実装**
   - 顧客一覧に検索条件リスト機能を追加
   - 複数条件でのフィルタリング（AND/OR ロジック）
   - 条件の保存・編集・削除（Firestoreに保存）
   - CSVダウンロード機能

2. **新規作成ファイル**
   - `src/types/searchList.ts` - フィルター条件の型定義
   - `src/api/searchLists.ts` - 検索リストCRUD API
   - `src/lib/filterEngine.ts` - フィルタリングロジック
   - `src/components/SearchListBuilder.tsx` - 条件ビルダーUI
   - `src/lib/csvExport.ts` - CSVエクスポート機能

3. **Firebase Hostingキャッシュ設定の修正**
   - `firebase.json`に`index.html`のno-cache設定を追加
   - デプロイ後のブラウザキャッシュ問題を解決

4. **フィルターエンジンの住所解析**
   - Algoliaデータの`address`フィールドから都道府県・市区町村を正規表現で抽出
   - `addressPrefecture`/`addressCity`が未設定の場合のフォールバック処理

---

### 直近で実施した作業 (2025-12-20)

1. **顧客区分をAlgoliaに同期**
   - `customerCategory` (individual/corporation/professional) をAlgoliaに追加
   - Firestoreで10,998件分類済み

2. **顧客一覧ページの改善**
   - 「拠点」列を追加
   - 商談有無を色分けアイコンで表示:
     - 📄 青: 一般商談あり (`hasDeals`)
     - 🌲 緑: 樹木墓商談あり (`hasTreeBurialDeals`)
     - 👤 オレンジ: 樹木墓オプションあり (`hasBurialPersons`)

3. **商談フラグ計算スクリプト作成**
   - `scripts/update-customer-deal-flags.cjs` を新規作成
   - 3つのコレクション（Deals, TreeBurialDeals, BurialPersons）から顧客紐づけを集計
   - 10,998件の顧客フラグを更新

4. **Algolia同期スクリプト更新**
   - `branch`, `hasDeals`, `hasTreeBurialDeals`, `hasBurialPersons` を追加
   - ファセット（フィルタリング用）属性に追加

5. **型定義の更新**
   - `src/types/firestore.ts`: Customer型に商談フラグ追加
   - `src/lib/algolia.ts`: AlgoliaCustomerHit型と検索オプション更新

---

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

### 緊急タスク（Firebase移行関連）

1. **残りデータの移行（クォータリセット後）**
   - Relationships: 1,122件
   - DealProducts: 11,541件
   - Activities: 残り約12,000件
   - 実行コマンド: `node scripts/migrate-firestore-data.cjs --collection <コレクション名> --skip-existing`

### 未完了タスク（前回セッションからの引き継ぎ）

1. **新規顧客登録時の追客NO自動採番**
   - 現状: 新規顧客登録時に追客NOを手動入力
   - 要望: 追客NOは自動採番にして入力欄を非表示にする
   - 対象ファイル: `src/components/CustomerForm.tsx`

2. **続柄フィールドの複数選択対応**
   - 現状: BurialPersonEditで続柄が単一選択
   - 要望: 複数の続柄を選択可能にする
   - 対象ファイル: `src/pages/BurialPersonEdit.tsx`

3. **検索リスト機能のデバッグログ削除**
   - 現状: Customers.tsx, filterEngine.tsにconsole.logが残っている
   - 対応: 本番環境では不要なログ出力を削除

### 動作確認

1. **寺院別樹木墓ページの確認**
   - `/tree-burial-summary` にアクセス
   - 月別アコーディオンを展開し、寺院行をクリック
   - ダイアログで商談をクリックして詳細画面に遷移することを確認

2. **顧客リンクの確認**
   - 樹木墓商談詳細で「顧客詳細へ」をクリック
   - 樹木墓オプション詳細で紐づけ顧客をクリック
   - 正しい顧客詳細画面に遷移することを確認

3. **検索リスト機能の確認**
   - 顧客一覧で検索リストを選択してフィルタリング
   - 条件を変更して新規リスト保存
   - CSVダウンロード

---

## 現在のシステム状態

### バックエンド (Firebase biz-01 / Algolia)

| サービス | 状態 | データ件数 |
|---------|------|-----------|
| Firestore (biz-01/default) | 正常 | Customers: 11,063件 |
| Firestore (biz-01/default) | 正常 | TreeBurialDeals: 3,073件 |
| Firestore (biz-01/default) | 正常 | BurialPersons: 5,452件 |
| Firestore (biz-01/default) | 正常 | GeneralSalesDeals: 106件 |
| Firestore (biz-01/default) | ⏳待機 | Relationships: 未移行（1,122件予定）|
| Firestore (biz-01/default) | ⏳待機 | DealProducts: 未移行（11,541件予定）|
| Algolia (customers index) | 正常 | 約11,000件（旧プロジェクトのデータ） |

> **注意**: Algoliaは旧プロジェクトのデータを参照中。Firestoreのドキュメントは同じIDで移行済みのため、検索→詳細遷移は正常動作。

### フロントエンド (V12)

| 項目 | 状態 |
|-----|------|
| 開発サーバー | 稼働中 |
| ビルド | 正常 |

---

## ファイル変更履歴 (2025-12-29)

| ファイル | 変更内容 |
|---------|---------|
| `src/types/searchList.ts` | **新規作成** - フィルター条件の型定義 |
| `src/api/searchLists.ts` | **新規作成** - 検索リストCRUD API |
| `src/lib/filterEngine.ts` | **新規作成** - 顧客フィルタリングロジック |
| `src/lib/csvExport.ts` | **新規作成** - CSVエクスポート機能 |
| `src/components/SearchListBuilder.tsx` | **新規作成** - 検索条件ビルダーUI |
| `src/pages/Customers.tsx` | 検索リスト選択、フィルター適用、CSVダウンロード追加 |
| `firebase.json` | index.htmlのno-cache設定追加 |

---

## ファイル変更履歴 (2025-12-20)

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/Customers.tsx` | 拠点列追加、商談アイコン表示追加 |
| `src/types/firestore.ts` | Customer型に商談フラグ追加（hasDeals, hasTreeBurialDeals, hasBurialPersons）|
| `src/lib/algolia.ts` | AlgoliaCustomerHit型更新、検索オプションに新フィールド追加 |
| `scripts/update-customer-deal-flags.cjs` | **新規作成** - 商談有無フラグ計算スクリプト |
| `scripts/sync-firestore-to-algolia.cjs` | branch, 商談フラグをAlgoliaに同期 |

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

## 発生した問題と解決策 (2025-12-29 午後: Firebase移行)

### 問題1: Missing or insufficient permissions エラー

**症状**:
- biz-01にデプロイ後、全ページでデータ取得に失敗
- F12コンソールに「FirebaseError: Missing or insufficient permissions」

**原因**:
- `firestore.rules`に一部のコレクションしか定義されていなかった
- 不足していたコレクション: TreeBurialDeals, BurialPersons, Masters, GeneralSalesDeals, ConstructionProjects, DealProducts, SearchLists, CustomerSearchLists, PlotTypes, RelationshipTypes, StoneTypes, Branches, Employees, TrackingNoCounter, YanakaLeads

**解決**:
- 全コレクションのルールを`firestore.rules`に追加
- `firebase deploy --only firestore:rules --project biz-01`でデプロイ

**再発防止策**:
- 新しいコレクションを追加する際は必ず`firestore.rules`も更新
- デプロイ後は必ずF12コンソールで権限エラーがないか確認

### 問題2: auth/unauthorized-domain エラー

**症状**:
- biz-01にデプロイ後、ログイン時にエラー
- 「Firebase: Error (auth/unauthorized-domain)」

**原因**:
- 古いビルド（crm-appsheet-v7の設定）がキャッシュされていた
- `dist`フォルダに古いJSファイルが残存

**解決**:
```bash
Remove-Item -Recurse -Force dist
npx vite build --mode production
firebase deploy --only hosting --project biz-01
```

**再発防止策**:
- Firebase設定変更後は必ず`dist`フォルダを削除してクリーンビルド
- シークレットウィンドウでも同じエラーが出る場合はビルドを疑う

### 問題3: サービスアカウントキー作成がブロックされる

**症状**:
- Firebase Consoleでサービスアカウントキーを作成しようとするとエラー
- 「組織のポリシーによりブロックされています」

**原因**:
- 組織ポリシー`iam.disableServiceAccountKeyCreation`が有効

**解決**:
1. Google Cloud Console → IAMと管理 → 組織のポリシー
2. プロジェクト`biz-01`を選択
3. `iam.disableServiceAccountKeyCreation`を検索
4. 「カスタマイズしたポリシーを管理」→ ルールを追加 → 「許可」に設定
5. 保存後、Firebase Consoleでキーを作成

**再発防止策**:
- 組織管理下のFirebaseプロジェクトではこの問題が発生する可能性がある
- プロジェクトレベルでのポリシーオーバーライドが必要

### 問題4: Firestoreクォータ超過

**症状**:
- データ移行中に「RESOURCE_EXHAUSTED: Quota exceeded」エラー
- 一部のコレクションが移行できない

**原因**:
- Firestoreの1日あたりの書き込みクォータを超過

**解決**:
- 時間をおいて再試行（太平洋時間深夜にリセット）
- `--collection <名前>`オプションで個別コレクションを移行
- `--skip-existing`オプションで既存ドキュメントをスキップ

**再発防止策**:
- 大量データ移行は複数日に分けて実行
- バッチサイズを小さくする（500件→300件）

---

## 発生した問題と解決策 (2025-12-29 午前)

### 問題1: Firebaseインポートパスエラー

**症状**:
- `Cannot find module '../firebase'` エラーでビルド失敗

**原因**:
- `src/api/searchLists.ts`で`import { db } from '../firebase'`と記述
- 正しいパスは`../firebase/config`

**解決**:
```typescript
// ❌ 間違い
import { db } from '../firebase';

// ✅ 正しい
import { db } from '../firebase/config';
```

**再発防止策**:
- 新規APIファイル作成時は既存の`src/api/*.ts`からインポート文をコピーする
- Firebase関連は常に`../firebase/config`からインポート

### 問題2: フィルターで0件になる（住所データ構造の誤解）

**症状**:
- 都道府県フィルターを適用すると0件になる
- コンソールで`addressPrefecture: undefined`と表示

**原因**:
- Algoliaデータには`addressPrefecture`/`addressCity`フィールドが存在しない場合がある
- 住所は`address`フィールドに連結文字列として格納されている
  - 例: `"東京都 新宿区 市谷本村町 7-4-3305"`

**解決**:
```typescript
// filterEngine.ts で住所文字列から都道府県を抽出
case 'prefecture':
  if (customer.addressPrefecture) {
    value = customer.addressPrefecture;
  } else if (typeof customer.address === 'string') {
    const prefectureMatch = customer.address.match(
      /^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/
    );
    value = prefectureMatch ? prefectureMatch[1] : '';
  }
  break;
```

**再発防止策**:
- Algoliaのデータ構造は必ずコンソールでサンプルデータを確認する
- フィールドが`undefined`の場合のフォールバック処理を常に実装する

### 問題3: Firebase Hostingデプロイ後に更新が反映されない

**症状**:
- デプロイ完了後もブラウザに古いJSが読み込まれる
- シークレットウィンドウでも変化なし
- コンソール出力が古いコードのまま

**原因**:
- `firebase.json`でJS/CSSファイルが1年間キャッシュされる設定
- `index.html`にキャッシュ制御ヘッダーがなく、古いJSファイルへの参照が残る

**解決**:
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
    },
    {
      "source": "**/*.@(js|css)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**再発防止策**:
- デプロイ後に問題が発生した場合は、まず`dist`フォルダを削除してクリーンビルド
- ブラウザのDevTools → Network → "Disable cache"にチェックしてテスト
- `firebase.json`のキャッシュ設定を確認（`index.html`はno-cache必須）

### 問題4: BurialPersons APIでFirestore undefined値エラー

**症状**:
- BurialPersonsの更新時にFirestoreエラーが発生
- `Error: Value for argument "value" is not a valid Firestore document. Cannot use "undefined" as a Firestore value`

**原因**:
- APIの更新処理でundefinedの値をそのままFirestoreに書き込もうとした
- Firestoreはundefinedを許容しない

**解決**:
```typescript
// undefined値を除外してから保存
const cleanData = Object.fromEntries(
  Object.entries(data).filter(([_, v]) => v !== undefined)
);
await updateDoc(docRef, cleanData);
```

**再発防止策**:
- Firestoreに保存する前に必ずundefined値をフィルタリングする
- `firebase/config.ts`の`ignoreUndefinedProperties: true`設定を確認
- 新規API作成時は既存APIのデータクレンジング処理を参考にする

### 問題5: localtunnelで外部アクセスができない

**症状**:
- `npx localtunnel --port 3000`でトンネルURLを取得
- 外部からアクセスするとHTTP 400エラーまたは空白ページ
- 「you are being rate-limited」メッセージ

**原因**:
- localtunnelの無料サービスは不安定
- レート制限やサービス側の問題

**解決**:
- Firebase Hostingにデプロイして外部アクセス可能にした
- URL: https://crm-appsheet-v7.web.app

**再発防止策**:
- 外部アクセスが必要な場合はFirebase Hostingを使用
- localtunnelは一時的なテスト用途のみに限定
- 安定した外部公開にはFirebase Hosting、Vercel、Netlify等を使用

---

## 発生した問題と解決策 (2025-12-20)

### 問題1: BurialPersonsの顧客紐づけフィールド名の違い

**症状**:
- 商談フラグ計算スクリプトで、BurialPersonsから顧客紐づけを取得しようとしたところ0件

**原因**:
- Deals/TreeBurialDeals: `linkedCustomerTrackingNo` フィールドを使用
- BurialPersons: `linkedCustomerId` フィールドを使用（形式: `customer_XXXXX`）

**解決**:
```javascript
// BurialPersonsの場合
if (data.linkedCustomerTrackingNo) {
  customerWithBurialPersons.add(data.linkedCustomerTrackingNo);
} else if (data.linkedCustomerId) {
  // customer_XXXXX 形式からtrackingNoを抽出
  const trackingNo = data.linkedCustomerId.replace('customer_', '');
  customerWithBurialPersons.add(trackingNo);
}
```

**再発防止策**:
- コレクションごとに顧客紐づけフィールド名が異なる可能性を意識する
- `linkedCustomerId`は`customer_`プレフィックス付きの形式であることに注意
- 新規スクリプト作成時はサンプルデータを確認してからロジックを組む

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

- **現行URL**: https://biz-01.web.app （2025-12-29移行）
- **旧URL**: https://crm-appsheet-v7.web.app （非推奨）
- 「樹木葬」は正式名称「樹木墓」に変更済み
- 顧客リンクは全て管理番号（trackingNo）ベースに統一
- 金額表示は全て3桁区切りで統一
- 関係性データ: 約2,005件が`targetCustomerId=null`（APIでスキップ処理済み）
- 一般商談（Deals）: 0件（未インポート）
- trackingNo採番: Countersコレクションでトランザクション管理

---

## 設計決定の記録

### 検索リスト機能 (2025-12-29)

**要件の経緯**:
- ユーザーから既存システムのスクリーンショットを提示され、同様の機能を要望
- 目的: 一定の条件で検索した結果を定期的にCSVダウンロードする用途

**選択肢と決定**:
1. シンプル版（基本的な条件保存のみ）
2. 中間版（条件保存 + 簡易フィルター）
3. **フル機能版（選択）** - 詳細な条件設定、AND/OR ロジック、CSV出力

**実装アーキテクチャ**:
- 型定義: `src/types/searchList.ts`
- API: `src/api/searchLists.ts` (Firestore CRUD)
- フィルターロジック: `src/lib/filterEngine.ts`
- UI: `src/components/SearchListBuilder.tsx`
- CSV出力: `src/lib/csvExport.ts`

**フィルター条件のロジック**:
- グループ内の条件はOR結合
- グループ間はAND結合
- これにより「（都道府県=東京都 OR 都道府県=神奈川県）AND 樹木墓商談あり」のような複雑な条件が可能
