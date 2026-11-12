const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "palette.cjs"), "utf8");
const context = { require, module: { exports: {} } };
vm.runInNewContext(`${source}\nmodule.exports = { withAlpha, rgba };`, context);
const { withAlpha, rgba } = context.module.exports;

test("withAlpha converts hex colors and replaces existing opacity", () => {
	assert.equal(withAlpha("#4c8f95", 0.5), "#4c8f9580");
	assert.equal(withAlpha("#ABC", 0), "#aabbcc00");
	assert.equal(withAlpha("#abcd", 1), "#aabbccff");
	assert.equal(withAlpha("#11223344", 0.5), "#11223380");
	assert.equal(withAlpha("#000000", 1), "#000000ff");
});

test("color helpers reject invalid alpha and hex inputs", () => {
	for (const alpha of [-1, 1.01, NaN, Infinity, "0.5", null, undefined]) {
		assert.throws(() => withAlpha("#123456", alpha), { name: "RangeError" });
		assert.throws(() => rgba(1, 2, 3, alpha), { name: "RangeError" });
	}
	for (const color of ["red", "123456", "#12", "#12345", "#1234567", "#xyz123", "", null, undefined]) {
		assert.throws(() => withAlpha(color, 0.5), { name: "TypeError" });
	}
});
