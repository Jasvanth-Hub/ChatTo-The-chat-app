import test from "node:test";
import assert from "node:assert/strict";
import { corsOptions } from "../constants/config.js";

test("configured frontend origin is available to HTTP and Socket.IO CORS", () => {
  assert.ok(process.env.CLIENT_URL, "CLIENT_URL must be configured");
  assert.ok(corsOptions.origin.includes(process.env.CLIENT_URL));
  assert.equal(corsOptions.credentials, true);
});
