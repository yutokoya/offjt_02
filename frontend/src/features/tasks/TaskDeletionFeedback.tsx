type TaskDeletionFeedbackProps = {
  message: string
  error: string
}

export function TaskDeletionFeedback({
  message,
  error,
}: TaskDeletionFeedbackProps) {
  return (
    <>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  )
}
