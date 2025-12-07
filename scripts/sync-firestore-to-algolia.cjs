/**
 * Firestore → Algolia 同期スクリプト
 * Firestoreから直接顧客データを取得してAlgoliaに同期
 *
 * 使用方法:
 * node scripts/sync-firestore-to-algolia.cjs
 */

const admin = require('firebase-admin');
const algoliasearch = require('algoliasearch');

// Firebase Admin設定
const SERVICE_ACCOUNT_PATH = 'C:\\Users\\satos\\OneDrive\\○大西\\〇新CRMプロジェクト\\Githubとの連携リポジトリ宛先\\V9\\crm-appsheet-v7-4cce8f749b52.json';
const PROJECT_ID = 'crm-appsheet-v7';
const FIRESTORE_DATABASE_ID = 'crm-database-v9';

// Algolia設定
const ALGOLIA_APP_ID = '5PE7L5U694';
const ALGOLIA_ADMIN_KEY = '8bb33d4b27a2ff5be2c32d1ba2100194';
const ALGOLIA_INDEX_NAME = 'customers';

// Firestore コレクション
const CUSTOMERS_COLLECTION = 'Customers';

// ひらがな→カタカナ変換（検索用）
function hiraganaToKatakana(str) {
  if (!str) return '';
  return str.replace(/[\u3041-\u3096]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  );
}

// カタカナ→ひらがな変換（検索用）
function katakanaToHiragana(str) {
  if (!str) return '';
  return str.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

// 電話番号を正規化
function normalizePhone(phone) {
  if (!phone) return '';
  if (typeof phone === 'string') return phone.replace(/[-\s]/g, '');
  if (typeof phone === 'object') {
    return (phone.cleaned || phone.original || '').replace(/[-\s]/g, '');
  }
  return '';
}

// 値を文字列として取得（オブジェクトの場合はcleanedまたはoriginalを使用）
function getStringValue(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.cleaned || val.original || '';
  }
  return '';
}

// 住所を文字列に変換（Firestoreデータ構造対応）
function formatAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    // fullがあればそれを使用（V12更新後のデータ）
    if (address.full && typeof address.full === 'string') {
      return address.full;
    }
    // fullAddressがあればそれを使用（V9移行データ）
    if (address.fullAddress && typeof address.fullAddress === 'string') {
      return address.fullAddress;
    }
    // そうでなければ各パーツを結合
    return [
      getStringValue(address.prefecture),
      getStringValue(address.city),
      getStringValue(address.town),
      getStringValue(address.streetNumber),
      getStringValue(address.building)
    ].filter(Boolean).join('');
  }
  return '';
}

async function syncFirestoreToAlgolia() {
  console.log('🚀 Firestore → Algolia 同期を開始...\n');

  // Firebase Admin初期化
  console.log('🔥 Firebase Admin を初期化中...');
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    });
  }

  // crm-database-v9 データベースを指定
  const db = admin.firestore();
  db.settings({ databaseId: FIRESTORE_DATABASE_ID });
  console.log('   Firebase Admin 初期化完了\n');

  // Firestoreから全顧客データを取得
  console.log('📥 Firestoreから顧客データを取得中...');
  const customersRef = db.collection(CUSTOMERS_COLLECTION);
  const snapshot = await customersRef.get();
  console.log(`   ${snapshot.size} 件の顧客データを取得\n`);

  // Algolia初期化
  const algoliaClient = algoliasearch.default(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

  // デバッグ: 最初の3件のアドレスを表示
  console.log('📋 サンプルデータ確認:');
  let count = 0;
  snapshot.docs.slice(0, 3).forEach(doc => {
    const data = doc.data();
    console.log(`   ${data.trackingNo || doc.id}: ${data.name}`);
    console.log(`   住所オブジェクト:`, JSON.stringify(data.address, null, 2).substring(0, 200));
    console.log(`   変換後: ${formatAddress(data.address)}`);
    console.log('');
  });

  // Algolia用にデータを変換
  const records = snapshot.docs.map((doc) => {
    const data = doc.data();
    const firestoreId = doc.id;

    // 検索用に正規化したフィールドを追加
    const record = {
      objectID: data.trackingNo || firestoreId,  // Algolia必須
      firestoreId: firestoreId,                   // Firestore IDも保存
      trackingNo: data.trackingNo || '',
      name: data.name || '',
      nameKana: data.nameKana || '',
      phone: normalizePhone(data.phone),
      phoneOriginal: typeof data.phone === 'object' ? data.phone.original : data.phone,
      email: typeof data.email === 'object' ? getStringValue(data.email) : (data.email || ''),
      address: formatAddress(data.address),
      addressPrefecture: getStringValue(data.address?.prefecture),
      addressCity: getStringValue(data.address?.city),
      memo: typeof data.memo === 'object' ? getStringValue(data.memo) : (data.memo || ''),
      status: data.status || '',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',

      // 検索用の正規化フィールド（ひらがな・カタカナ両方で検索可能に）
      _searchName: katakanaToHiragana(data.name || ''),
      _searchNameKana: katakanaToHiragana(data.nameKana || ''),
    };

    return record;
  });

  // Algoliaにアップロード
  console.log('📤 Algoliaにデータをアップロード中...');

  // バッチサイズ（1000件ずつ）
  const batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await index.saveObjects(batch);
    console.log(`   ${Math.min(i + batchSize, records.length)} / ${records.length} 件完了`);
  }

  // インデックス設定
  console.log('\n⚙️ インデックス設定を構成中...');
  await index.setSettings({
    // 検索対象フィールド（優先順）
    searchableAttributes: [
      'name',
      'nameKana',
      '_searchName',
      '_searchNameKana',
      'trackingNo',
      'phone',
      'phoneOriginal',
      'address',
      'email',
      'memo'
    ],
    // 表示用の属性
    attributesToRetrieve: [
      'objectID',
      'firestoreId',
      'trackingNo',
      'name',
      'nameKana',
      'phone',
      'phoneOriginal',
      'email',
      'address',
      'addressPrefecture',
      'addressCity',
      'status'
    ],
    // ハイライト設定
    attributesToHighlight: [
      'name',
      'nameKana',
      'address'
    ],
    // ファセット（フィルタリング用）
    attributesForFaceting: [
      'addressPrefecture',
      'status'
    ],
    // 日本語対応
    queryLanguages: ['ja'],
    indexLanguages: ['ja'],
    // タイポ許容
    typoTolerance: true,
    minWordSizefor1Typo: 2,
    minWordSizefor2Typos: 4
  });

  console.log('\n✅ 同期完了!');
  console.log(`   インデックス名: ${ALGOLIA_INDEX_NAME}`);
  console.log(`   レコード数: ${records.length}`);
  console.log('');
  console.log('🔄 ブラウザをリロードして顧客一覧を確認してください');
}

syncFirestoreToAlgolia().catch(console.error);
