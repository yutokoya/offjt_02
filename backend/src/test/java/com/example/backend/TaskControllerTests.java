package com.example.backend;

import com.example.backend.task.TaskDependencyEntity;
import com.example.backend.task.TaskDependencyRepository;
import com.example.backend.task.TaskEntity;
import com.example.backend.task.TaskRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TaskRepository taskRepository;

	@Autowired
	private TaskDependencyRepository taskDependencyRepository;

	/**
	 * タスク削除が204を返し、対象タスクに論理削除日時が設定されることを確認する。
	 */
	@Test
	@Transactional
	void deletingTaskReturnsNoContentAndSetsDeletedAt() throws Exception {
		String taskName = "PR-02 deletion " + UUID.randomUUID();
		MvcResult createdResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "To be deleted",
								  "assigneeName": "Participant",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isCreated())
				.andReturn();
		String location = createdResult.getResponse().getHeader("Location");
		assertThat(location).isNotNull();
		long taskId = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));

		mockMvc.perform(delete(location))
				.andExpect(status().isNoContent())
				.andExpect(content().string(""));

		TaskEntity deletedTask = taskRepository.findById(taskId).orElseThrow();
		assertThat(deletedTask.getDeletedAt()).isNotNull();
	}

	/**
	 * 削除後の一覧APIでは対象が除外され、未削除のタスクは引き続き取得できることを確認する。
	 */
	@Test
	@Transactional
	void deletedTasksAreOmittedFromListAfterDeletion() throws Exception {
		long deletedTaskId = createTask("PR-04 deleted task");
		long activeTaskId = createTask("PR-04 active task");

		mockMvc.perform(delete("/api/tasks/" + deletedTaskId))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[?(@.taskId == " + deletedTaskId + ")]").isEmpty())
				.andExpect(jsonPath("$.items[?(@.taskId == " + activeTaskId + ")]").exists());
	}

	/**
	 * 一覧取得だけではタスクや依存関係が変更されないことを確認する。
	 */
	@Test
	@Transactional
	void listingTasksDoesNotChangeTaskOrRelatedDependencies() throws Exception {
		long predecessorTaskId = createTask("PR-05 predecessor");
		long successorTaskId = createTask("PR-05 successor");
		TaskDependencyEntity dependency =
				new TaskDependencyEntity(predecessorTaskId, successorTaskId);
		taskDependencyRepository.save(dependency);
		TaskEntity taskBeforeList = taskRepository.findById(predecessorTaskId).orElseThrow();

		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[?(@.taskId == " + predecessorTaskId + ")]").exists())
				.andExpect(jsonPath("$.items[?(@.taskId == " + successorTaskId + ")]").exists());

		TaskEntity taskAfterList = taskRepository.findById(predecessorTaskId).orElseThrow();
		assertThat(taskAfterList.getTaskName()).isEqualTo(taskBeforeList.getTaskName());
		assertThat(taskAfterList.getDescription()).isEqualTo(taskBeforeList.getDescription());
		assertThat(taskAfterList.getAssigneeName()).isEqualTo(taskBeforeList.getAssigneeName());
		assertThat(taskAfterList.getDueDate()).isEqualTo(taskBeforeList.getDueDate());
		assertThat(taskAfterList.getDeletedAt()).isNull();
		assertThat(taskDependencyRepository.findAll()).singleElement()
				.satisfies(savedDependency ->
						assertThat(savedDependency.getId()).isEqualTo(dependency.getId()));
	}

	/**
	 * 削除対象に接続する依存関係だけが削除され、無関係な依存関係は保持されることを確認する。
	 */
	@Test
	@Transactional
	void deletingTaskRemovesDependenciesConnectedToIt() throws Exception {
		long predecessorTaskId = createTask("PR-02 predecessor");
		long targetTaskId = createTask("PR-02 target");
		long successorTaskId = createTask("PR-02 successor");
		long unrelatedPredecessorTaskId = createTask("PR-02 unrelated predecessor");
		long unrelatedSuccessorTaskId = createTask("PR-02 unrelated successor");
		taskDependencyRepository.save(new TaskDependencyEntity(predecessorTaskId, targetTaskId));
		taskDependencyRepository.save(new TaskDependencyEntity(targetTaskId, successorTaskId));
		taskDependencyRepository.save(
				new TaskDependencyEntity(unrelatedPredecessorTaskId, unrelatedSuccessorTaskId));

		mockMvc.perform(delete("/api/tasks/" + targetTaskId))
				.andExpect(status().isNoContent());

		assertThat(taskDependencyRepository.findAll()).singleElement()
				.satisfies(dependency -> assertThat(dependency.getId().getPredecessorTaskId())
						.isEqualTo(unrelatedPredecessorTaskId))
				.satisfies(dependency -> assertThat(dependency.getId().getSuccessorTaskId())
						.isEqualTo(unrelatedSuccessorTaskId));
	}

	/**
	 * 存在しないタスクの削除が404となり、依存関係や他のタスクが変更されないことを確認する。
	 */
	@Test
	@Transactional
	void failedDeletionDoesNotRemoveDependenciesOrChangeAnotherTask() throws Exception {
		long predecessorTaskId = createTask("PR-02 failed predecessor");
		long successorTaskId = createTask("PR-02 failed successor");
		taskDependencyRepository.save(new TaskDependencyEntity(predecessorTaskId, successorTaskId));

		mockMvc.perform(delete("/api/tasks/999999999"))
				.andExpect(status().isNotFound());

		assertThat(taskDependencyRepository.findAll()).singleElement()
				.satisfies(dependency -> assertThat(dependency.getId().getPredecessorTaskId())
						.isEqualTo(predecessorTaskId))
				.satisfies(dependency -> assertThat(dependency.getId().getSuccessorTaskId())
						.isEqualTo(successorTaskId));
		assertThat(taskRepository.findById(predecessorTaskId)).isPresent()
				.get()
				.extracting(TaskEntity::getDeletedAt)
				.isNull();
	}

	private long createTask(String taskName) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "",
								  "assigneeName": null,
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName + " " + UUID.randomUUID())))
				.andExpect(status().isCreated())
				.andReturn();
		String location = result.getResponse().getHeader("Location");
		assertThat(location).isNotNull();
		return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
	}

	/**
	 * 有効なタスク登録で201応答とLocation、作成タスクの内容が返り、同じ内容がDBに保存されることを確認する。
	 */
	@Test
	@Transactional
	void registeringValidTaskPersistsAndReturnsCreatedTask() throws Exception {
		String taskName = "PR-02 registration " + UUID.randomUUID();
		MvcResult result = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Persisted description",
								  "assigneeName": "Participant",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isCreated())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.taskName").value(taskName))
				.andExpect(jsonPath("$.description").value("Persisted description"))
				.andExpect(jsonPath("$.assigneeName").value("Participant"))
				.andExpect(jsonPath("$.dueDate").value("2026-11-19"))
				.andReturn();

		TaskEntity savedTask = taskRepository.findAll().stream()
				.filter(task -> task.getTaskName().equals(taskName))
				.findFirst()
				.orElseThrow();

		assertThat(result.getResponse().getHeader("Location"))
				.isEqualTo("/api/tasks/" + savedTask.getTaskId());
		jsonPath("$.taskId").value(savedTask.getTaskId())
				.match(result);
		assertThat(savedTask.getDescription()).isEqualTo("Persisted description");
		assertThat(savedTask.getAssigneeName()).isEqualTo("Participant");
		assertThat(savedTask.getDueDate().toString()).isEqualTo("2026-11-19");
	}

	/**
	 * 登録したタスクが一覧APIからも取得できることを確認する。
	 */
	@Test
	@Transactional
	void registeredTaskIsIncludedInTaskList() throws Exception {
		String taskName = "PR-04 task list " + UUID.randomUUID();
		MvcResult createdResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Persisted description",
								  "assigneeName": "Participant",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isCreated())
				.andReturn();
		String location = createdResult.getResponse().getHeader("Location");
		assertThat(location).isNotNull();
		String taskId = location.substring(location.lastIndexOf('/') + 1);

		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.items[?(@.taskId == " + taskId + ")]").isNotEmpty())
				.andExpect(jsonPath("$.items[?(@.taskName == '" + taskName
						+ "')].assigneeName").value(org.hamcrest.Matchers.contains("Participant")));
	}

	/**
	 * 担当者を省略またはnullにした登録は未割当として保存し、登録応答と一覧応答で返すことを確認する。
	 */
	@Test
	@Transactional
	void registeringTaskWithoutAssigneeStoresNullAndReturnsItInResponses() throws Exception {
		for (boolean includeNullAssignee : new boolean[] {false, true}) {
			String taskName = "PR-09 unassigned " + UUID.randomUUID();
			String assigneeProperty = includeNullAssignee ? ",\n  \"assigneeName\": null" : "";
			MvcResult createdResult = mockMvc.perform(post("/api/tasks")
							.contentType(MediaType.APPLICATION_JSON)
							.content("""
									{
									  "taskName": "%s",
									  "description": ""%s,
									  "dueDate": "2026-11-19"
									}
									""".formatted(taskName, assigneeProperty)))
					.andExpect(status().isCreated())
					.andExpect(jsonPath("$.assigneeName")
							.value(org.hamcrest.Matchers.nullValue()))
					.andReturn();
			String location = createdResult.getResponse().getHeader("Location");
			assertThat(location).isNotNull();
			long taskId = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
			TaskEntity savedTask = taskRepository.findById(taskId).orElseThrow();
			assertThat(savedTask.getAssigneeName()).isNull();

			mockMvc.perform(get("/api/tasks"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.items[?(@.taskId == " + taskId + ")]").isNotEmpty())
					.andExpect(jsonPath("$.items[?(@.taskId == " + taskId
							+ ")].assigneeName").value(org.hamcrest.Matchers.contains(
									org.hamcrest.Matchers.nullValue())));
		}
	}

	/**
	 * 必須項目の検証エラーは保存されず、既存タスクも変更しないことを確認する。
	 */
	@Test
	@Transactional
	void requiredTaskFieldsReturnValidationErrorsWithoutSaving() throws Exception {
		String existingTaskName = "Existing task " + UUID.randomUUID();
		MvcResult existingResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "  %s  ",
								  "description": "Existing description",
								  "assigneeName": "Participant",
								  "dueDate": "2026-11-19"
								}
								""".formatted(existingTaskName)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.taskName").value(existingTaskName))
				.andReturn();
		String location = existingResult.getResponse().getHeader("Location");
		assertThat(location).isNotNull();
		long existingTaskId = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
		long taskCountBeforeInvalidRequests = taskRepository.count();

		assertValidationError(
				"""
				{
				  "dueDate": "2026-11-19"
				}
				""",
				"taskName",
				"タスク名は必須です。");
		assertValidationError(
				"""
				{
				  "taskName": "   ",
				  "dueDate": "2026-11-19"
				}
				""",
				"taskName",
				"タスク名は必須です。");
		assertValidationError(
				"""
				{
				  "taskName": "Missing due date"
				}
				""",
				"dueDate",
				"期限日は必須です。");

		assertThat(taskRepository.count()).isEqualTo(taskCountBeforeInvalidRequests);
		assertThat(taskRepository.findById(existingTaskId).orElseThrow().getTaskName())
				.isEqualTo(existingTaskName);
	}

	/**
	 * タスク名をUnicodeコードポイント数で判定し、100文字を受け付け101文字を拒否することを確認する。
	 */
	@Test
	@Transactional
	void taskNameLengthUsesUnicodeCodePointsAndRejectsOverLimit() throws Exception {
		String validTaskName = "a".repeat(98) + "\uD83D\uDE00".repeat(2);
		String paddedTaskName = "\u3000" + validTaskName + "\u3000";
		MvcResult createdResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "dueDate": "2026-11-19"
								}
								""".formatted(paddedTaskName)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.taskName").value(validTaskName))
				.andReturn();
		String location = createdResult.getResponse().getHeader("Location");
		assertThat(location).isNotNull();
		long taskCountAfterValidRegistration = taskRepository.count();
		String invalidTaskName = "a".repeat(99) + "\uD83D\uDE00".repeat(2);

		mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "dueDate": "2026-11-19"
								}
								""".formatted(invalidTaskName)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.taskName")
						.value("タスク名は100文字以内で入力してください。"));

		assertThat(taskRepository.count()).isEqualTo(taskCountAfterValidRegistration);
	}

	/**
	 * 説明をUnicodeコードポイント数で判定し、200文字を受け付け201文字を拒否することを確認する。
	 */
	@Test
	@Transactional
	void descriptionLengthUsesUnicodeCodePointsAndRejectsOverLimit() throws Exception {
		String validDescription = " " + "a".repeat(197) + "\uD83D\uDE00".repeat(2);
		MvcResult createdResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "Description length boundary",
								  "description": "%s",
								  "dueDate": "2026-11-19"
								}
								""".formatted(validDescription)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.description").value(validDescription))
				.andReturn();
		assertThat(createdResult.getResponse().getHeader("Location")).isNotNull();
		long taskCountAfterValidRegistration = taskRepository.count();
		String invalidDescription = "a".repeat(199) + "\uD83D\uDE00".repeat(2);

		assertValidationError(
				"""
				{
				  "taskName": "Description over limit",
				  "description": "%s",
				  "dueDate": "2026-11-19"
				}
				""".formatted(invalidDescription),
				"description",
				"説明は200文字以内で入力してください。");

		assertThat(taskRepository.count()).isEqualTo(taskCountAfterValidRegistration);
	}

	/**
	 * 不正な期限日の形式と実在しない日付を拒否し、過去の実在日は登録できることを確認する。
	 */
	@Test
	@Transactional
	void dueDateValidationRejectsInvalidDatesAndAllowsPastDates() throws Exception {
		long taskCountBeforeInvalidRequests = taskRepository.count();
		String invalidDateMessage = "期限日はYYYY-MM-DD形式の実在する日付を入力してください。";

		assertValidationError(
				"""
				{
				  "taskName": "Invalid date format",
				  "dueDate": "2026-2-01"
				}
				""",
				"dueDate",
				invalidDateMessage);
		assertValidationError(
				"""
				{
				  "taskName": "Nonexistent date",
				  "dueDate": "2026-02-30"
				}
				""",
				"dueDate",
				invalidDateMessage);
		assertThat(taskRepository.count()).isEqualTo(taskCountBeforeInvalidRequests);

		mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "Valid past date",
								  "dueDate": "1900-02-28"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.dueDate").value("1900-02-28"));

		assertThat(taskRepository.count()).isEqualTo(taskCountBeforeInvalidRequests + 1);
	}

	private void assertValidationError(
			String requestBody,
			String field,
			String expectedFieldMessage) throws Exception {
		mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.message").value("入力内容を確認してください。"))
				.andExpect(jsonPath("$.fieldErrors." + field).value(expectedFieldMessage));
	}

	/**
	 * 保存済みタスクの個別取得で全ての現在値が返ることを確認する。
	 */
	@Test
	@Transactional
	void gettingExistingTaskReturnsItsCurrentValues() throws Exception {
		String taskName = "PR-01 task detail " + UUID.randomUUID();
		MvcResult createdResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Current description",
								  "assigneeName": "Participant",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isCreated())
				.andReturn();
		String location = createdResult.getResponse().getHeader("Location");
		assertThat(location).isNotNull();

		mockMvc.perform(get(location))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.taskName").value(taskName))
				.andExpect(jsonPath("$.description").value("Current description"))
				.andExpect(jsonPath("$.assigneeName").value("Participant"))
				.andExpect(jsonPath("$.dueDate").value("2026-11-19"));
	}

	/**
	 * 存在しないタスクの個別取得で404を返すことを確認する。
	 */
	@Test
	void gettingMissingTaskReturnsNotFound() throws Exception {
		mockMvc.perform(get("/api/tasks/0"))
				.andExpect(status().isNotFound());
	}

	/**
	 * 有効な更新が同じタスクIDのレコードだけを更新し、要求された全項目を返すことを確認する。
	 */
	@Test
	@Transactional
	void updatingTaskPersistsAllFieldsWithoutCreatingOrChangingOtherTasks() throws Exception {
		long initialTaskCount = taskRepository.count();
		String taskName = "PR-02 update target " + UUID.randomUUID();
		MvcResult targetResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Original description",
								  "assigneeName": "Original assignee",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isCreated())
				.andReturn();
		MvcResult otherResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Other description",
								  "assigneeName": "Other assignee",
								  "dueDate": "2026-11-20"
								}
								""".formatted(taskName + " other")))
				.andExpect(status().isCreated())
				.andReturn();
		String targetLocation = targetResult.getResponse().getHeader("Location");
		String otherLocation = otherResult.getResponse().getHeader("Location");
		assertThat(targetLocation).isNotNull();
		assertThat(otherLocation).isNotNull();
		String targetId = targetLocation.substring(targetLocation.lastIndexOf('/') + 1);
		Long otherId = Long.valueOf(otherLocation.substring(otherLocation.lastIndexOf('/') + 1));

		mockMvc.perform(put(targetLocation)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "Updated task",
								  "description": "Updated description",
								  "assigneeName": "Updated assignee",
								  "dueDate": "2026-12-01"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.taskId").value(Long.valueOf(targetId)))
				.andExpect(jsonPath("$.taskName").value("Updated task"))
				.andExpect(jsonPath("$.description").value("Updated description"))
				.andExpect(jsonPath("$.assigneeName").value("Updated assignee"))
				.andExpect(jsonPath("$.dueDate").value("2026-12-01"));

		TaskEntity updatedTask = taskRepository.findById(Long.valueOf(targetId)).orElseThrow();
		assertThat(updatedTask.getTaskName()).isEqualTo("Updated task");
		assertThat(updatedTask.getDescription()).isEqualTo("Updated description");
		assertThat(updatedTask.getAssigneeName()).isEqualTo("Updated assignee");
		assertThat(updatedTask.getDueDate().toString()).isEqualTo("2026-12-01");

		TaskEntity unchangedTask = taskRepository.findById(otherId).orElseThrow();
		assertThat(unchangedTask.getTaskName()).isEqualTo(taskName + " other");
		assertThat(unchangedTask.getDescription()).isEqualTo("Other description");
		assertThat(unchangedTask.getAssigneeName()).isEqualTo("Other assignee");
		assertThat(unchangedTask.getDueDate().toString()).isEqualTo("2026-11-20");
		assertThat(taskRepository.count()).isEqualTo(initialTaskCount + 2);
	}

	/**
	 * 更新時のタスク名を空白除去後のUnicodeコードポイント数で判定し、100文字を受け付け101文字を拒否することを確認する。
	 */
	@Test
	@Transactional
	void taskNameLengthUsesUnicodeCodePointsWhenUpdating() throws Exception {
		long targetTaskId = createTask("PR-06 target");
		long otherTaskId = createTask("PR-06 other");
		long taskCountBeforeUpdate = taskRepository.count();
		String validTaskName = "a".repeat(98) + "\uD83D\uDE00".repeat(2);
		String paddedValidTaskName = "\u3000" + validTaskName + "\u3000";

		mockMvc.perform(put("/api/tasks/" + targetTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Valid description",
								  "assigneeName": "Valid assignee",
								  "dueDate": "2026-12-01"
								}
								""".formatted(paddedValidTaskName)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.taskName").value(validTaskName));

		String invalidTaskName = "\u3000" + "a".repeat(99) + "\uD83D\uDE00".repeat(2) + "\u3000";
		mockMvc.perform(put("/api/tasks/" + targetTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "Invalid description",
								  "assigneeName": "Invalid assignee",
								  "dueDate": "2026-12-02"
								}
								""".formatted(invalidTaskName)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.taskName")
						.value("タスク名は100文字以内で入力してください。"));

		TaskEntity unchangedTarget = taskRepository.findById(targetTaskId).orElseThrow();
		assertThat(unchangedTarget.getTaskName()).isEqualTo(validTaskName);
		assertThat(unchangedTarget.getDescription()).isEqualTo("Valid description");
		assertThat(unchangedTarget.getAssigneeName()).isEqualTo("Valid assignee");
		assertThat(unchangedTarget.getDueDate().toString()).isEqualTo("2026-12-01");

		TaskEntity unchangedOther = taskRepository.findById(otherTaskId).orElseThrow();
		assertThat(unchangedOther.getTaskName()).startsWith("PR-06 other ");
		assertThat(unchangedOther.getDescription()).isEmpty();
		assertThat(unchangedOther.getAssigneeName()).isNull();
		assertThat(unchangedOther.getDueDate().toString()).isEqualTo("2026-11-19");
		assertThat(taskRepository.count()).isEqualTo(taskCountBeforeUpdate);
	}

	/**
	 * 更新時の説明をUnicodeコードポイント数で判定し、200文字を受け付け201文字を拒否することを確認する。
	 */
	@Test
	@Transactional
	void descriptionLengthUsesUnicodeCodePointsWhenUpdating() throws Exception {
		long targetTaskId = createTask("PR-07 target");
		long otherTaskId = createTask("PR-07 other");
		long taskCountBeforeUpdate = taskRepository.count();
		String validDescription = "a".repeat(198) + "\uD83D\uDE00".repeat(2);

		mockMvc.perform(put("/api/tasks/" + targetTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "PR-07 target",
								  "description": "%s",
								  "assigneeName": null,
								  "dueDate": "2026-12-01"
								}
								""".formatted(validDescription)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.description").value(validDescription));

		String invalidDescription = "a".repeat(199) + "\uD83D\uDE00".repeat(2);
		mockMvc.perform(put("/api/tasks/" + targetTaskId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "PR-07 changed target",
								  "description": "%s",
								  "assigneeName": "Changed assignee",
								  "dueDate": "2026-12-02"
								}
								""".formatted(invalidDescription)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.description")
						.value("説明は200文字以内で入力してください。"));

		TaskEntity unchangedTarget = taskRepository.findById(targetTaskId).orElseThrow();
		assertThat(unchangedTarget.getTaskName()).isEqualTo("PR-07 target");
		assertThat(unchangedTarget.getDescription()).isEqualTo(validDescription);
		assertThat(unchangedTarget.getAssigneeName()).isNull();
		assertThat(unchangedTarget.getDueDate().toString()).isEqualTo("2026-12-01");

		TaskEntity unchangedOther = taskRepository.findById(otherTaskId).orElseThrow();
		assertThat(unchangedOther.getTaskName()).startsWith("PR-07 other ");
		assertThat(unchangedOther.getDescription()).isEmpty();
		assertThat(unchangedOther.getAssigneeName()).isNull();
		assertThat(unchangedOther.getDueDate().toString()).isEqualTo("2026-11-19");
		assertThat(taskRepository.count()).isEqualTo(taskCountBeforeUpdate);
	}

	/**
	 * 担当者を省略した更新では未割当として保存することを確認する。
	 */
	@Test
	@Transactional
	void updatingTaskWithoutAssigneeClearsExistingAssignee() throws Exception {
		String taskName = "PR-02 omitted assignee " + UUID.randomUUID();
		MvcResult createdResult = mockMvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "",
								  "assigneeName": "Original assignee",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isCreated())
				.andReturn();
		String location = createdResult.getResponse().getHeader("Location");
		assertThat(location).isNotNull();

		mockMvc.perform(put(location)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "taskName": "%s",
								  "description": "",
								  "dueDate": "2026-11-19"
								}
								""".formatted(taskName)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assigneeName").doesNotExist());
	}

	/**
	 * 更新の必須項目不足または空白のみのタスク名は400となり、対象・他タスクを変更しないことを確認する。
	 */
	@Test
	@Transactional
	void requiredUpdateFieldsReturnValidationErrorsWithoutChangingTasks() throws Exception {
		long targetTaskId = createTask("PR-05 target");
		long otherTaskId = createTask("PR-05 other");
		TaskEntity originalTarget = taskRepository.findById(targetTaskId).orElseThrow();
		String originalTargetName = originalTarget.getTaskName();
		String originalTargetDescription = originalTarget.getDescription();
		String originalTargetAssignee = originalTarget.getAssigneeName();
		String originalTargetDueDate = originalTarget.getDueDate().toString();
		TaskEntity originalOther = taskRepository.findById(otherTaskId).orElseThrow();
		String originalOtherName = originalOther.getTaskName();
		String originalOtherDescription = originalOther.getDescription();
		String originalOtherAssignee = originalOther.getAssigneeName();
		String originalOtherDueDate = originalOther.getDueDate().toString();
		long taskCountBeforeInvalidUpdates = taskRepository.count();
		String targetPath = "/api/tasks/" + targetTaskId;

		assertUpdateValidationError(targetPath,
				"""
				{
				  "dueDate": "2026-11-19"
				}
				""",
				"taskName",
				"タスク名は必須です。");
		assertUpdateValidationError(targetPath,
				"""
				{
				  "taskName": "　 ",
				  "dueDate": "2026-11-19"
				}
				""",
				"taskName",
				"タスク名は必須です。");
		assertUpdateValidationError(targetPath,
				"""
				{
				  "taskName": "Changed task"
				}
				""",
				"dueDate",
				"期限日は必須です。");

		assertThat(taskRepository.count()).isEqualTo(taskCountBeforeInvalidUpdates);
		TaskEntity unchangedTarget = taskRepository.findById(targetTaskId).orElseThrow();
		assertThat(unchangedTarget.getTaskName()).isEqualTo(originalTargetName);
		assertThat(unchangedTarget.getDescription()).isEqualTo(originalTargetDescription);
		assertThat(unchangedTarget.getAssigneeName()).isEqualTo(originalTargetAssignee);
		assertThat(unchangedTarget.getDueDate().toString()).isEqualTo(originalTargetDueDate);

		TaskEntity unchangedOther = taskRepository.findById(otherTaskId).orElseThrow();
		assertThat(unchangedOther.getTaskName()).isEqualTo(originalOtherName);
		assertThat(unchangedOther.getDescription()).isEqualTo(originalOtherDescription);
		assertThat(unchangedOther.getAssigneeName()).isEqualTo(originalOtherAssignee);
		assertThat(unchangedOther.getDueDate().toString()).isEqualTo(originalOtherDueDate);
	}

	private void assertUpdateValidationError(
			String taskPath,
			String requestBody,
			String field,
			String expectedFieldMessage) throws Exception {
		mockMvc.perform(put(taskPath)
						.contentType(MediaType.APPLICATION_JSON)
						.content(requestBody))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.message").value("入力内容を確認してください。"))
				.andExpect(jsonPath("$.fieldErrors." + field).value(expectedFieldMessage));
	}

}
