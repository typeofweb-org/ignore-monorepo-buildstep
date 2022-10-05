import assert from "node:assert";
import { describe, it } from "node:test";
import { promiseErrorToSettled } from "./utils.js";

describe("utils", async () => {
	describe("promiseErrorToSettled", () => {
		it("should convert fulfilled promise", async () => {
			const result = await promiseErrorToSettled(Promise.resolve("test"));
			assert.deepEqual(result, { status: "fulfilled", value: "test" });
		});

		it("should convert rejected promise", async () => {
			const result = await promiseErrorToSettled(Promise.reject("test"));
			assert.deepEqual(result, { status: "rejected", reason: "test" });
		});
	});
});
