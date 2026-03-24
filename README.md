# GitHub PR Auto Viewed

GitHub の Pull Request「Files changed」タブで、自動生成コード（`_gen.go` 等）を一括で「Viewed」チェックする Chrome 拡張です。

## 機能

- Files changed ページのツールバーに **「Auto Viewed」ボタン**を追加
- ボタンをクリックすると、指定パターンに一致するファイルを一括で Viewed にする
- 既に Viewed のファイルはスキップ
- クリック後に「N件完了」のフィードバックを表示
- ポップアップからパターンを追加・削除できる設定UI
- 設定は `chrome.storage.sync` で永続化（ブラウザ再起動後も維持）

## デフォルトパターン

| パターン | 対象ファイル例 |
|---|---|
| `_gen.go` | `foo_gen.go`, `bar_gen.go` |
| `.pb.go` | `service.pb.go`, `api.pb.go` |
| `_mock.go` | `client_mock.go` |

パターンは**末尾一致（suffix match）**で判定します。

## インストール手順

### 1. リポジトリをクローン / ダウンロード

```bash
git clone <このリポジトリのURL>
cd gh-viewed-gen
```

### 2. Chrome に読み込む

1. Chrome で `chrome://extensions` を開く
2. 右上の **「デベロッパーモード」** をオンにする
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. このディレクトリ（`gh-viewed-gen/`）を選択

### 3. 動作確認

GitHub の任意の PR の **「Files changed」** タブを開くと、ツールバーに「Auto Viewed」ボタンが表示されます。

## 使い方

### 一括 Viewed

1. GitHub PR の「Files changed」タブを開く
2. ツールバーの **「Auto Viewed」** ボタンをクリック
3. パターンに一致するファイルが順次 Viewed になる
4. 完了後「N件完了」と表示される

### パターン設定

1. Chrome ツールバーの拡張アイコンをクリック
2. ポップアップでパターンの追加・削除ができる
3. 変更は即座に保存される

## 注意事項

- **40件超の大きな PR**: GitHub はファイルを遅延読み込みするため、**現在 DOM に表示されているファイルのみ**対象になります。スクロールして読み込まれたファイルは次のクリックで処理できます。
- **GitHub の React 対応**: チェックボックスのクリックはネイティブイベントで発火するため、GitHub 側のステートも正しく更新されます。
- **クリック間隔**: GitHub API への負荷を避けるため、1ファイルあたり 250ms の間隔を空けて順次処理します。

## ディレクトリ構成

```
gh-viewed-gen/
├── manifest.json        # Manifest V3 設定
├── content.js           # Files changed ページに注入されるスクリプト
├── popup.html           # パターン設定UI
├── popup.js             # popup のロジック
├── popup.css            # popup のスタイル
├── generate-icons.js    # アイコン生成スクリプト（開発用）
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 開発者向け

### アイコンを再生成する

```bash
# canvas パッケージを使う場合
npm install canvas
node generate-icons.js

# 依存なしの場合（自動フォールバック）
node generate-icons.js
```
