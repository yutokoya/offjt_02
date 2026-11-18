package com.example.backend.task;

import java.util.List;

public record TaskListResponse(List<TaskSummary> items) {

	public record TaskSummary(
			Long taskId,
			String taskName,
			String description,
			String assigneeName,
			String dueDate) {
	}
}
