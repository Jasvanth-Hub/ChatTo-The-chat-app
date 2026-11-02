import test from "node:test";
import assert from "node:assert/strict";
import { emitMessageWithRetry } from "../src/utils/socketMessage.js";

const fakeSocket = (outcomes) => {
  const packets = [];
  return {
    packets,
    timeout(value) {
      assert.equal(value, 8000);
      return {
        emit(event, payload, acknowledge) {
          packets.push({ event, payload });
          const outcome = outcomes.shift();
          queueMicrotask(() => acknowledge(outcome.timeout ? new Error("timeout") : null, outcome.response));
        },
      };
    },
  };
};

test("timeout retries reuse the idempotency key and return the saved message", async () => {
  const socket = fakeSocket([
    { timeout: true },
    { response: { success: true, message: { _id: "saved" } } },
  ]);
  const payload = { chatId: "chat", message: "hello", clientMessageId: "stable-id" };

  const response = await emitMessageWithRetry(socket, "NEW_MESSAGE", payload);

  assert.equal(response.message._id, "saved");
  assert.equal(socket.packets.length, 2);
  assert.equal(socket.packets[0].payload.clientMessageId, socket.packets[1].payload.clientMessageId);
});

test("exhausted timeouts signal uncertain delivery so the UI can retain and retry", async () => {
  const socket = fakeSocket([{ timeout: true }, { timeout: true }, { timeout: true }]);

  await assert.rejects(
    emitMessageWithRetry(socket, "NEW_MESSAGE", { clientMessageId: "stable-id" }),
    (error) => error.retryable === true
  );
  assert.equal(socket.packets.length, 3);
});

test("definitive authorization or validation errors are not retried", async () => {
  const socket = fakeSocket([{ response: { success: false, retryable: false, message: "denied" } }]);

  await assert.rejects(
    emitMessageWithRetry(socket, "NEW_MESSAGE", { clientMessageId: "stable-id" }),
    /denied/
  );
  assert.equal(socket.packets.length, 1);
});
