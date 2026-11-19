package com.example.backend;

import com.example.backend.task.TaskSkeletonController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskSkeletonController.class)
class TaskSkeletonControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void deleteTaskReturnsNotImplementedSkeletonResponse() throws Exception {
		mockMvc.perform(delete("/api/tasks/1"))
				.andExpect(status().isNotImplemented())
				.andExpect(content().string("タスク削除の業務処理はこれから実装します。"));
	}
}
