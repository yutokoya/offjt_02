package com.example.backend.task;

public record TaskUpdateRequest(
		String taskName,
		String description,
		String assigneeName,
		String dueDate) {
}
