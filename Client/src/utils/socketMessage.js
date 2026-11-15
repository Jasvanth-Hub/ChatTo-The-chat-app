export const emitMessageWithRetry = async (
  socket,
  event,
  payload,
  { attempts = 3, timeout = 8000 } = {}
) => {
  let lastFailure;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const outcome = await new Promise((resolve) => {
      socket.timeout(timeout).emit(event, payload, (timeoutError, response) => {
        resolve({ timeoutError, response });
      });
    });

    if (!outcome.timeoutError && outcome.response?.success) return outcome.response;

    if (!outcome.timeoutError && !outcome.response?.retryable) {
      const error = new Error(outcome.response?.message || "Message could not be sent");
      error.retryable = false;
      throw error;
    }

    lastFailure = new Error(outcome.response?.message || "Message delivery is not confirmed");
    lastFailure.retryable = true;
  }

  throw lastFailure || Object.assign(new Error("Message delivery is not confirmed"), { retryable: true });
};
