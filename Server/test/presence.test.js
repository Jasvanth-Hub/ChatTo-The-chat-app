import test from "node:test";
import assert from "node:assert/strict";
import { PresenceTracker } from "../lib/presence.js";

test("leaving one chat does not mark connected tabs offline", () => {
  const presence = new PresenceTracker();
  presence.connect("user", "tab-a");
  presence.connect("user", "tab-b");
  presence.joinChat("tab-a", "chat-a");
  presence.joinChat("tab-b", "chat-b");

  presence.leaveChat("tab-a", "chat-a");

  assert.equal(presence.onlineUsers.has("user"), true);
  assert.deepEqual([...presence.socketsByUser.get("user")], ["tab-a", "tab-b"]);
  assert.deepEqual([...presence.chatsBySocket.get("tab-b")], ["chat-b"]);
});

test("one tab disconnecting preserves online status until the last tab disconnects", () => {
  const presence = new PresenceTracker();
  assert.equal(presence.connect("user", "tab-a"), true);
  assert.equal(presence.connect("user", "tab-b"), false);

  assert.equal(presence.disconnect("user", "tab-a"), false);
  assert.equal(presence.onlineUsers.has("user"), true);
  assert.equal(presence.disconnect("user", "tab-b"), true);
  assert.equal(presence.onlineUsers.has("user"), false);
  assert.equal(presence.socketsByUser.has("user"), false);
});

test("reconnect restores online state and disconnected chat tracking is removed", () => {
  const presence = new PresenceTracker();
  presence.connect("user", "old-tab");
  presence.joinChat("old-tab", "chat-a");
  assert.equal(presence.disconnect("user", "old-tab"), true);
  assert.equal(presence.chatsBySocket.has("old-tab"), false);

  assert.equal(presence.connect("user", "new-tab"), true);
  assert.equal(presence.onlineUsers.has("user"), true);
});
