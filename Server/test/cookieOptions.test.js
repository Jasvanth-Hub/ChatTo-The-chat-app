import test from "node:test";
import assert from "node:assert/strict";
import { cookieOptions } from "../constants/cookie.js";

test("authentication cookies are secure, HTTP-only and partitioned", () => {
  assert.equal(cookieOptions.secure, true);
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.sameSite, "none");
  assert.equal(cookieOptions.partitioned, true);
  assert.equal(cookieOptions.path, "/");
});
