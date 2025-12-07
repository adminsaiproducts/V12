// V12 CRMアプリの動作確認スクリプト
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const V12_URL = 'https://crm-appsheet-v7.web.app';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

// 認証情報（V9と同じ）
const V9_CONFIG_PATH = path.join(__dirname, '..', '..', 'V9', 'config', 'test-auth.json');

async function checkV12App() {
  console.log('🚀 V12 CRMアプリ動作確認開始...');
  console.log(`📍 URL: ${V12_URL}`);

  // スクリーンショットディレクトリを作成
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let testCredentials = null;
  if (fs.existsSync(V9_CONFIG_PATH)) {
    console.log('📂 認証情報を読み込み中...');
    testCredentials = JSON.parse(fs.readFileSync(V9_CONFIG_PATH, 'utf-8'));
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // コンソールログを出力
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️ Console Warning: ${text}`);
    } else {
      console.log(`📋 ${text}`);
    }
  });

  try {
    // 1. トップページにアクセス
    console.log('\n=== 1. トップページにアクセス ===');
    await page.goto(V12_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v12-01-landing.png'), fullPage: false });
    console.log('📸 スクリーンショット保存: v12-01-landing.png');

    // ページタイトルを取得
    const title = await page.title();
    console.log(`📄 ページタイトル: ${title}`);

    // 2. ログインがある場合
    const loginButton = await page.$('button:has-text("ログイン")');
    if (loginButton && testCredentials) {
      console.log('\n=== 2. ログイン実行 ===');
      await loginButton.click();
      await page.waitForTimeout(3000);

      // Google OAuth画面の場合
      const emailInput = await page.$('input[type="email"]');
      if (emailInput && testCredentials.email) {
        await emailInput.fill(testCredentials.email);
        await page.click('button:has-text("次へ"), button:has-text("Next")');
        await page.waitForTimeout(2000);

        const passwordInput = await page.$('input[type="password"]');
        if (passwordInput && testCredentials.password) {
          await passwordInput.fill(testCredentials.password);
          await page.click('button:has-text("次へ"), button:has-text("Next")');
          await page.waitForTimeout(3000);
        }
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v12-02-after-login.png'), fullPage: false });
      console.log('📸 スクリーンショット保存: v12-02-after-login.png');
    }

    // 3. 顧客一覧ページに遷移
    console.log('\n=== 3. 顧客一覧に移動 ===');
    await page.goto(`${V12_URL}/customers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v12-03-customers.png'), fullPage: false });
    console.log('📸 スクリーンショット保存: v12-03-customers.png');

    // テーブルの内容を確認
    const tableRows = await page.$$('table tbody tr');
    console.log(`📊 顧客一覧のテーブル行数: ${tableRows.length}`);

    if (tableRows.length > 0) {
      // 最初の行の内容を確認
      const firstRowCells = await tableRows[0].$$('td');
      const cellTexts = [];
      for (const cell of firstRowCells) {
        const text = await cell.textContent();
        cellTexts.push(text);
      }
      console.log(`📋 最初の行の内容: ${JSON.stringify(cellTexts)}`);

      // 住所列のテキストを確認（4番目の列）
      if (cellTexts.length >= 4) {
        const addressText = cellTexts[3];
        console.log(`🏠 住所の表示: ${addressText}`);

        // JSON形式かどうかチェック
        if (addressText && addressText.includes('{') && addressText.includes('}')) {
          console.log('❌ 住所がJSON形式で表示されています！修正が必要です。');
        } else {
          console.log('✅ 住所が正しくフォーマットされています。');
        }
      }
    }

    // 4. 顧客詳細に移動
    if (tableRows.length > 0) {
      console.log('\n=== 4. 顧客詳細に移動 ===');
      await tableRows[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v12-04-customer-detail.png'), fullPage: false });
      console.log('📸 スクリーンショット保存: v12-04-customer-detail.png');
    }

    console.log('\n✅ V12アプリの確認完了');
    console.log(`📁 スクリーンショット保存先: ${SCREENSHOT_DIR}`);

    // ブラウザを開いたままにする
    console.log('\n🔍 確認のためブラウザを開いたままにします（30秒後に自動終了）...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v12-error.png'), fullPage: false });
    console.log('📸 エラー時スクリーンショット保存: v12-error.png');
  } finally {
    await browser.close();
    console.log('🔒 ブラウザを閉じました');
  }
}

checkV12App();
