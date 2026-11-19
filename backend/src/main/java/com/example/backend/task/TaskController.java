package com.example.backend.task;

import java.net.URI;
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

/**
 * タスクのREST APIを提供するコントローラーです。
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

	private final TaskService taskService;

	/**
	 * タスク登録サービスを用いてコントローラーを初期化します。
	 *
	 * @param taskService タスク登録サービス
	 */
	public TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	/**
	 * タスク一覧APIの現在のスケルトン応答を返します。
	 *
	 * @return 空のタスク一覧
	 */
	@GetMapping
	public TaskListResponse listTasks() {
		return new TaskListResponse(List.of());
	}

	/**
	 * タスク取得APIの未実装応答を返します。
	 *
	 * @param taskId 取得対象のタスクID
	 * @return 未実装を示す応答
	 */
	@GetMapping("/{taskId}")
	public ResponseEntity<String> getTask(@PathVariable Long taskId) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク取得の業務処理はこれから実装します。");
	}

	/**
	 * タスクを登録します。
	 *
	 * @param request 登録するタスク情報
	 * @return 作成したタスクとLocationを含む201応答
	 */
	@PostMapping
	public ResponseEntity<TaskListResponse.TaskSummary> registerTask(
			@RequestBody TaskRegistrationRequest request) {
		TaskListResponse.TaskSummary task = taskService.registerTask(request);
		return ResponseEntity
				.created(URI.create("/api/tasks/" + task.taskId()))
				.body(task);
	}

	/**
	 * タスク更新APIの未実装応答を返します。
	 *
	 * @param taskId 更新対象のタスクID
	 * @param request 更新するタスク情報
	 * @return 未実装を示す応答
	 */
	@PutMapping("/{taskId}")
	public ResponseEntity<String> updateTask(
			@PathVariable Long taskId,
			@RequestBody TaskUpdateRequest request) {
		return ResponseEntity
				.status(HttpStatus.NOT_IMPLEMENTED)
				.body("タスク更新の業務処理はこれから実装します。");
	}

	/**
	 * タスク削除APIの未実装応答を返します。
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
