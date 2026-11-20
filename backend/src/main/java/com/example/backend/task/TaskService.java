package com.example.backend.task;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * タスクの登録、一覧取得、個別取得、更新を行うサービスです。
 */
@Service
public class TaskService {

	private static final int MAX_TASK_NAME_CODE_POINTS = 100;
	private static final int MAX_DESCRIPTION_CODE_POINTS = 200;

	private final TaskRepository taskRepository;

	private final TaskDependencyRepository taskDependencyRepository;

	/**
	 * タスク永続化リポジトリを用いてサービスを初期化します。
	 *
	 * @param taskRepository タスク永続化リポジトリ
	 * @param taskDependencyRepository タスク依存関係リポジトリ
	 */
	public TaskService(
			TaskRepository taskRepository,
			TaskDependencyRepository taskDependencyRepository) {
		this.taskRepository = taskRepository;
		this.taskDependencyRepository = taskDependencyRepository;
	}

	/**
	 * タスクを永続化し、保存済みの内容を返します。
	 *
	 * @param request 登録するタスク情報
	 * @return 永続化されたタスク
	 */
	@Transactional
	public TaskListResponse.TaskSummary registerTask(TaskRegistrationRequest request) {
		String taskName = validateRegistration(request);
		TaskEntity task = new TaskEntity(
				taskName,
				request.description(),
				request.assigneeName(),
				LocalDate.parse(request.dueDate()));
		TaskEntity savedTask = taskRepository.save(task);
		return toSummary(savedTask);
	}

	/**
	 * 論理削除されていない保存済みタスクを一覧として返します。
	 *
	 * @return 通常一覧に表示するタスク
	 */
	@Transactional(readOnly = true)
	public TaskListResponse listTasks() {
		List<TaskListResponse.TaskSummary> items = taskRepository.findAll().stream()
				.filter(task -> task.getDeletedAt() == null)
				.map(this::toSummary)
				.toList();
		return new TaskListResponse(items);
	}

	private String validateRegistration(TaskRegistrationRequest request) {
		Map<String, String> fieldErrors = new LinkedHashMap<>();
		String taskName = request.taskName();
		String description = request.description();
		String dueDate = request.dueDate();
		String normalizedTaskName = taskName == null ? null : taskName.strip();
		if (taskName == null || taskName.isBlank()) {
			fieldErrors.put("taskName", "タスク名は必須です。");
		} else if (normalizedTaskName.codePointCount(0, normalizedTaskName.length())
				> MAX_TASK_NAME_CODE_POINTS) {
			fieldErrors.put("taskName", "タスク名は100文字以内で入力してください。");
		}
		if (description != null
				&& description.codePointCount(0, description.length()) > MAX_DESCRIPTION_CODE_POINTS) {
			fieldErrors.put("description", "説明は200文字以内で入力してください。");
		}
		if (dueDate == null || dueDate.isBlank()) {
			fieldErrors.put("dueDate", "期限日は必須です。");
		} else if (!isValidDueDate(dueDate)) {
			fieldErrors.put("dueDate", "期限日はYYYY-MM-DD形式の実在する日付を入力してください。");
		}
		if (!fieldErrors.isEmpty()) {
			throw new TaskValidationException(fieldErrors);
		}
		return normalizedTaskName;
	}

	private boolean isValidDueDate(String dueDate) {
		if (!dueDate.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) {
			return false;
		}
		try {
			LocalDate.parse(dueDate);
			return true;
		} catch (DateTimeParseException exception) {
			return false;
		}
	}

	/**
	 * 論理削除されていないタスクをIDで取得します。
	 *
	 * @param taskId 取得対象のタスクID
	 * @return 対象のタスク。存在しない場合または論理削除済みの場合は空
	 */
	@Transactional(readOnly = true)
	public Optional<TaskListResponse.TaskSummary> getTask(Long taskId) {
		return taskRepository.findById(taskId)
				.filter(task -> task.getDeletedAt() == null)
				.map(this::toSummary);
	}

	/**
	 * タスクを論理削除します。
	 *
	 * @param taskId 削除対象のタスクID
	 * @return 対象タスクが存在し、未削除の場合は`true`
	 */
	@Transactional
	public boolean deleteTask(Long taskId) {
		Optional<TaskEntity> task = taskRepository.findById(taskId)
				.filter(entity -> entity.getDeletedAt() == null);
		if (task.isEmpty()) {
			return false;
		}

		taskDependencyRepository.deleteConnectedToTask(taskId);
		task.get().markDeleted();
		return true;
  }

  /**
	 * 指定されたタスクの編集可能な項目を更新します。
	 *
	 * @param taskId 更新対象のタスクID
	 * @param request 更新するタスク情報
	 * @return 更新後のタスク。対象が存在しない場合は空
	 */
	@Transactional
	public Optional<TaskListResponse.TaskSummary> updateTask(Long taskId, TaskUpdateRequest request) {
		validateUpdateRequiredFields(request);
		return taskRepository.findById(taskId)
				.map(task -> {
					task.update(
							request.taskName(),
							request.description() == null ? "" : request.description(),
							request.assigneeName(),
							LocalDate.parse(request.dueDate()));
					return toSummary(task);
				});
	}

	private void validateUpdateRequiredFields(TaskUpdateRequest request) {
		Map<String, String> fieldErrors = new LinkedHashMap<>();
		if (request.taskName() == null || request.taskName().isBlank()) {
			fieldErrors.put("taskName", "タスク名は必須です。");
		}
		if (request.dueDate() == null || request.dueDate().isBlank()) {
			fieldErrors.put("dueDate", "期限日は必須です。");
		}
		if (!fieldErrors.isEmpty()) {
			throw new TaskValidationException(fieldErrors);
		}
	}

	private TaskListResponse.TaskSummary toSummary(TaskEntity task) {
		return new TaskListResponse.TaskSummary(
				task.getTaskId(),
				task.getTaskName(),
				task.getDescription(),
				task.getAssigneeName(),
				task.getDueDate().toString());
	}

	static final class TaskValidationException extends RuntimeException {

		private final Map<String, String> fieldErrors;

		TaskValidationException(Map<String, String> fieldErrors) {
			super("入力内容を確認してください。");
			this.fieldErrors = Map.copyOf(fieldErrors);
		}

		Map<String, String> fieldErrors() {
			return fieldErrors;
		}
	}
}
