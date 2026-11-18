package com.example.backend.task;

public record TaskRegistrationRequest(
		String taskName,
		String description,
		String assigneeName,
		String dueDate) {
}
