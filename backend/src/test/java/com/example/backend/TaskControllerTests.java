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
				.andExpect(jsonPath("$.items[?(@.taskId == " + taskId + ")]").isNotEmpty());
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
}
