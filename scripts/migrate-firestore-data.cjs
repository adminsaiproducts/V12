/**
 * Firestore データ移行スクリプト
 *
 * 旧プロジェクト（crm-appsheet-v7/crm-database-v9）から
 * 新プロジェクト（biz-01/default）へデータを移行する
 *
 * 使用方法:
 *   node scripts/migrate-firestore-data.cjs [オプション]
 *
 * オプション:
 *   --dry-run         ドライランモード（書き込みなし、件数確認のみ）
 *   --collection <name>  特定のコレクションのみ移行
 *   --skip-existing   既存ドキュメントをスキップ（上書きしない）
 */

const admin = require('firebase-admin');
const path = require('path');

// 設定
const SOURCE_SERVICE_ACCOUNT = path.join(__dirname, '..', 'config', 'serviceAccount-v9.json');
const DEST_SERVICE_ACCOUNT = path.join(__dirname, '..', 'config', 'serviceAccount-dest.json');

const SOURCE_PROJECT_ID = 'crm-appsheet-v7';
const SOURCE_DATABASE_ID = 'crm-database-v9';

const DEST_PROJECT_ID = 'biz-01';
// const DEST_DATABASE_ID = '(default)'; // デフォルトDBは設定不要

// 移行対象コレクション
const COLLECTIONS_TO_MIGRATE = [
  'Customers',
  'Deals',
  'TreeBurialDeals',
  'BurialPersons',
  'Activities',
  'Relationships',
  'ConstructionProjects',
  'DealProducts',
  'GeneralSalesDeals',
  'Masters',
  'TrackingNoCounter',
  'Branches',
  'Employees',
  'PlotTypes',
  'RelationshipTypes',
  'StoneTypes'
];

const BATCH_SIZE = 450;

// コマンドライン引数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    collection: null,
    skipExisting: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--collection':
        options.collection = args[++i];
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
    }
  }

  return options;
}

// Firebase初期化
function initializeFirebase() {
  console.log('\n=== Firebase初期化 ===');

  // ソース（旧プロジェクト）
  const sourceApp = admin.initializeApp({
    credential: admin.credential.cert(require(SOURCE_SERVICE_ACCOUNT)),
    projectId: SOURCE_PROJECT_ID
  }, 'source');

  const sourceDb = admin.firestore(sourceApp);
  sourceDb.settings({ databaseId: SOURCE_DATABASE_ID });
  console.log(`  移行元: ${SOURCE_PROJECT_ID}/${SOURCE_DATABASE_ID}`);

  // デスティネーション（新プロジェクト）
  const destApp = admin.initializeApp({
    credential: admin.credential.cert(require(DEST_SERVICE_ACCOUNT)),
    projectId: DEST_PROJECT_ID
  }, 'dest');

  const destDb = admin.firestore(destApp);
  // (default) データベースは設定不要
  console.log(`  移行先: ${DEST_PROJECT_ID}/(default)`);

  return { sourceDb, destDb };
}

// コレクションのドキュメント数を取得
async function getCollectionCount(db, collectionName) {
  const snapshot = await db.collection(collectionName).count().get();
  return snapshot.data().count;
}

// コレクションを移行
async function migrateCollection(sourceDb, destDb, collectionName, options) {
  console.log(`\n--- ${collectionName} ---`);

  // ソースの件数を取得
  const sourceCount = await getCollectionCount(sourceDb, collectionName);
  console.log(`  移行元ドキュメント数: ${sourceCount}`);

  if (sourceCount === 0) {
    console.log('  スキップ（データなし）');
    return { collection: collectionName, source: 0, migrated: 0, skipped: 0 };
  }

  // ドライランの場合はここで終了
  if (options.dryRun) {
    console.log('  [DRY-RUN] 書き込みスキップ');
    return { collection: collectionName, source: sourceCount, migrated: 0, skipped: 0, dryRun: true };
  }

  // 既存ドキュメントの確認（skip-existing用）
  let existingIds = new Set();
  if (options.skipExisting) {
    const destSnapshot = await destDb.collection(collectionName).select().get();
    destSnapshot.forEach(doc => existingIds.add(doc.id));
    console.log(`  移行先既存ドキュメント数: ${existingIds.size}`);
  }

  // データを取得して移行
  const sourceSnapshot = await sourceDb.collection(collectionName).get();

  let migrated = 0;
  let skipped = 0;
  let batch = destDb.batch();
  let batchCount = 0;

  for (const doc of sourceSnapshot.docs) {
    // skip-existing で既存の場合はスキップ
    if (options.skipExisting && existingIds.has(doc.id)) {
      skipped++;
      continue;
    }

    const destRef = destDb.collection(collectionName).doc(doc.id);
    batch.set(destRef, doc.data());
    batchCount++;
    migrated++;

    // バッチサイズに達したらコミット
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  ${migrated}/${sourceCount} 完了...`);
      batch = destDb.batch();
      batchCount = 0;
    }
  }

  // 残りをコミット
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  完了: ${migrated}件移行, ${skipped}件スキップ`);
  return { collection: collectionName, source: sourceCount, migrated, skipped };
}

// メイン処理
async function main() {
  const options = parseArgs();

  console.log('\n========================================');
  console.log('  Firestore データ移行スクリプト');
  console.log('========================================');
  console.log(`\nモード: ${options.dryRun ? 'DRY-RUN（書き込みなし）' : '実行'}`);
  if (options.collection) {
    console.log(`対象コレクション: ${options.collection}`);
  }
  if (options.skipExisting) {
    console.log('既存ドキュメント: スキップ');
  }

  const { sourceDb, destDb } = initializeFirebase();

  const collections = options.collection
    ? [options.collection]
    : COLLECTIONS_TO_MIGRATE;

  const results = [];

  console.log('\n=== 移行開始 ===');

  for (const collectionName of collections) {
    try {
      const result = await migrateCollection(sourceDb, destDb, collectionName, options);
      results.push(result);
    } catch (error) {
      console.error(`  エラー: ${error.message}`);
      results.push({ collection: collectionName, error: error.message });
    }
  }

  // サマリー表示
  console.log('\n========================================');
  console.log('  移行結果サマリー');
  console.log('========================================\n');

  console.log('コレクション'.padEnd(25) + '移行元'.padStart(10) + '移行済'.padStart(10) + 'スキップ'.padStart(10));
  console.log('-'.repeat(55));

  let totalSource = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const result of results) {
    if (result.error) {
      console.log(`${result.collection.padEnd(25)}  ERROR: ${result.error}`);
    } else {
      const dryRunMark = result.dryRun ? ' [DRY-RUN]' : '';
      console.log(
        result.collection.padEnd(25) +
        String(result.source).padStart(10) +
        String(result.migrated).padStart(10) +
        String(result.skipped).padStart(10) +
        dryRunMark
      );
      totalSource += result.source;
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
    }
  }

  console.log('-'.repeat(55));
  console.log('合計'.padEnd(25) + String(totalSource).padStart(10) + String(totalMigrated).padStart(10) + String(totalSkipped).padStart(10));

  console.log('\n移行完了！');
  process.exit(0);
}

main().catch(error => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
