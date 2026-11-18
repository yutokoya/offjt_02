# 実装計画: タスク登録

**ブランチ**: `001-task-registration` | **日付**: 2026-11-18 | **仕様**: [spec.md](./spec.md)

**入力**: `specs/001-task-registration/spec.md`の機能仕様

## 概要

登録専用画面からタスク名、説明、担当者、期限日を入力し、`POST /api/tasks`で登録する。バックエンドは入力を検証し、PostgreSQLへ一括保存して201と作成済みタスクを返す。フロントエンドは成功後にタスク一覧へ戻り、返されたタスクを一覧に反映して登録完了メッセージを表示する。登録画面は更新画面および削除確認UIと共用しない。詳細は[research.md](./research.md)、[data-model.md](./data-model.md)、[contracts/task-registration-api.md](./contracts/task-registration-api.md)を参照する。

## 技術的な前提

**言語・バージョン**: Java 21、TypeScript（既存フロントエンド設定）

**主な依存関係**: Spring Boot 4.1.2、Spring Data JPA、Flyway、React 19、Vite

**データベース**: PostgreSQL 17。共有タスクモデルをFlywayで作成し、JPAのスキーマ検証を有効にする。現状の`application.yml`はHibernateの自動更新を指定しているため、Flyway管理と競合しない設定に変更する。

**テスト**: バックエンドはJUnit 5とSpring MVCテストを使用し、PostgreSQLを使う検証では開発用DBを起動する。フロントエンドはNode.js `node:test` とVite SSRを使う。画面遷移・入力・登録後一覧は手動で受入確認し、新たなE2E依存は追加しない。

**対象プラットフォーム**: ブラウザー、ローカルおよびCI上のSpring Boot API

**プロジェクト種別**: Webアプリケーション（Reactフロントエンド + Spring Boot REST API）

**性能目標**: 本機能固有の数値目標は未設定。利用者は研修受講者4名であり、新たな性能要件は設けない。

**制約**: タスク名・説明の長さはUnicodeコードポイント数で判定し、タスク名のUnicode空白を除去して保存する。入力検証はバックエンドで必ず行う。期限日は過去日も受け付ける。登録画面を更新フォームと共用しない。変更はチーム憲章のPR上限（400行・8ファイル）に収め、超える場合は複数PRに分ける。

**規模・対象範囲**: 研修受講者4名、タスク登録の1ユーザーフロー。Must要件のみ。

## チーム憲章の確認

*確認ゲート: フェーズ0の前とフェーズ1の後に確認する。*

### フェーズ0の前

- **仕様先行**: 登録専用画面、必須項目、文字数、日付、未割当の扱い、登録成功・失敗時の表示が仕様化済み。適合。
- **変更責任・レビュー可能性**: 既存のREST API、React、Spring Boot、JPA、Flywayに沿い、小さな層ごとに実装する。適合。
- **範囲とPR上限**: 登録と一覧への反映に限定し、更新・削除・時間・依存関係機能は追加しない。400行または8ファイルを超える場合はPRを分割する。適合（実装時に確認）。
- **テストと安全**: 入力検証、保存結果、一覧反映、画面の独立性をテストし、本番DBを使用しない。適合。

### フェーズ1の後

- **データ整合性**: 検証後にタスクを一処理として保存し、失敗時に部分データを残さない。適合。
- **範囲**: `POST /api/tasks`および登録画面に限定し、既存タスクの変更・削除を行わない。適合。
- **実装依存関係**: 現在の一覧APIは空配列を返し、登録APIは未実装応答である。タスク登録機能内で共通の永続化モデルと一覧取得を整備し、他機能に登録処理を依存させない。適合。

## プロジェクト構成

### 本機能の文書

```text
specs/001-task-registration/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── task-registration-api.md
```

`tasks.md`は`/speckit-tasks`で作成する成果物であり、この計画では作成しない。

### ソースコード（リポジトリルート）

```text
backend/
├── src/main/java/com/example/backend/task/
│   ├── TaskSkeletonController.java
│   ├── TaskRegistrationRequest.java
│   ├── TaskListResponse.java
│   ├── TaskEntity.java
│   ├── TaskRepository.java
│   └── TaskService.java
├── src/main/resources/db/migration/
│   └── V1__create_tasks.sql
└── src/test/java/com/example/backend/
    └── task/
        ├── TaskServiceTests.java
        └── TaskControllerTests.java

frontend/
├── src/App.tsx
├── src/features/tasks/
│   ├── taskApi.ts
│   └── TaskRegistrationPage.tsx
└── test/app.test.mjs
```

**構成上の決定**: 既存の単一Reactアプリを継続する。登録専用画面は`App.tsx`の画面状態から表示し、登録画面と一覧を切り替える。新しいルーター依存は追加しない。既存の`TaskSkeletonController`を登録と一覧のAPIに使用し、永続化は`task`パッケージのサービス・リポジトリに集約する。PR上限に従い、DB・サービス基盤、REST API、フロントエンドの順に分割する。

## 実装フェーズ

1. **永続化基盤**: `tasks`テーブルのFlywayマイグレーション、JPAエンティティ、リポジトリ、サービスを追加し、Hibernateのスキーマ検証へ切り替える。PostgreSQLで登録・一覧取得の永続化を検証する。
2. **REST契約**: 登録・一覧APIを永続化サービスに接続する。リクエスト検証、共通エラー応答、201と`Location`、作成済みタスクの応答を実装し、正常・異常系を検証する。
3. **登録専用画面**: 一覧と登録画面を別の画面状態にする。フォーム入力、成功・失敗メッセージ、成功時の一覧反映を実装し、登録画面が更新フォームや削除確認UIと共用されないことを確認する。

## 受け入れ確認

- 有効なタスクを登録すると201応答と`Location`が返り、作成データがPostgreSQLに保持される。
- タスク名、説明、期限日、担当者の境界値と省略可能項目が仕様どおりに扱われる。
- 入力エラーでは400とフィールドエラーが返り、データが保存されない。
- 登録成功後に一覧へ戻ると、応答で返された新規タスクと完了メッセージが表示される。
- 登録専用画面は更新画面と分離され、削除確認UIを登録フローとして使用しない。
