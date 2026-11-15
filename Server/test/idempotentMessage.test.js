import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createOrGetMessage } from "../lib/idempotentMessage.js";
import { Message as MessageModel } from "../models/message.js";

const makeMessage = (values) => ({ ...values, toObject() { return { ...values }; } });

test("retries return the existing message without creating a duplicate", async () => {
  const saved = makeMessage({ _id: "saved-id", content: "hello" });
  let creates = 0;
  const Message = {
    async findOne() { return saved; },
    async create() { creates += 1; throw new Error("must not create"); },
  };

  const result = await createOrGetMessage({
    Message, chatId: "chat", senderId: "sender", clientMessageId: "client-id", content: "hello",
  });

  assert.equal(result.message, saved);
  assert.equal(result.created, false);
  assert.equal(creates, 0);
});

test("new records persist the idempotency key without a post-save lookup", async () => {
  const values = { _id: "saved-id", content: "hello" };
  let lookups = 0;
  let createdValues;
  const Message = {
    async findOne() { lookups += 1; return null; },
    async create(data) { createdValues = data; return makeMessage(values); },
  };

  const result = await createOrGetMessage({
    Message, chatId: "chat", senderId: "sender", clientMessageId: "client-id", content: "hello",
  });

  assert.equal(createdValues.clientMessageId, "client-id");
  assert.equal(lookups, 1);
  assert.equal(result.message.toObject()._id, "saved-id");
  assert.equal(result.created, true);
});

test("concurrent duplicate insertion resolves to the winning saved row", async () => {
  const saved = makeMessage({ _id: "winner", content: "hello" });
  let lookup = 0;
  const Message = {
    async findOne() { lookup += 1; return lookup === 1 ? null : saved; },
    async create() { throw Object.assign(new Error("duplicate"), { code: 11000 }); },
  };

  const result = await createOrGetMessage({
    Message, chatId: "chat", senderId: "sender", clientMessageId: "client-id", content: "hello",
  });

  assert.equal(result.message, saved);
  assert.equal(result.created, false);
  assert.equal(lookup, 2);
});

test("unique partial index scopes client ids by sender and chat, leaving legacy rows alone", () => {
  const index = MessageModel.schema.indexes().find(([keys, options]) =>
    keys.sender === 1 && keys.chat === 1 && keys.clientMessageId === 1 && options.unique
  );
  assert.ok(index);
  assert.deepEqual(index[1].partialFilterExpression, { clientMessageId: { $type: "string" } });
  assert.equal(MessageModel.schema.path("clientMessageId").options.required, false);
  assert.ok(mongoose);
});
