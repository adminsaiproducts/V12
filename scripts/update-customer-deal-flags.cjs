/**
 * 顧客の商談有無フラグ更新スクリプト
 *
 * 各顧客に対して、以下の商談有無フラグを計算して更新する:
 * - hasDeals: 一般商談（Dealsコレクション）有無
 * - hasTreeBurialDeals: 樹木墓商談（TreeBurialDealsコレクション）有無
 * - hasBurialPersons: 樹木墓オプション（BurialPersonsコレクション）有無
 *
 * 使用方法:
 *   node scripts/update-customer-deal-flags.cjs [オプション]
 *
 * オプション:
 *   --dry-run     ドライランモード（Firestoreへの書き込みなし）
 */

const admin = require('firebase-admin');

// Firebase Admin初期化
const SERVICE_ACCOUNT_PATH = 'C:\\Users\\satos\\OneDrive\\○大西\\〇新CRMプロジェクト\\Githubとの連携リポジトリ宛先\\V9\\crm-appsheet-v7-4cce8f749b52.json';

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     顧客の商談有無フラグ更新スクリプト                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (options.dryRun) {
    console.log('\n🔍 ドライランモード: Firestoreへの書き込みは行いません');
  }

  // Firebase初期化
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'crm-appsheet-v7'
    });
  }
  const db = admin.firestore();
  db.settings({
    databaseId: 'crm-database-v9',
    ignoreUndefinedProperties: true
  });
  console.log('\n✅ Firebase 初期化完了 (Database: crm-database-v9)');

  try {
    // Step 1: 各コレクションから紐付け情報を収集
    console.log('\n━━━ Step 1: 商談データを収集 ━━━');

    // 一般商談（Deals）から顧客紐付けを収集
    console.log('\n   Dealsコレクションを取得中...');
    const dealsSnapshot = await db.collection('Deals').get();
    const customerWithDeals = new Set();
    dealsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.customerTrackingNo) {
        customerWithDeals.add(data.customerTrackingNo);
      }
    });
    console.log(`   → Deals: ${dealsSnapshot.size}件, 紐付け顧客: ${customerWithDeals.size}件`);

    // 樹木墓商談（TreeBurialDeals）から顧客紐付けを収集
    console.log('\n   TreeBurialDealsコレクションを取得中...');
    const treeBurialDealsSnapshot = await db.collection('TreeBurialDeals').get();
    const customerWithTreeBurialDeals = new Set();
    treeBurialDealsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.linkedCustomerTrackingNo) {
        customerWithTreeBurialDeals.add(data.linkedCustomerTrackingNo);
      }
    });
    console.log(`   → TreeBurialDeals: ${treeBurialDealsSnapshot.size}件, 紐付け顧客: ${customerWithTreeBurialDeals.size}件`);

    // 樹木墓オプション（BurialPersons）から顧客紐付けを収集
    console.log('\n   BurialPersonsコレクションを取得中...');
    const burialPersonsSnapshot = await db.collection('BurialPersons').get();
    const customerWithBurialPersons = new Set();
    burialPersonsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // linkedCustomerTrackingNo または linkedCustomerId から取得
      if (data.linkedCustomerTrackingNo) {
        customerWithBurialPersons.add(data.linkedCustomerTrackingNo);
      } else if (data.linkedCustomerId) {
        // customer_XXXXX 形式からtrackingNoを抽出
        const trackingNo = data.linkedCustomerId.replace('customer_', '');
        customerWithBurialPersons.add(trackingNo);
      }
    });
    console.log(`   → BurialPersons: ${burialPersonsSnapshot.size}件, 紐付け顧客: ${customerWithBurialPersons.size}件`);

    // Step 2: 顧客データを取得
    console.log('\n━━━ Step 2: 顧客データを取得 ━━━');
    const customersSnapshot = await db.collection('Customers').get();
    console.log(`   顧客数: ${customersSnapshot.size}件`);

    // Step 3: フラグを計算して更新
    console.log('\n━━━ Step 3: フラグを計算して更新 ━━━');

    const stats = {
      hasDeals: 0,
      hasTreeBurialDeals: 0,
      hasBurialPersons: 0,
      updated: 0
    };

    const toUpdate = [];

    for (const doc of customersSnapshot.docs) {
      const data = doc.data();
      const trackingNo = data.trackingNo;

      if (!trackingNo) continue;

      const hasDeals = customerWithDeals.has(trackingNo);
      const hasTreeBurialDeals = customerWithTreeBurialDeals.has(trackingNo);
      const hasBurialPersons = customerWithBurialPersons.has(trackingNo);

      // フラグが変更されたか確認
      const changed =
        data.hasDeals !== hasDeals ||
        data.hasTreeBurialDeals !== hasTreeBurialDeals ||
        data.hasBurialPersons !== hasBurialPersons;

      if (changed) {
        toUpdate.push({
          id: doc.id,
          trackingNo: trackingNo,
          hasDeals,
          hasTreeBurialDeals,
          hasBurialPersons
        });

        if (hasDeals) stats.hasDeals++;
        if (hasTreeBurialDeals) stats.hasTreeBurialDeals++;
        if (hasBurialPersons) stats.hasBurialPersons++;
      }
    }

    console.log(`\n   更新対象: ${toUpdate.length}件`);
    console.log(`   - 一般商談あり: ${stats.hasDeals}件`);
    console.log(`   - 樹木墓商談あり: ${stats.hasTreeBurialDeals}件`);
    console.log(`   - 樹木墓オプションあり: ${stats.hasBurialPersons}件`);

    // Step 4: Firestoreへ書き込み
    if (!options.dryRun && toUpdate.length > 0) {
      console.log('\n━━━ Step 4: Firestoreへ書き込み ━━━');

      const BATCH_SIZE = 500;
      let updatedCount = 0;

      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = toUpdate.slice(i, i + BATCH_SIZE);

        for (const item of chunk) {
          const ref = db.collection('Customers').doc(item.id);
          batch.update(ref, {
            hasDeals: item.hasDeals,
            hasTreeBurialDeals: item.hasTreeBurialDeals,
            hasBurialPersons: item.hasBurialPersons,
            updatedAt: new Date().toISOString()
          });
        }

        await batch.commit();
        updatedCount += chunk.length;
        console.log(`   進捗: ${updatedCount}/${toUpdate.length}件 更新完了`);
      }

      console.log('\n✅ 商談有無フラグの更新が完了しました');
    } else if (options.dryRun) {
      console.log('\n━━━ Step 4: ドライラン（書き込みスキップ）━━━');
    }

    // 完了レポート
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     処理完了                                               ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ 一般商談あり:       ${stats.hasDeals.toString().padStart(6)}件                              ║`);
    console.log(`║ 樹木墓商談あり:     ${stats.hasTreeBurialDeals.toString().padStart(6)}件                              ║`);
    console.log(`║ 樹木墓OP あり:      ${stats.hasBurialPersons.toString().padStart(6)}件                              ║`);
    console.log(`║ 更新対象:           ${toUpdate.length.toString().padStart(6)}件                              ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\nスクリプト正常終了');
    process.exit(0);
  })
  .catch((err) => {
    console.error('エラー発生:', err);
    process.exit(1);
  });
