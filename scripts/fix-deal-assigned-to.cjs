/**
 * 商談の担当者名を従業員マスターの正式名に更新するスクリプト
 */

const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = 'C:\\Users\\satos\\OneDrive\\○大西\\〇新CRMプロジェクト\\Githubとの連携リポジトリ宛先\\V9\\crm-appsheet-v7-4cce8f749b52.json';
const PROJECT_ID = 'crm-appsheet-v7';
const FIRESTORE_DATABASE_ID = 'crm-database-v9';

// 従業員マスターデータを読み込み
const employeesData = require('../src/data/employees.json');

// Firebase Admin初期化
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();
db.settings({ databaseId: FIRESTORE_DATABASE_ID });

// 従業員名のマッピングを作成（スペースなし→スペースあり）
function buildNameMapping() {
  const mapping = new Map();

  for (const emp of employeesData) {
    const fullName = emp.name; // 例: "冨田 恵"
    const lastName = emp.lastName; // 例: "冨田"
    const firstName = emp.firstName; // 例: "恵"

    // 正式名（スペースあり）
    mapping.set(fullName, fullName);

    // スペースなしの名前もマッピング
    if (lastName && firstName) {
      const noSpace = lastName + firstName; // 例: "冨田恵"
      mapping.set(noSpace, fullName);
    }

    // 姓のみの場合もマッピング（曖昧だが一致するなら）
    if (lastName && !mapping.has(lastName)) {
      // 姓のみの場合は、同じ姓の人が複数いる可能性があるので慎重に
    }
  }

  return mapping;
}

async function fixDealAssignedTo() {
  console.log('商談の担当者名を修正します...');

  const nameMapping = buildNameMapping();
  console.log('従業員名マッピング数:', nameMapping.size);

  // 全商談を取得
  const dealsSnapshot = await db.collection('Deals').get();
  console.log(`取得した商談数: ${dealsSnapshot.size}`);

  let updatedCount = 0;
  let skippedCount = 0;
  let notMatchedCount = 0;
  const notMatchedNames = new Set();

  let batch = db.batch();
  let batchCount = 0;

  for (const doc of dealsSnapshot.docs) {
    const deal = doc.data();
    const currentAssigned = deal.assignedTo;

    if (!currentAssigned || currentAssigned.trim() === '') {
      skippedCount++;
      continue;
    }

    // マッピングから正式名を取得
    const normalizedName = nameMapping.get(currentAssigned);

    if (normalizedName && normalizedName !== currentAssigned) {
      // 名前が異なる場合は更新
      console.log(`[UPDATE] ${doc.id}: "${currentAssigned}" → "${normalizedName}"`);
      batch.update(doc.ref, { assignedTo: normalizedName });
      updatedCount++;
      batchCount++;

      // バッチは500件まで
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`バッチコミット: ${batchCount}件`);
        batch = db.batch(); // 新しいバッチを作成
        batchCount = 0;
      }
    } else if (normalizedName) {
      // 既に正式名の場合はスキップ
      skippedCount++;
    } else {
      // マッピングに存在しない場合
      notMatchedNames.add(currentAssigned);
      notMatchedCount++;
    }
  }

  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    console.log(`最終バッチコミット: ${batchCount}件`);
  }

  console.log('\n=== 結果 ===');
  console.log(`更新した商談数: ${updatedCount}`);
  console.log(`スキップ（既に正式名または空）: ${skippedCount}`);
  console.log(`マッチしなかった数: ${notMatchedCount}`);

  if (notMatchedNames.size > 0) {
    console.log('\nマッチしなかった担当者名:');
    for (const name of notMatchedNames) {
      console.log(`  - "${name}"`);
    }
  }
}

// 実行
fixDealAssignedTo()
  .then(() => {
    console.log('\n完了');
    process.exit(0);
  })
  .catch((err) => {
    console.error('エラー:', err);
    process.exit(1);
  });
