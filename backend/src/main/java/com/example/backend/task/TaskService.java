package com.example.backend.task;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * タスクの登録と一覧取得を行うサービスです。
 */
@Service
public class TaskService {

	private final TaskRepository taskRepository;

	/**
	 * タスク永続化リポジトリを用いてサービスを初期化します。
	 *
	 * @param taskRepository タスク永続化リポジトリ
	 */
	public TaskService(TaskRepository taskRepository) {
		this.taskRepository = taskRepository;
	}

	/**
	 * タスクを永続化し、保存済みの内容を返します。
	 *
	 * @param request 登録するタスク情報
	 * @return 永続化されたタスク
	 */
	@Transactional
	public TaskListResponse.TaskSummary registerTask(TaskRegistrationRequest request) {
		TaskEntity task = new TaskEntity(
				request.taskName(),
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

	private TaskListResponse.TaskSummary toSummary(TaskEntity task) {
		return new TaskListResponse.TaskSummary(
				task.getTaskId(),
				task.getTaskName(),
				task.getDescription(),
				task.getAssigneeName(),
				task.getDueDate().toString());
	}
}
