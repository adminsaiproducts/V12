// V9のCustomerデータ構造を確認するスクリプト
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// サービスアカウントキーのパスを設定
const serviceAccountPath = path.join(__dirname, '..', '..', 'V9', 'config', 'serviceAccount.json');

try {
  const serviceAccount = require(serviceAccountPath);

  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'crm-appsheet-v7'
  });

  const db = getFirestore('crm-database-v9');

  async function checkCustomerStructure() {
    console.log('=== V9 Customers コレクションのデータ構造確認 ===\n');

    const customersRef = db.collection('Customers');
    const snapshot = await customersRef.limit(3).get();

    if (snapshot.empty) {
      console.log('Customersコレクションにデータがありません');
      return;
    }

    snapshot.forEach((doc, index) => {
      console.log(`\n--- Customer ${index + 1} (ID: ${doc.id}) ---`);
      const data = doc.data();

      // 全フィールドを詳細に表示
      Object.keys(data).forEach(key => {
        const value = data[key];
        console.log(`\n[${key}]`);
        console.log(`  Type: ${typeof value}`);
        if (typeof value === 'object' && value !== null) {
          console.log(`  Value: ${JSON.stringify(value, null, 4)}`);
        } else {
          console.log(`  Value: ${value}`);
        }
      });
    });
  }

  checkCustomerStructure()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });

} catch (err) {
  console.error('初期化エラー:', err.message);
  process.exit(1);
}
