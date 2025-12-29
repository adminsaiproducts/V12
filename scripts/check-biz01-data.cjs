/**
 * biz-01 Firestoreのデータ状況確認
 */
const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'config', 'serviceAccount-dest.json');

async function main() {
  console.log('\n=== biz-01 Firestore データ確認 ===\n');

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'biz-01'
    });
  }

  const db = admin.firestore();

  const collections = [
    'Customers',
    'TreeBurialDeals',
    'BurialPersons',
    'Activities',
    'Relationships',
    'ConstructionProjects',
    'DealProducts',
    'Masters',
    'RelationshipTypes'
  ];

  console.log('コレクション'.padEnd(25) + '件数'.padStart(10));
  console.log('-'.repeat(35));

  let total = 0;
  for (const name of collections) {
    try {
      const count = await db.collection(name).count().get();
      const c = count.data().count;
      console.log(name.padEnd(25) + String(c).padStart(10));
      total += c;
    } catch (e) {
      console.log(name.padEnd(25) + 'ERROR'.padStart(10));
    }
  }

  console.log('-'.repeat(35));
  console.log('合計'.padEnd(25) + String(total).padStart(10));

  console.log('\n\nサンプル顧客 (3件):');
  const sample = await db.collection('Customers').limit(3).get();
  sample.docs.forEach((doc, i) => {
    const d = doc.data();
    console.log(`  ${i+1}. ${d.trackingNo}: ${d.name}`);
  });

  process.exit(0);
}

main().catch(console.error);
