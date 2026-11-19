package com.example.backend.task;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
	public ResponseEntity<String> registerTask(@RequestBody TaskRegistrationRequest request) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク登録の業務処理はこれから実装します。");
	}

	@PutMapping("/{taskId}")
	public ResponseEntity<String> updateTask(
			@PathVariable Long taskId,
			@RequestBody TaskUpdateRequest request) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク更新の業務処理はこれから実装します。");
	}

	/**
	 * タスク削除APIのスケルトンを提供します。
	 *
	 * @param taskId 削除対象のタスクID
	 * @return 削除処理が未実装であることを示す応答
	 */
	@DeleteMapping("/{taskId}")
	public ResponseEntity<String> deleteTask(@PathVariable Long taskId) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク削除の業務処理はこれから実装します。");
	}
}
