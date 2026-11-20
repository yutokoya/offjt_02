CREATE TABLE task_dependencies (
    predecessor_task_id BIGINT NOT NULL,
    successor_task_id BIGINT NOT NULL,
    PRIMARY KEY (predecessor_task_id, successor_task_id),
    CONSTRAINT task_dependencies_predecessor_fk
        FOREIGN KEY (predecessor_task_id) REFERENCES tasks (task_id),
    CONSTRAINT task_dependencies_successor_fk
        FOREIGN KEY (successor_task_id) REFERENCES tasks (task_id),
    CONSTRAINT task_dependencies_no_self_reference
        CHECK (predecessor_task_id <> successor_task_id)
);
