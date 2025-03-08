import { describe, it } from "node:test";
// @ts-ignore
import { expect } from "chai";
import { buildCommand } from "../../src/utils";

describe("Testsuite: buildCommand", () => {
  it("Should be a function", () => {
    expect(buildCommand).to.be.a("function");
  });
  it("Should return a string", () => {
    expect(buildCommand("npx turbo", "test-pkg", {})).to.be.a("string");
  });
  it("Should build a basic command for a package", () => {
    const command = buildCommand("npx turbo", "test-pkg", {});
    expect(command).to.equal("npx turbo run test --filter=test-pkg -- --reporter=json");
  });
  it("Should include test names when provided", () => {
    const command = buildCommand("npx turbo", "test-pkg", {
      testIds: ["package/test-1", "package/test-2"],
    });
    expect(command).to.include('--test="test-1"');
    expect(command).to.include('--test="test-2"');
  });
});