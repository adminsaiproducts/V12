/**
 * 顧客9999（西脇）のデータ確認
 */

const fs = require('fs');

const CUSTOMERS_JSON_PATH = 'C:\\Users\\satos\\OneDrive\\○大西\\〇新CRMプロジェクト\\Githubとの連携リポジトリ宛先\\V9\\migration\\output\\gas-scripts\\firestore-customers.json';

console.log('📥 JSONファイルを読み込み中...');
const data = JSON.parse(fs.readFileSync(CUSTOMERS_JSON_PATH, 'utf-8'));

// 顧客9999または西脇を検索
const customer9999 = data.find(c => c.trackingNo === '9999');
const nishiwaki = data.filter(c => c.name && c.name.includes('西脇'));

console.log('\n🔍 trackingNo=9999 の顧客:');
if (customer9999) {
  console.log(JSON.stringify(customer9999, null, 2));
} else {
  console.log('見つかりませんでした');
}

console.log('\n🔍 「西脇」を含む顧客:');
nishiwaki.forEach(c => {
  console.log(`\n--- ${c.trackingNo}: ${c.name} ---`);
  console.log('住所:', JSON.stringify(c.address, null, 2));
});

// 番地が含まれている住所があるか確認
console.log('\n\n📊 番地パターン（数字-数字）を含む住所を検索:');
const withStreetNumber = data.filter(c => {
  if (!c.address) return false;
  const fullAddr = c.address.fullAddress || '';
  // 数字-数字-数字 または 数字-数字 パターン
  return /\d+-\d+/.test(fullAddr) || /\d+丁目\d+/.test(fullAddr);
}).slice(0, 5);

withStreetNumber.forEach(c => {
  console.log(`${c.trackingNo}: ${c.name}`);
  console.log(`  fullAddress: ${c.address.fullAddress}`);
});
