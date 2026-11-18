package com.example.backend.task;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskSkeletonController {

	@GetMapping
	public TaskListResponse listTasks() {
		return new TaskListResponse(List.of());
	}

	@PostMapping
	public ResponseEntity<String> registerTask(@RequestBody TaskRegistrationRequest request) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク登録の業務処理はこれから実装します。");
	}
}
