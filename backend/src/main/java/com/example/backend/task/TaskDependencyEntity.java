package com.example.backend.task;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/**
 * 先行タスクと後続タスクの依存関係を表すエンティティです。
 */
@Entity
@Table(name = "task_dependencies")
public class TaskDependencyEntity {

	@EmbeddedId
	private TaskDependencyId id;

	protected TaskDependencyEntity() {
	}

	/**
	 * 指定した先行タスクと後続タスクの依存関係を生成します。
	 *
	 * @param predecessorTaskId 先行タスクID
	 * @param successorTaskId 後続タスクID
	 */
	public TaskDependencyEntity(Long predecessorTaskId, Long successorTaskId) {
		this.id = new TaskDependencyId(predecessorTaskId, successorTaskId);
	}

	public TaskDependencyId getId() {
		return id;
	}

	/**
	 * 依存関係の複合主キーです。
	 */
	@Embeddable
	public static class TaskDependencyId implements Serializable {

		@Column(name = "predecessor_task_id")
		private Long predecessorTaskId;

		@Column(name = "successor_task_id")
		private Long successorTaskId;

		protected TaskDependencyId() {
		}

		public TaskDependencyId(Long predecessorTaskId, Long successorTaskId) {
			this.predecessorTaskId = predecessorTaskId;
			this.successorTaskId = successorTaskId;
		}

		public Long getPredecessorTaskId() {
			return predecessorTaskId;
		}

		public Long getSuccessorTaskId() {
			return successorTaskId;
		}

		@Override
		public boolean equals(Object other) {
			if (this == other) {
				return true;
			}
			if (!(other instanceof TaskDependencyId that)) {
				return false;
			}
			return Objects.equals(predecessorTaskId, that.predecessorTaskId)
					&& Objects.equals(successorTaskId, that.successorTaskId);
		}

		@Override
		public int hashCode() {
			return Objects.hash(predecessorTaskId, successorTaskId);
		}
	}
}
