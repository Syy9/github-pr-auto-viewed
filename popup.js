/**
 * Github PR Auto Viewed - Popup Script
 */

const DEFAULT_PATTERNS = ['_gen.go', '.pb.go', '_mock.go'];
const FILES_CHANGED_RE = /github\.com\/[^/]+\/[^/]+\/pull\/\d+\/(files|changes)/;
const MARK_BTN_LABEL = '対象ファイルを一括 Viewed にする';

let patterns = [];
let statusTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  patterns = await loadPatterns();
  renderPatternList();
  setupEventListeners();
  await checkActiveTab();
});

// ========== タブ確認・実行ボタン制御 ==========

async function checkActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onFilesPage = tab != null && FILES_CHANGED_RE.test(tab.url || '');

  document.getElementById('action-section').hidden = !onFilesPage;
  document.getElementById('not-on-files').hidden = onFilesPage;
}

async function runMarkViewed() {
  const btn = document.getElementById('mark-btn');
  const statusEl = document.getElementById('action-status');

  btn.disabled = true;
  btn.textContent = '処理中...';
  statusEl.textContent = '';
  statusEl.className = 'status';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'MARK_VIEWED',
      patterns,
    });

    if (response?.ok) {
      btn.textContent = response.marked === 0 ? '対象なし' : `✓ ${response.marked}件完了`;
    } else {
      btn.textContent = 'エラー';
      statusEl.textContent = response?.error || '不明なエラー';
      statusEl.className = 'status status-error';
    }
  } catch {
    btn.textContent = 'エラー';
    statusEl.textContent = 'ページをリロードして再試行してください';
    statusEl.className = 'status status-error';
  }

  setTimeout(() => {
    btn.textContent = MARK_BTN_LABEL;
    btn.disabled = false;
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, 3000);
}

// ========== パターン管理 ==========

function loadPatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS }, (r) => resolve([...r.patterns]));
  });
}

function savePatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ patterns }, resolve);
  });
}

function renderPatternList() {
  const list = document.getElementById('pattern-list');
  list.innerHTML = '';

  if (patterns.length === 0) {
    const li = document.createElement('li');
    li.className = 'pattern-empty';
    li.textContent = 'パターンがありません';
    list.appendChild(li);
    return;
  }

  patterns.forEach((pattern, index) => {
    const li = document.createElement('li');
    li.className = 'pattern-item';

    const span = document.createElement('span');
    span.className = 'pattern-text';
    span.textContent = pattern;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deletePattern(index));

    li.appendChild(span);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

async function addPattern() {
  const input = document.getElementById('new-pattern');
  const value = input.value.trim();

  if (!value) { showStatus('パターンを入力してください', 'error'); return; }
  if (patterns.includes(value)) { showStatus('既に登録されています', 'error'); return; }

  patterns.push(value);
  await savePatterns();
  renderPatternList();
  input.value = '';
  showStatus(`"${value}" を追加しました`, 'success');
}

async function deletePattern(index) {
  const removed = patterns[index];
  patterns.splice(index, 1);
  await savePatterns();
  renderPatternList();
  showStatus(`"${removed}" を削除しました`, 'success');
}

function showStatus(message, type = 'success') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status status-${type}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    el.textContent = '';
    el.className = 'status';
  }, 2500);
}

function setupEventListeners() {
  document.getElementById('mark-btn').addEventListener('click', runMarkViewed);
  document.getElementById('add-btn').addEventListener('click', addPattern);
  document.getElementById('new-pattern').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPattern();
  });
}
