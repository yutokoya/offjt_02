package com.example.backend.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskDependencyRepository
		extends JpaRepository<TaskDependencyEntity, TaskDependencyEntity.TaskDependencyId> {

	@Modifying
	@Query("""
			delete from TaskDependencyEntity dependency
			where dependency.id.predecessorTaskId = :taskId
			   or dependency.id.successorTaskId = :taskId
			""")
	int deleteConnectedToTask(@Param("taskId") Long taskId);
}
