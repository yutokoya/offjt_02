# 実装計画: タスク削除

**ブランチ**: `003-task-delete` | **日付**: 2026-11-18 | **仕様**: [spec.md](./spec.md)

**入力**: `specs/003-task-delete/spec.md`の機能仕様

## 概要

タスク一覧から削除操作を選ぶと対象名を示す確認を表示し、確定時のみ`DELETE /api/tasks/{taskId}`を呼び出す。バックエンドは対象を論理削除し、一覧から除外する。既存のAPI・データモデル契約に従い、対象タスクに接続する依存関係を除去し、実績記録と無関係な依存関係を保持する。確認キャンセルではAPIを呼ばない。タスク登録は本機能に含めない。詳細は[research.md](./research.md)と[contracts/task-delete-api.md](./contracts/task-delete-api.md)を参照する。

## 技術的な前提

**言語・バージョン**: Java 21、TypeScript（既存フロントエンド設定）

**主な依存関係**: Spring Boot 4.1、Spring Data JPA、Flyway、React 19、Vite

**データベース**: PostgreSQL 17。共有タスクモデルとFlywayを使用する。現在のコードにはタスク永続化層やマイグレーションがないため、既存設計との統合が必要。

**テスト**: バックエンド: JUnit 5 / Spring MVCテスト。フロントエンド: Node.js `node:test` と Vite SSR。jsdomでAppをマウントし、削除後の一覧再取得と画面表示も検証する。確認・キャンセルの画面操作は手動で受入確認し、新たなE2Eフレームワークは追加しない。

**対象プラットフォーム**: ブラウザー、ローカルおよびCI上のSpring Boot API

**プロジェクト種別**: Webアプリケーション（Reactフロントエンド + Spring Boot REST API）

**性能目標**: 本機能固有の数値目標は未設定。利用者は研修受講者4名であり、新たな性能要件は設けない。

**制約**: 削除は論理削除とし、確認後にのみ実行する。依存関係の削除とタスクの論理削除は同一処理として扱い、実績記録を保持する。登録・復元は対象外。M3-01〜M3-06の受け入れ条件ごとにPRを作成し、各PRはチーム憲章の上限（400行・8ファイル）に収める。PR境界・依存関係・テストは[tasks.md](./tasks.md)を参照する。S3-11の依存関係整理は、削除の原子性を保証するM3-02のPRに含める。

**規模・対象範囲**: 研修受講者4名、タスク削除の1ユーザーフロー。必須要件M3を中心に、既存設計のS3-11削除整合性を適用する。

## チーム憲章の確認

*確認ゲート: フェーズ0の前とフェーズ1の後に確認する。*

### フェーズ0の前

- **仕様先行**: 対象確認、確定、キャンセル、削除後一覧、対象不在の振る舞いが仕様化済み。適合。
- **変更責任・レビュー可能性**: 既存の技術構成と採用済みAPI・データモデル設計を使い、レビュー可能な変更にする。適合。
- **範囲とPR上限**: 登録・復元は追加しない。変更規模が400行または8ファイルを超える場合は複数PRに分割する。適合（実装時に確認）。
- **テストと安全**: キャンセル時にAPIを呼ばないこと、削除失敗時に他データを変えないことを検証し、本番DBを使用しない。適合。

### フェーズ1の後

- **データ整合性**: タスクの論理削除と依存関係の整理を一処理として行い、実績記録を保持する。適合。
- **範囲**: 画面の確認・確定・キャンセル、削除API、一覧除外に限定する。タスク登録は含めない。適合。
- **実装依存関係**: 現在のタスクAPIは一覧が空配列を返すスケルトンで、永続化層・依存関係モデルも未実装。対象タスクと関連データを提供する共通基盤が必要である。これらを別機能・共通基盤と統合し、削除機能に登録処理を追加しない。

## プロジェクト構成

### 本機能の文書

```text
specs/003-task-delete/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── task-delete-api.md
```

`tasks.md`はM3-01〜M3-06の受け入れ条件ごとのPR単位、検証作業、依存関係を定義する。

### ソースコード（リポジトリルート）

```text
backend/
├── src/main/java/com/example/backend/task/
│   ├── TaskController.java
│   ├── TaskEntity.java
│   ├── TaskRepository.java
│   ├── TaskService.java
│   └── TaskDependencyRepository.java
├── src/main/resources/db/migration/
└── src/test/java/com/example/backend/
    └── TaskDeleteControllerTests.java

frontend/
├── src/App.tsx
├── src/features/tasks/taskApi.ts
└── test/app.test.mjs
```

**構成上の決定**: 既存の単一ReactアプリとSpring Bootの`task`パッケージを継続する。削除確認は新たな画面ライブラリを追加せず既存画面から開始し、削除処理はAPIとサービス層に集約する。現状のスケルトンには共通永続化層がないため、登録・依存関係機能とのモデル共有を着手前に確認する。
