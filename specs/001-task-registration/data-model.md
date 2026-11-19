# データモデル: タスク登録

本機能は共通タスクモデルに新しい業務エンティティを追加しない。テーブルと共通項目は[共通データモデル](../../docs/design/data-model.md)に従う。

## エンティティ: Task（タスク）

| 属性 | 意味 | 登録時の規則 |
|---|---|---|
| `taskId` | タスクの一意な識別子 | データベースで採番する |
| `taskName` | タスク名 | 必須。前後のUnicode空白を除去して保存し、除去後1〜100 Unicodeコードポイント |
| `description` | 説明 | 任意。省略または`null`は未入力として扱い、入力値は最大200 Unicodeコードポイント |
| `assigneeName` | 担当者名 | 任意の自由入力。省略または`null`は未割当として保存する |
| `dueDate` | 期限日 | 必須。`YYYY-MM-DD`形式の実在日付。過去日も許可する |
| `deletedAt` | 論理削除日時 | 新規登録時は`null`。削除操作は本機能で行わない |

## 永続化

- テーブル名は`tasks`とし、Flywayマイグレーションで作成する。
- `task_id`はidentityの主キー、`task_name`はNOT NULL、`description`と`assignee_name`はNULL可、`due_date`はNOT NULLとする。
- `task_name`のDB上限は100文字、`description`は200文字とする。アプリケーションでもコードポイント数を検証し、タスク名は保存前に空白除去する。
- 共通モデルとの整合のため`deleted_at`列を用意する。通常の一覧は`deleted_at IS NULL`のタスクだけを返す。
- 登録処理は検証済みの全項目を1回の永続化処理で保存する。検証または保存に失敗した場合、部分的なTaskを残さない。

## 入力から保存値への変換

| 入力 | 保存値 |
|---|---|
| `taskName` | Unicode空白を前後から除去した値。除去後が空なら拒否 |
| `description`省略または`null` | `null` |
| `assigneeName`省略または`null` | `null` |
| `dueDate` | 検証済みの`LocalDate` |
| `deletedAt` | `null` |

空文字の説明・担当者を受信した場合も任意項目として保存できる。画面で未入力の場合は`null`として送信する。

## 整合性

- `taskId`は登録後に不変であり、API応答のTaskと`Location`ヘッダーに使用する。
- 登録失敗時に一覧へ仮のTaskを追加しない。
- 登録成功後はAPIが返す保存済みTaskを一覧の状態へ追加する。データベースの一覧取得結果にも同じTaskが含まれる。
- 本機能はタスク更新、論理削除、実績記録、ステータス、依存関係を作成・変更しない。
