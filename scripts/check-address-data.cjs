/**
 * 住所データの確認スクリプト
 * 「青葉台」を含む顧客データを検索して住所構造を確認
 */

const fs = require('fs');
const path = require('path');

const CUSTOMERS_JSON_PATH = 'C:\\Users\\satos\\OneDrive\\○大西\\〇新CRMプロジェクト\\Githubとの連携リポジトリ宛先\\V9\\migration\\output\\gas-scripts\\firestore-customers.json';

console.log('📥 JSONファイルを読み込み中...');
const data = JSON.parse(fs.readFileSync(CUSTOMERS_JSON_PATH, 'utf-8'));
console.log(`   ${data.length} 件の顧客データ\n`);

// 青葉台を含む住所を検索
console.log('🔍 「青葉台」を含む顧客を検索中...\n');

const aobadaiCustomers = data.filter(c => {
  const addr = c.address;
  if (!addr) return false;
  if (typeof addr === 'string') return addr.includes('青葉台');
  if (addr.fullAddress) return String(addr.fullAddress).includes('青葉台');
  if (addr.town) {
    const town = typeof addr.town === 'object' ? (addr.town.original || addr.town.cleaned) : addr.town;
    return town && town.includes('青葉台');
  }
  return JSON.stringify(addr).includes('青葉台');
});

console.log(`見つかった件数: ${aobadaiCustomers.length}\n`);

// 最初の5件を詳しく表示
aobadaiCustomers.slice(0, 5).forEach((c, i) => {
  console.log(`--- 顧客 ${i + 1}: ${c.trackingNo || 'NO TRACKING'} ---`);
  console.log(`名前: ${c.name}`);
  console.log(`住所データ構造:`);
  console.log(JSON.stringify(c.address, null, 2));
  console.log('');
});

// 住所構造のサマリー
console.log('\n📊 住所フィールドの分析:');
const sample = aobadaiCustomers[0];
if (sample && sample.address) {
  const addr = sample.address;
  console.log('fullAddress 存在:', addr.fullAddress !== undefined);
  console.log('town 存在:', addr.town !== undefined);
  console.log('streetNumber 存在:', addr.streetNumber !== undefined);

  if (addr.fullAddress) {
    console.log(`\nfullAddress の値: "${addr.fullAddress}"`);
  }
  if (addr.town) {
    console.log(`town の値:`, JSON.stringify(addr.town));
  }
  if (addr.streetNumber) {
    console.log(`streetNumber の値:`, JSON.stringify(addr.streetNumber));
  }
}
