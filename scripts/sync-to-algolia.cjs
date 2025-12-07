/**
 * JSON → Algolia 同期スクリプト
 * V9のエクスポート済みJSONファイルを使用
 *
 * 使用方法:
 * node scripts/sync-to-algolia.cjs
 */

const fs = require('fs');
const path = require('path');
const algoliasearch = require('algoliasearch');

// Algolia設定
const ALGOLIA_APP_ID = '5PE7L5U694';
const ALGOLIA_ADMIN_KEY = '8bb33d4b27a2ff5be2c32d1ba2100194';
const ALGOLIA_INDEX_NAME = 'customers';

// データファイル
const CUSTOMERS_JSON_PATH = 'C:\\Users\\satos\\OneDrive\\○大西\\〇新CRMプロジェクト\\Githubとの連携リポジトリ宛先\\V9\\migration\\output\\gas-scripts\\firestore-customers.json';

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

// 住所を文字列に変換
function formatAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    // fullAddressがあればそれを使用（最も完全な住所）
    if (address.fullAddress && typeof address.fullAddress === 'string') {
      return address.fullAddress;
    }
    // そうでなければ各パーツを結合（streetNumber=番地も含める）
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

async function syncToAlgolia() {
  console.log('🚀 JSON → Algolia 同期を開始...');

  // JSONファイルを読み込み
  console.log('📥 JSONファイルから顧客データを読み込み中...');
  const rawData = fs.readFileSync(CUSTOMERS_JSON_PATH, 'utf-8');
  const customers = JSON.parse(rawData);
  console.log(`   ${customers.length} 件の顧客データを読み込み`);

  // Algolia初期化
  const algoliaClient = algoliasearch.default(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

  // Algolia用にデータを変換
  const records = customers.map((data, idx) => {

    // 検索用に正規化したフィールドを追加
    const record = {
      objectID: data.trackingNo || `customer_${idx}`,  // Algolia必須
      trackingNo: data.trackingNo || '',
      name: data.name || '',
      nameKana: data.nameKana || '',
      phone: normalizePhone(data.phone),
      phoneOriginal: typeof data.phone === 'object' ? data.phone.original : data.phone,
      email: data.email || '',
      address: formatAddress(data.address),
      addressPrefecture: getStringValue(data.address?.prefecture),
      addressCity: getStringValue(data.address?.city),
      memo: data.memo || '',
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
  console.log('⚙️ インデックス設定を構成中...');
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

  console.log('✅ 同期完了!');
  console.log(`   インデックス名: ${ALGOLIA_INDEX_NAME}`);
  console.log(`   レコード数: ${records.length}`);
  console.log('');
  console.log('📋 次のステップ:');
  console.log('   1. Algoliaダッシュボードでインデックスを確認');
  console.log('   2. V12フロントエンドにAlgolia検索を統合');
}

syncToAlgolia().catch(console.error);
