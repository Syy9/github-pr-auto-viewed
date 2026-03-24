/**
 * GitHub PR Auto Viewed - Content Script
 * Files changedページで自動生成ファイルを一括Viewedにする
 */

const BUTTON_ID = 'gh-auto-viewed-btn';
const DEFAULT_PATTERNS = ['_gen.go', '.pb.go', '_mock.go'];
const CLICK_INTERVAL_MS = 250;

// ボタンをツールバーに注入する
function injectButton() {
  // 既にボタンが存在する場合はスキップ
  if (document.getElementById(BUTTON_ID)) return;

  // Files changedのツールバーを探す（複数のセレクタを試みる）
  const toolbar = findToolbar();
  if (!toolbar) return;

  const btn = createButton();
  toolbar.prepend(btn);
}

// GitHubのUIバージョンに応じてツールバーを探す
function findToolbar() {
  const selectors = [
    '.diffbar-item:last-child',          // 旧UI
    '.pr-toolbar .diffbar-item',         // 旧UI 別パターン
    '#files .Details-content--hidden',  // 一部バージョン
    '.js-diff-progressive-container',   // progressive loading
    '#files .d-flex.flex-items-center', // 新UI
    '.js-reviews-container .d-flex',    // レビューツールバー
    '#files',                            // フォールバック: filesセクション直下
  ];

  // #files セクションのツールバーボタン群を探す
  const fileHeaderActions = document.querySelector(
    '.js-diff-settings, .diffbar, [data-target="diff-settings.toolbar"]'
  );
  if (fileHeaderActions) return fileHeaderActions;

  // Copilot/新UIのツールバー
  const newToolbar = document.querySelector('.pr-review-tools');
  if (newToolbar) return newToolbar;

  // 旧UIのツールバー
  const oldToolbar = document.querySelector('.pr-toolbar');
  if (oldToolbar) return oldToolbar;

  // フォールバック: #files セクションの先頭
  return document.querySelector('#files');
}

function createButton() {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.textContent = 'Auto Viewed';
  btn.title = 'パターンに一致するファイルを一括でViewedにする';

  // GitHubのボタンスタイルに合わせる
  btn.className = 'btn btn-sm';
  btn.style.cssText = `
    margin-right: 8px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  `;

  btn.addEventListener('click', handleButtonClick);
  return btn;
}

// ボタンクリック時のメイン処理
async function handleButtonClick() {
  const btn = document.getElementById(BUTTON_ID);
  if (!btn) return;

  // 処理中は無効化
  btn.disabled = true;
  btn.textContent = '処理中...';

  try {
    const patterns = await getPatterns();
    const result = await markFilesAsViewed(patterns);

    // フィードバック表示
    if (result.marked === 0) {
      btn.textContent = '対象なし';
    } else {
      btn.textContent = `${result.marked}件完了`;
    }

    // 3秒後にボタンテキストをリセット
    setTimeout(() => {
      if (document.getElementById(BUTTON_ID)) {
        btn.textContent = 'Auto Viewed';
        btn.disabled = false;
      }
    }, 3000);
  } catch (err) {
    console.error('[gh-auto-viewed] Error:', err);
    btn.textContent = 'エラー';
    setTimeout(() => {
      if (document.getElementById(BUTTON_ID)) {
        btn.textContent = 'Auto Viewed';
        btn.disabled = false;
      }
    }, 3000);
  }
}

// chrome.storage.sync からパターンを取得
function getPatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS }, (result) => {
      resolve(result.patterns);
    });
  });
}

// パターンに一致するファイルを順次Viewedにする
async function markFilesAsViewed(patterns) {
  const files = findMatchingFiles(patterns);
  let marked = 0;

  for (const { checkbox, path } of files) {
    // 間隔を空けてクリック（GitHub API rate limit対策）
    await sleep(CLICK_INTERVAL_MS);

    try {
      checkbox.click();
      marked++;
      console.log(`[gh-auto-viewed] Marked as viewed: ${path}`);
    } catch (err) {
      console.warn(`[gh-auto-viewed] Failed to click checkbox for: ${path}`, err);
    }
  }

  return { marked, total: files.length };
}

// DOM上の全ファイルを走査し、パターン一致 + 未Viewed のものを返す
function findMatchingFiles(patterns) {
  const results = [];

  // GitHubのファイル要素を取得（複数のセレクタを試みる）
  const fileElements = document.querySelectorAll(
    '.file[data-path], [data-path].js-file-header, .js-diff-progressive-container .file'
  );

  // data-path属性を持つ全要素を対象にする（より確実）
  const allFiles = document.querySelectorAll('[data-path]');

  const processedPaths = new Set();

  for (const el of allFiles) {
    const filePath = el.getAttribute('data-path');
    if (!filePath || processedPaths.has(filePath)) continue;

    // suffix matchでパターン確認
    if (!matchesSuffix(filePath, patterns)) continue;

    // この要素またはその親/子のチェックボックスを探す
    const checkbox = findViewedCheckbox(el);
    if (!checkbox) continue;

    // 既にViewedの場合はスキップ
    if (checkbox.checked) continue;

    processedPaths.add(filePath);
    results.push({ checkbox, path: filePath });
  }

  return results;
}

// ファイルパスがいずれかのsuffixパターンに一致するか確認
function matchesSuffix(filePath, patterns) {
  return patterns.some(pattern => filePath.endsWith(pattern));
}

// ファイル要素に関連するViewedチェックボックスを探す
function findViewedCheckbox(el) {
  // 要素自体がチェックボックスの場合
  if (el.tagName === 'INPUT' && el.type === 'checkbox') return el;

  // 子要素のチェックボックスを探す（ファイルヘッダー内）
  const childCheckbox = el.querySelector('input[type="checkbox"]');
  if (childCheckbox) return childCheckbox;

  // 親要素を遡って .file コンテナを探す
  const fileContainer = el.closest('.file, [data-file-type]');
  if (fileContainer) {
    const containerCheckbox = fileContainer.querySelector('input[type="checkbox"]');
    if (containerCheckbox) return containerCheckbox;
  }

  // data-path属性を持つ親要素のヘッダー内を探す
  const parent = el.closest('[data-path]');
  if (parent && parent !== el) {
    const parentCheckbox = parent.querySelector('input[type="checkbox"]');
    if (parentCheckbox) return parentCheckbox;
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// MutationObserverでSPAナビゲーションとDOMの動的変化に対応
let observer = null;
let injectTimeout = null;

function setupObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    // デバウンス処理でボタン注入
    clearTimeout(injectTimeout);
    injectTimeout = setTimeout(() => {
      injectButton();
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// 初期化
function init() {
  // URLがFiles changedページか確認
  if (!location.href.match(/github\.com\/.*\/pull\/.*\/files/)) return;

  injectButton();
  setupObserver();
}

// DOMContentLoaded または即時実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// GitHub SPAのページ遷移に対応（pushState / replaceState）
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // URLが変わったら再初期化
    setTimeout(init, 1000);
  }
});
urlObserver.observe(document, { subtree: true, childList: true });
