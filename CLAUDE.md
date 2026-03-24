# CLAUDE.md

## プロジェクト概要

GitHub PR の「Files changed」タブで対象ファイルを一括 Viewed にする Chrome 拡張（Manifest V3）。

## アーキテクチャ

```
popup.js  --[chrome.tabs.sendMessage]--> content.js
                                              |
                                         GitHubのDOM操作
                                    (MarkAsViewedButton.click())
```

- **popup.js**: アクティブタブのURLを確認し、Files changed ページのみ実行ボタンを表示。パターン管理も担う
- **content.js**: メッセージ受信後、DOM を走査して Viewed ボタンをクリック。ページ注入は行わない

## GitHub DOM の特性（重要）

現行 GitHub UI（2026年時点）での確認済み仕様：

- Viewed ボタンは `input[type="checkbox"]` **ではなく** `<button class="...MarkAsViewedButton...">` として実装されている
- ボタンのクラス名はCSS Modulesでハッシュが付く（`MarkAsViewedButton-module__iconOnly__kEP4e`）が、`MarkAsViewedButton` の部分は安定しているため `[class*="MarkAsViewedButton"]` でセレクト
- 未 Viewed: `aria-pressed="false"` / `aria-label="Not Viewed"`
- Viewed 済み: `aria-pressed="true"` / `aria-label="Viewed"`
- ファイルパスは `DiffFileHeader` 内のリンクテキストから取得（`data-path` 属性は存在しない）
- リンクテキストに Unicode 方向制御文字（U+200E等）が混入するため `cleanText()` で除去が必要
- Files changed の URL は `/files` ではなく `/changes` になっている場合がある

## コーディング規約

- ファイルは vanilla JS のみ（ビルドツール・npm 依存なし）
- content.js はページへの DOM 注入を行わない（ポップアップ経由のみ）
- セレクタは複数のフォールバックを持たせる（GitHub UI は変更頻度が高い）
- クリック間隔は 300ms（`CLICK_INTERVAL_MS`）を維持する

## 動作確認手順

1. `chrome://extensions` → 更新ボタン（↺）
2. GitHub PR の Files changed ページをハードリフレッシュ（`Cmd+Shift+R`）
3. 拡張アイコン → 「対象ファイルを一括 Viewed にする」をクリック
4. DevTools Console で `[gh-auto-viewed]` ログを確認

## GitHub UI が変わった時の調査方法

Viewed ボタンが動かなくなった場合、Console で以下を実行して現在の DOM 構造を確認する：

```javascript
// Viewed ボタン要素の確認
Array.from(document.querySelectorAll('button, label'))
  .filter(el => el.textContent.trim().includes('Viewed'))
  .map(el => ({ tag: el.tagName, cls: el.className, ariaLabel: el.getAttribute('aria-label') }))

// ファイルヘッダー内のリンク確認
document.querySelector('[class*="DiffFileHeader"]').querySelector('a')?.textContent.trim()
```
