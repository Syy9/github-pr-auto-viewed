/**
 * GitHub PR Auto Viewed - Popup Script
 * パターン設定UIのロジック
 */

const DEFAULT_PATTERNS = ['_gen.go', '.pb.go', '_mock.go'];

let patterns = [];

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  patterns = await loadPatterns();
  renderPatternList();
  setupEventListeners();
});

// chrome.storage.sync からパターンを読み込む
function loadPatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS }, (result) => {
      resolve([...result.patterns]);
    });
  });
}

// パターンを chrome.storage.sync に保存
function savePatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ patterns }, () => {
      resolve();
    });
  });
}

// パターンリストを再描画
function renderPatternList() {
  const list = document.getElementById('pattern-list');
  list.innerHTML = '';

  if (patterns.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'pattern-empty';
    empty.textContent = 'パターンがありません';
    list.appendChild(empty);
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
    deleteBtn.title = `"${pattern}" を削除`;
    deleteBtn.addEventListener('click', () => deletePattern(index));

    li.appendChild(span);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

// パターンを追加
async function addPattern() {
  const input = document.getElementById('new-pattern');
  const value = input.value.trim();

  if (!value) {
    showStatus('パターンを入力してください', 'error');
    return;
  }

  if (patterns.includes(value)) {
    showStatus('既に登録されています', 'error');
    return;
  }

  patterns.push(value);
  await savePatterns();
  renderPatternList();
  input.value = '';
  showStatus(`"${value}" を追加しました`, 'success');
}

// パターンを削除
async function deletePattern(index) {
  const removed = patterns[index];
  patterns.splice(index, 1);
  await savePatterns();
  renderPatternList();
  showStatus(`"${removed}" を削除しました`, 'success');
}

// ステータスメッセージを表示
function showStatus(message, type = 'success') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status status-${type}`;

  clearTimeout(status._timeout);
  status._timeout = setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 2500);
}

// イベントリスナーの設定
function setupEventListeners() {
  document.getElementById('add-btn').addEventListener('click', addPattern);

  document.getElementById('new-pattern').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPattern();
  });
}
