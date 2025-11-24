# wyside

> **注意**:
>
> - このプロジェクトは現在、鋭意開発中です。不完全な点が多くある可能性がありますので、あらかじめご了承ください。
> - 本プロジェクトは [@google/aside](https://github.com/google/aside) のフォークであり、AIネイティブなワークフローと統合アーキテクチャをサポートするために開発しました。

[![npm version](https://badge.fury.io/js/%40wywyjp%2Fwyside.svg)](https://badge.fury.io/js/%40wywyjp%2Fwyside)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## 概要

**wyside** は、Google Apps Script (GAS) 開発のための次世代 CLI および足場作成 (scaffolding) ツールです。従来の GAS 開発体験を、モダンでプロフェッショナルなソフトウェアエンジニアリングのワークフローへと変革します。

**「テスト分離型ハイブリッド (Test-Separated Hybrid)」アーキテクチャ** を強制することで、wyside はローカルの Node.js 環境と GAS ランタイムの両方で同一に動作するコードの記述を可能にします。これにより、TDD (テスト駆動開発)、ローカル実行、そして GAS 特有の制約を受けない CI/CD パイプラインが実現します。

## 主な機能

- **🚀 統合ハイブリッドランタイム**
  - Node.js と GAS の両方で動作するビジネスロジックを記述できます。データ操作には独自の GAS SDK ではなく標準的な `googleapis` REST API を使用するため、100% ローカルでのテストが可能です。

- **🤖 AIネイティブ・インフラストラクチャ** -**MCP (Model Context Protocol) サーバー** を内蔵しています。AI アシスタント (Claude や Gemini など) がこれを利用して、GCP プロジェクトのプロビジョニング、API (Sheets, Drive, Gmail) の有効化、サービスアカウントの管理を自律的に行います。

- **🛠️ モダンなツールチェーン**
  - **TypeScript**、**ESLint**、**Prettier**、**Vitest** が設定済みです。煩わしい設定地獄から解放され、すぐにコーディングを開始できます。

- **📦 自動グローバル公開**
  - 標準的な ESM の `export` 関数を記述するだけで、ビルドシステムが必要な GAS グローバルラッパー (`function onOpen() { ... }`) を自動生成し、コードをクリーンかつモジュール化された状態に保ちます。

- **🔄 マルチ環境サポート**
  - 専用のデプロイ設定により、`dev` (開発) 環境と `prod` (本番) 環境をシームレスに切り替えることができます。

## アーキテクチャ: 「テスト分離型ハイブリッド」アプローチ

1. **ビジネスロジックでの GAS SDK の原則禁止**: コアロジック内で `ScriptApp` や `SpreadsheetApp` を使用を原則禁止する。
2. **ユニバーサルクライアント**: ランタイムを検出する提供済みの「ユニバーサルクライアント」パターンを使用します：
   - **Node.js (ローカル/CI) 上**: サービスアカウントと共に `googleapis` を使用します。
   - **GAS (本番) 上**: `UrlFetchApp` と GAS OAuth トークンを使用します。
3. **結果**: コードは環境に依存しなくなります。ローカルで実行可能な高速で信頼性の高いユニットテストを Vitest で記述でき、デプロイ前に高品質を保証できます。

## クイックスタート

最初に、以下の事前準備（GCPのサービスアカウントの作成とキー取得）を完了させる必要があります：

1. 認証 (`gcloud`) の検証。
2. Google Cloud プロジェクトの選択/作成。
3. 必要な API (Sheets, Drive, Gmail) の有効化。
4. サービスアカウントの作成とキー (`secrets/service-account.json`) のダウンロード。
5. 環境変数の設定: `template/.env.example` を参考に `template/.env` ファイルを作成し、必要な環境変数（特に `GOOGLE_APPLICATION_CREDENTIALS` をダウンロードしたサービスアカウントキーのパスに、およびスプレッドシートID、GCPプロジェクトIDなど）を設定します。

事前準備が完了したら、以下のコマンドを実行してください：

```bash

npx @wywyjp/wyside init --setup-gcp

```

### 初期化のデバッグ

詳細なデバッグログで初期化の問題を調査するには：

```bash
WYSIDE_DEBUG=1 npx @wywyjp/wyside init --setup-gcp
```

## 実行内容

`init` コマンドを実行した後、wyside は以下を統制します：

- **設定の足場作成**: `tsconfig.json`、`eslint.config.js`、`vitest.config.ts`、`.prettierrc` をセットアップします。
- **依存関係のインストール**: ビルド、リント、テストに必要なすべてのパッケージを取得します。
- **スクリプトの設定**: `npm run build`、`npm run test`、`npm run deploy` などの便利なコマンドを `package.json` に追加します。
- **Clasp のセットアップ**: Google Drive とのコード同期のために [clasp](https://github.com/google/clasp) を初期化します。

## CLI オプション

以下のフラグを使用して初期化をカスタマイズできます：

- `--setup-gcp`
  組み込みの MCP サーバーを使用して、自動化された Google Cloud Platform のセットアップ (API、サービスアカウント、シークレット) を実行します。
- `--yes` / `-y`
  すべてのプロンプトに「yes」と回答します (非対話モード)。
- `--no` / `-n`
  すべてのプロンプトに「no」と回答します。
- `--title` / `-t` "文字列"
  プロジェクトのタイトルを明示的に設定します。
- `--script-dev` "文字列"
  `dev` 環境用の Apps Script ID を設定します。
- `--script-prod` "文字列"
  `production` (本番) 環境用の Apps Script ID を設定します。
