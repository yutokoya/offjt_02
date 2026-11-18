# タスク管理システム

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite
- **バックエンド**: Spring Boot 4.1 + Java 21 + JPA + Flyway + PostgreSQL 17
- **テスト**: JUnit 5（バックエンドの単体・結合テスト）。E2E は Cucumber を想定（未導入）
- **開発環境**: Docker Compose（PostgreSQL）、Vite の HMR

## 構成

```text
.
├── backend/                 # Spring Boot API (Java 21)
│   └── src/
│       ├── main/java/       # アプリケーションとAPI
│       ├── main/resources/  # アプリケーション設定
│       └── test/java/       # バックエンドテスト
├── frontend/                # React + TypeScript + Vite
├── .github/workflows/       # CI
└── compose.yml              # PostgreSQL開発用サービス
```

## 開発・検証

バックエンドの起動とテストにはPostgreSQLが必要です。リポジトリのルートで起動します。

```bash
docker compose up -d postgres
```

### CIと共通の検証ゲート

リポジトリのルートから実行します。両ゲートに Java 21、Node.js 24、pnpm 10 が必要です。`verify` には起動済みの開発用PostgreSQL、`security` には Docker と完全な Git 履歴も必要です。

```bash
pnpm --dir frontend install --frozen-lockfile  # 初回または依存関係の変更時
bash scripts/gate.sh verify
bash scripts/gate.sh security
```

| ゲート | 検査 | 合格条件 |
|---|---|---|
| `verify` | 整形（Prettier・Checkstyle）、Lint（ESLint・Checkstyle）、型検査（TypeScript・Javaコンパイル）、テスト（Node.js・Maven） | フロントエンドとバックエンドの検査が両方成功する |
| `security` | 依存監査（pnpm audit・Trivy）、秘密情報（Gitleaks） | 重大度 Critical の依存脆弱性や秘密情報を検出せず、すべての検査が完了する |

Gitleaks はチェックアウト済みの作業ツリーと取得済みの全 Git 参照の履歴を検査します。検出値はマスクしますが、実際の秘密情報が見つかった場合は、ファイルから削除するだけでなく先に無効化・ローテーションしてください。

Java の依存監査では、Maven が解決した直接・推移依存関係を CycloneDX SBOM に出力し、Trivy に渡します。Trivy は Maven リポジトリへ再問い合わせせず、脆弱性データベースとの照合を行います。社内プロキシなどで追加の認証局が必要な場合は、信頼済みの PEM 形式 CA バンドルを `TRIVY_CA_BUNDLE` に絶対パスで指定してください。

開発用PostgreSQLを停止する場合:

```bash
docker compose down
```

`docker compose down` はデータボリュームを削除しません。