package com.example.backend.task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "tasks")
public class TaskEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "task_id")
	private Long taskId;

	@Column(name = "task_name", nullable = false, length = 100)
	private String taskName;

	@Column(name = "description", length = 200)
	private String description;

	@Column(name = "assignee_name", columnDefinition = "text")
	private String assigneeName;

	@Column(name = "due_date", nullable = false)
	private LocalDate dueDate;

	@Column(name = "deleted_at")
	private OffsetDateTime deletedAt;

	protected TaskEntity() {
	}

	TaskEntity(String taskName, String description, String assigneeName, LocalDate dueDate) {
		this.taskName = taskName;
		this.description = description;
		this.assigneeName = assigneeName;
		this.dueDate = dueDate;
	}

	public Long getTaskId() {
		return taskId;
	}

	public String getTaskName() {
		return taskName;
	}

	public String getDescription() {
		return description;
	}

	public String getAssigneeName() {
		return assigneeName;
	}

	public LocalDate getDueDate() {
		return dueDate;
	}

	public OffsetDateTime getDeletedAt() {
		return deletedAt;
	}

	void markDeleted() {
		this.deletedAt = OffsetDateTime.now(ZoneOffset.UTC);
	}
}
