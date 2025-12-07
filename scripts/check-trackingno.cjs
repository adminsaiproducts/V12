const fs = require('fs');
const path = 'C:/Users/satos/OneDrive/○大西/〇新CRMプロジェクト/Githubとの連携リポジトリ宛先/V9/migration/output/gas-scripts/firestore-customers.json';
const rawData = fs.readFileSync(path, 'utf-8');
const customers = JSON.parse(rawData);

// trackingNoがない顧客を確認
const noTrackingNo = customers.filter(c => c.trackingNo === undefined || c.trackingNo === null || c.trackingNo === '');
console.log('trackingNoがない顧客数:', noTrackingNo.length);

// サンプル表示
console.log('\nサンプル（最初の5件）:');
noTrackingNo.slice(0, 5).forEach(c => {
  console.log({
    trackingNo: c.trackingNo,
    name: c.name,
    docId: c.docId,
    id: c.id
  });
});

// 新井恭子を探す
const arai = customers.find(c => c.name && c.name.includes('新井'));
if (arai) {
  console.log('\n新井のデータ:');
  console.log('trackingNo:', arai.trackingNo);
  console.log('docId:', arai.docId);
  console.log('id:', arai.id);
  console.log('name:', arai.name);
}

// customer_8510のようなIDで探す
const idx8510 = customers[8510];
if (idx8510) {
  console.log('\nインデックス8510のデータ:');
  console.log('trackingNo:', idx8510.trackingNo);
  console.log('name:', idx8510.name);
}
