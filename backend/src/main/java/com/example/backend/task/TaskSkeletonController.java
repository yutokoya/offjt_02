package com.example.backend.task;

import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskSkeletonController {

	private final TaskService taskService;

	public TaskSkeletonController(TaskService taskService) {
		this.taskService = taskService;
	}

	@GetMapping
	public TaskListResponse listTasks() {
		return new TaskListResponse(List.of());
	}

	@GetMapping("/{taskId}")
	public ResponseEntity<String> getTask(@PathVariable Long taskId) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク取得の業務処理はこれから実装します。");
	}

	@PostMapping
	public ResponseEntity<TaskListResponse.TaskSummary> registerTask(
			@RequestBody TaskRegistrationRequest request) {
		TaskListResponse.TaskSummary task = taskService.registerTask(request);
		return ResponseEntity
				.created(URI.create("/api/tasks/" + task.taskId()))
				.body(task);
	}

	@PutMapping("/{taskId}")
	public ResponseEntity<String> updateTask(
			@PathVariable Long taskId,
			@RequestBody TaskUpdateRequest request) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク更新の業務処理はこれから実装します。");
	}
}
