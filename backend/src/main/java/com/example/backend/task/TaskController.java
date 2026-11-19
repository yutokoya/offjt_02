package com.example.backend.task;

import java.net.URI;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
	 * 保存済みタスクの一覧を返します。
	 *
	 * @return 通常一覧に表示するタスク
	 */
	@GetMapping
	public TaskListResponse listTasks() {
		return taskService.listTasks();
	}

	/**
	 * 保存済みタスクを返します。
	 *
	 * @param taskId 取得対象のタスクID
	 * @return 対象のタスク。存在しない場合は404
	 */
	@GetMapping("/{taskId}")
	public ResponseEntity<TaskListResponse.TaskSummary> getTask(@PathVariable Long taskId) {
		Optional<TaskListResponse.TaskSummary> task = taskService.getTask(taskId);
		return task.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
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
	 * タスクの入力検証エラーを共通形式で返します。
	 *
	 * @param exception 入力項目ごとの検証エラー
	 * @return 400と共通エラー応答
	 */
	@ExceptionHandler(TaskService.TaskValidationException.class)
	public ResponseEntity<Map<String, Object>> handleValidationError(
			TaskService.TaskValidationException exception) {
		return ResponseEntity.badRequest().body(Map.of(
				"code", "VALIDATION_ERROR",
				"message", exception.getMessage(),
				"fieldErrors", exception.fieldErrors()));
	}

	/**
	 * タスクを更新します。
	 *
	 * @param taskId 更新対象のタスクID
	 * @param request 更新するタスク情報
	 * @return 更新後のタスク。対象が存在しない場合は404
	 */
	@PutMapping("/{taskId}")
	public ResponseEntity<TaskListResponse.TaskSummary> updateTask(
			@PathVariable Long taskId,
			@RequestBody TaskUpdateRequest request) {
		return taskService.updateTask(taskId, request)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
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
