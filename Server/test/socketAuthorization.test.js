import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { isChatMember } from "../lib/socketAuthorization.js";

test("chat membership checks the authenticated user's id", () => {
  const memberId = new mongoose.Types.ObjectId();
  const chat = { members: [memberId] };

  assert.equal(isChatMember(chat, memberId.toString()), true);
  assert.equal(isChatMember(chat, new mongoose.Types.ObjectId().toString()), false);
});

test("missing chats and malformed chat shapes are denied", () => {
  assert.equal(isChatMember(null, new mongoose.Types.ObjectId()), false);
  assert.equal(isChatMember({ members: [] }, new mongoose.Types.ObjectId()), false);
});
