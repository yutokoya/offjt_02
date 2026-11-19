package com.example.backend.task;

import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

	private final TaskRepository taskRepository;

	public TaskService(TaskRepository taskRepository) {
		this.taskRepository = taskRepository;
	}

	@Transactional
	public TaskListResponse.TaskSummary registerTask(TaskRegistrationRequest request) {
		TaskEntity task = new TaskEntity(
				request.taskName(),
				request.description(),
				request.assigneeName(),
				LocalDate.parse(request.dueDate()));
		TaskEntity savedTask = taskRepository.save(task);
		return new TaskListResponse.TaskSummary(
				savedTask.getTaskId(),
				savedTask.getTaskName(),
				savedTask.getDescription(),
				savedTask.getAssigneeName(),
				savedTask.getDueDate().toString());
	}
}
