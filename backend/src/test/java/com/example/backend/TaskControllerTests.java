package com.example.backend;

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

	/**
	 * タスク削除が未実装の場合、501と未実装メッセージを返すことを確認する。
	 */
	@Test
	void deleteTaskReturnsNotImplementedSkeletonResponse() throws Exception {
		mockMvc.perform(delete("/api/tasks/1"))
				.andExpect(status().isNotImplemented())
				.andExpect(content().string("タスク削除の業務処理はこれから実装します。"));
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
}
