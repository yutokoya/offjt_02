# タスク管理システム

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

バックエンドのテストとビルド:

```bash
cd backend
./mvnw verify
```

フロントエンドのLintとビルド:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm verify
```

開発用PostgreSQLを停止する場合:

```bash
docker compose down
```

`docker compose down` はデータボリュームを削除しません。