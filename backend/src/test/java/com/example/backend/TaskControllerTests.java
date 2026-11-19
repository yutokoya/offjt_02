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
}
