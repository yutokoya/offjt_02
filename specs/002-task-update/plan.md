# 実装計画: タスク更新

**ブランチ**: `002-task-update` | **日付**: 2026-11-18 | **仕様**: [spec.md](./spec.md)

**入力**: `specs/002-task-update/spec.md`の機能仕様

## 概要

タスク一覧から「編集」を選ぶと、登録画面とは別の更新画面で対象タスクの現在値を表示し、タスク名・説明・担当者・期限日を検証して保存する。既存のREST契約に沿って`GET /api/tasks/{taskId}`と`PUT /api/tasks/{taskId}`を提供し、更新失敗時は部分更新を残さない。タスク登録の画面・APIは本機能では追加しない。詳細な決定は[research.md](./research.md)、APIは[contracts/task-update-api.md](./contracts/task-update-api.md)を参照する。

## 技術的な前提

**言語・バージョン**: Java 21、TypeScript（既存フロントエンド設定）

**主な依存関係**: Spring Boot 4.1、Spring Data JPA、Flyway、React 19、Vite

**データベース**: PostgreSQL 17。共有タスクモデルとFlywayを使用する。現在のコードにはタスク永続化エンティティとマイグレーションがないため、実装時にデータモデル設計との整合を確認する。

**テスト**: バックエンド: JUnit 5 / Spring MVCテスト。フロントエンド: Node.js `node:test` と Vite SSR。ブラウザー操作は手動で受入確認し、新たなE2E依存は追加しない。

**対象プラットフォーム**: ブラウザー、ローカルおよびCI上のSpring Boot API

**プロジェクト種別**: Webアプリケーション（Reactフロントエンド + Spring Boot REST API）

**性能目標**: 本機能固有の数値目標は未設定。利用者は研修受講者4名であり、新たな性能要件は設けない。

**制約**: 要件に記載された入力検証をバックエンドでも行う。更新画面は登録画面と別の画面にする。タスク新規登録は対象外。M2-01〜M2-10の受け入れ条件ごとにPRを作成し、各PRはチーム憲章の上限（400行・8ファイル）に収める。PR境界・依存関係・テストは[tasks.md](./tasks.md)を参照する。M2-10の担当者更新は要件定義書・機能仕様・データモデル・個別API契約に反映済みであり、実装とテストをPR-10で行う。担当者を変更しない更新では取得した値を送信し、未設定を選んだ場合は`null`を送る。

**規模・対象範囲**: 研修受講者4名、タスク更新の1ユーザーフロー。必須要件の更新のみ。

## チーム憲章の確認

*確認ゲート: フェーズ0の前とフェーズ1の後に確認する。*

### フェーズ0の前

- **仕様先行**: 更新画面の構成は確認事項で確定済み。入力制約と対象不在時の挙動は仕様化済み。適合。
- **変更責任・レビュー可能性**: 既存の技術構成とAPI契約に沿い、理解・検証可能な小さな変更にする。適合。
- **範囲とPR上限**: 登録操作は追加しない。API・永続化と画面の変更規模を実装時に見積もり、400行または8ファイルを超える場合は複数PRに分ける。適合（実装時に確認）。
- **テストと安全**: バックエンド／フロントエンドの対象テストを追加し、本番DBを使用しない。適合。

### フェーズ1の後

- **データ整合性**: 更新を一処理として行い、検証失敗・対象不在で変更を残さない設計。適合。
- **範囲**: 登録・削除・追加機能は契約に含めない。適合。
- **実装依存関係**: 現在のタスクAPIは一覧が空配列を返すスケルトンで、永続化層も未実装。更新対象となる既存レコードの供給はタスク登録機能に依存する。登録機能は本機能に追加せず、テストはタスクデータを用意した状態で行う。この依存関係を実装開始前に確認する。

## プロジェクト構成

### 本機能の文書

```text
specs/002-task-update/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── task-update-api.md
```

`tasks.md`はM2-01〜M2-10の受け入れ条件ごとのPR単位、検証作業、依存関係を定義する。

### ソースコード（リポジトリルート）

```text
backend/
├── src/main/java/com/example/backend/task/
│   ├── TaskSkeletonController.java
│   ├── TaskUpdateRequest.java
│   ├── TaskEntity.java
│   ├── TaskRepository.java
│   └── TaskService.java
├── src/main/resources/db/migration/
└── src/test/java/com/example/backend/
    └── TaskUpdateControllerTests.java

frontend/
├── src/App.tsx
├── src/features/tasks/taskApi.ts
└── test/app.test.mjs
```

**構成上の決定**: 既存の単一ReactアプリとSpring Bootの`task`パッケージを継続する。更新画面は`App.tsx`上で登録画面と別の表示状態として実装し、ルーター依存を新規追加しない。APIと永続化は既存設計のREST/JPA/Flywayに従う。既存スケルトンに永続化層がないため、登録機能との共有モデル境界を着手前に確認する。
