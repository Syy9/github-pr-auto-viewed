/**
 * GitHub PR Auto Viewed - Content Script
 * popupからのメッセージを受け取り、自動生成ファイルを一括Viewedにする
 */

const DEFAULT_PATTERNS = ['_gen.go', '.pb.go', '_mock.go'];
const CLICK_INTERVAL_MS = 300;

// ========== メッセージリスナー ==========

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'MARK_VIEWED') {
    const patterns = message.patterns || DEFAULT_PATTERNS;
    markFilesAsViewed(patterns)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // 非同期レスポンスを使うため
  }
});

// ========== Viewed処理 ==========

async function markFilesAsViewed(patterns) {
  const candidates = findMatchingFiles(patterns);
  let marked = 0;

  for (const { clickTarget, path, alreadyViewed } of candidates) {
    if (alreadyViewed) continue;
    await sleep(CLICK_INTERVAL_MS);
    try {
      clickTarget.click();
      marked++;
    } catch (err) {
      console.warn('[gh-auto-viewed] click failed:', path, err);
    }
  }

  return { marked, total: candidates.length };
}

// ========== ファイル要素の探索 ==========

function findMatchingFiles(patterns) {
  const results = [];
  const seen = new Set();

  // 新UI: MarkAsViewedButton
  const viewedBtns = document.querySelectorAll('button[class*="MarkAsViewedButton"]');

  for (const btn of viewedBtns) {
    const alreadyViewed = btn.getAttribute('aria-pressed') === 'true'
      || btn.getAttribute('aria-label') === 'Viewed';
    const path = extractPathFromViewedButton(btn);

    if (!path || seen.has(path)) continue;
    if (!matchesPattern(path, patterns)) continue;

    seen.add(path);
    results.push({ clickTarget: btn, path, alreadyViewed });
  }

  // フォールバック: 旧UI (input[type=checkbox])
  if (viewedBtns.length === 0) {
    for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
      const path = extractPathFromAncestors(cb);
      if (!path || seen.has(path)) continue;
      if (!matchesPattern(path, patterns)) continue;
      seen.add(path);
      results.push({ clickTarget: cb.closest('label') || cb, path, alreadyViewed: cb.checked });
    }
  }

  return results;
}

function extractPathFromViewedButton(btn) {
  const header = btn.closest('[class*="DiffFileHeader"]');
  if (header) {
    const blobLink = header.querySelector('a[href*="/blob/"]');
    if (blobLink) {
      const m = blobLink.getAttribute('href').match(/\/blob\/[^/]+\/(.+?)(?:#.*)?$/);
      if (m) return m[1];
    }
    const diffLink = header.querySelector('a[href*="#diff-"]');
    if (diffLink) {
      const text = cleanText(diffLink.textContent);
      if (text) return text;
    }
    for (const a of header.querySelectorAll('a')) {
      const text = cleanText(a.textContent);
      if (text && text.match(/\.\w+/)) return text;
    }
  }

  const m = (btn.getAttribute('aria-label') || '').match(/Mark\s+(.+?)\s+as\s+viewed/i);
  if (m) return m[1].trim();

  return extractPathFromAncestors(btn);
}

function extractPathFromAncestors(el) {
  let cur = el.parentElement;
  for (let i = 0; i < 20; i++) {
    if (!cur) break;
    const path = cur.getAttribute('data-path');
    if (path) return path;
    const link = cur.querySelector('a[href*="/blob/"]');
    if (link) {
      const m = link.getAttribute('href').match(/\/blob\/[^/]+\/(.+)/);
      if (m) return m[1];
    }
    cur = cur.parentElement;
  }
  return null;
}

function cleanText(str) {
  return str.replace(/[\u200e\u200f\u200b\u200c\u200d\u2028\u2029\ufeff\u00ad]/g, '').trim();
}

function matchesPattern(filePath, patterns) {
  const clean = cleanText(filePath);
  return patterns.some(p => clean.includes(p));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
