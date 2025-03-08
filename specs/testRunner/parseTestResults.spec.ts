import { describe, it } from "node:test";
// @ts-ignore
import { expect } from "chai";
import { parseTestResults } from "../../src/testRunner/index";

describe("Testsuite: mapTestStatus", () => {
  it("Should be a function", () => {
    expect(parseTestResults).to.be.a("function");
  });
  it("Should parse valid JSON test results", () => {
    const jsonOutput = `{"tests":[{"name":"test one","duration":100,"status":"pass"},{"name":"test two","duration":150,"status":"fail","error":{"message":"failed","stack":"Error: failed"}}]}`;
    const results = parseTestResults(jsonOutput);
    expect(results).to.have.lengthOf(2);
    expect(results[0].name).to.equal("test one");
    expect(results[0].status).to.equal("passed");
    expect(results[1].name).to.equal("test two");
    expect(results[1].status).to.equal("failed");
    expect(results[1].error?.message).to.equal("failed");
  });
  it("Should parse valid JSON test results with leading text", () => {
    const jsonOutput = `
        console output before JSON
        {"tests":[{"name":"test one","duration":100,"status":"pass"},{"name":"test two","duration":150,"status":"fail","error":{"message":"failed","stack":"Error: failed"}}]}
      `;
    const results = parseTestResults(jsonOutput);
    expect(results).to.have.lengthOf(2);
    expect(results[0].name).to.equal("test one");
    expect(results[0].status).to.equal("passed");
    expect(results[1].name).to.equal("test two");
    expect(results[1].status).to.equal("failed");
    expect(results[1].error?.message).to.equal("failed");
  });
  it("Should throw an error for invalid JSON", () => {
    const badOutput = "No JSON here at all";
    expect(() => parseTestResults(badOutput)).to.throw();
  });
  it("Should be empty when the JSON has the wrong format", () => {
    const badOutput = `{"animals":[{"genus":"test one","tiger":100,"status":"pass"},{"ralph":"test two","duration":150,"status":"fail"}]}`;

    const results = parseTestResults(badOutput);
    expect(results).to.have.lengthOf(0);
  });
});