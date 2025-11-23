# wyside

- **注意**: これは [@google/aside](https://github.com/google/aside) のフォークです。
- オリジナルプロジェクトは Google によって作成されましたが、公式サポートはされていません。

## 概要

wyside は、フォーマット、リント、テストなどが可能なローカル開発環境のフレームワークを提供することで、モダンで堅牢かつスケーラブルな Apps Script 開発をサポートします。

主な機能は以下の通りです:

- **TypeScript**

  TypeScript でコードを記述できます。デプロイ時に自動的にコンパイルとバンドルが行われます

- **フォーマット / リント**

  ESLint と Prettier を活用して、共同作業者間で統一されたコーディングスタイルを強制します

- **テスト**

  Vitest を使用してデプロイ前にコードをテストできます

- **複数環境**

  `dev`と`prod`環境をシームレスに切り替えてコードをプッシュできます

## はじめに

```bash
npx @wywyjp/wyside init
```

詳細なデバッグログで初期化の問題を調査するには:

```bash
WYSIDE_DEBUG=1 npx @wywyjp/wyside init
```

## 実行内容

上記の`init`コマンドを実行すると、wyside は以下の処理を行います:

- **設定ファイルの追加**

  ESLint、Prettier、Jest などの設定ファイル

- **package.json への便利なスクリプトの設定**

  これらのスクリプトには: `lint`、`build`、`deploy`などが含まれます

- **必要な依存関係のインストール**

  フォーマット、リント、テストなどに必要なすべてが自動的にインストールされます

- **clasp のセットアップ**

  wyside は[clasp](https://github.com/google/clasp)を使用して Apps Script とのコードの取得とプッシュを行います

## オプション

`init`コマンドには、いくつかの便利なオプションを指定できます:

- `--yes` / `-y`

  すべてのプロンプトに「yes」で回答

- `--no` / `-n`

  すべてのプロンプトに「no」で回答

- `--title`/ `-t`

  プロジェクトタイトルを尋ねられることなく設定

- `--script-dev`

  開発環境の Script ID を尋ねられることなく設定

- `--script-prod`

  本番環境の Script ID を尋ねられることなく設定
