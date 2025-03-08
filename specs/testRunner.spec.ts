import { describe, it, beforeEach } from 'node:test';

// @ts-ignore
import { expect } from 'chai';
import { buildCommand, parseTestResults, mapTestStatus } from "../src/testRunner/index";

describe('Testsuite: Test Runner', () => {
  describe('#buildCommand', () => {
    it('should build a basic command for a package', () => {
      const command = buildCommand('npx turbo', 'test-pkg', {});
      expect(command).to.equal('npx turbo run test --filter=test-pkg -- --reporter=json');
    });

    it('should include test names when provided', () => {
      const command = buildCommand('npx turbo', 'test-pkg', {
        testIds: ['package/test-1', 'package/test-2']
      });
      expect(command).to.include('--test="test-1"');
      expect(command).to.include('--test="test-2"');
    });
  });

  describe('#parseTestResults', () => {
    it('should parse valid JSON test results', () => {
      const jsonOutput = `
        console output before JSON
        {"tests":[{"name":"test one","duration":100,"status":"pass"},{"name":"test two","duration":150,"status":"fail","error":{"message":"failed","stack":"Error: failed"}}]}
      `;

      const results = parseTestResults(jsonOutput);

      expect(results).to.have.lengthOf(2);
      expect(results[0].name).to.equal('test one');
      expect(results[0].status).to.equal('passed');
      expect(results[1].name).to.equal('test two');
      expect(results[1].status).to.equal('failed');
      expect(results[1].error?.message).to.equal('failed');
    });

    it('should throw an error for invalid JSON', () => {
      const badOutput = 'No JSON here at all';
      expect(() => parseTestResults(badOutput)).to.throw();
    });
  });

  describe('#mapTestStatus', () => {
    it('should map pass to passed', () => {
      expect(mapTestStatus('pass')).to.equal('passed');
    });

    it('should map fail to failed', () => {
      expect(mapTestStatus('fail')).to.equal('failed');
    });
  });
});