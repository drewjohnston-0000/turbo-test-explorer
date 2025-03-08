import { describe, it } from "node:test";
// @ts-ignore
import { expect } from "chai";
import { executeTestCommand } from "../../src/testRunner/index";

describe("Testsuite: executeTestCommand", () => {
  it("Should be a function", () => {
    expect(executeTestCommand).to.be.a("function");
  });
});