import { describe, it } from "node:test";
// @ts-ignore
import { expect } from "chai";
import { mapTestStatus } from "../../src/testRunner/index";

describe("Testsuite: mapTestStatus", () => {
  it("Should be a function", () => {
    expect(mapTestStatus).to.be.a("function");
  });
  it("Should return 'passed' when status is 'pass'", () => {
    expect(mapTestStatus("pass")).to.equal("passed");
  });
  it("Should return 'failed' when status is 'fail'", () => {
    expect(mapTestStatus("fail")).to.equal("failed");
  });
  it("Should return 'skipped' when status is 'skip'", () => {
    expect(mapTestStatus("skip")).to.equal("skipped");
  });
  it("Should return 'todo' when status is 'todo'", () => {
    expect(mapTestStatus("todo")).to.equal("todo");
  });
  it("Should return 'skipped' when status is not 'pass', 'fail', 'skip', or 'todo'", () => {
    expect(mapTestStatus("unknown")).to.equal("skipped");
  });
});