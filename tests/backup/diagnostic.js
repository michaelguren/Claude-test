#!/usr/bin/env node
/**
 * Diagnostic script to check test execution
 */

console.log("Starting diagnostic tests");

// First, let's require the test utilities and check that functions are available
const testUtils = require('./test-utils');
console.log("\nTest utilities available:");
console.log("- describe:", typeof testUtils.describe);
console.log("- it:", typeof testUtils.it);
console.log("- assert:", typeof testUtils.assert);
console.log("- resetTestState:", typeof testUtils.resetTestState);
console.log("- printSummary:", typeof testUtils.printSummary);

// Now, let's run a simple test directly
console.log("\nRunning a simple test directly:");
testUtils.resetTestState();

testUtils.describe('Simple test suite', () => {
  testUtils.it('should pass a simple test', () => {
    testUtils.assert.isTrue(true, 'True should be true');
    testUtils.assert.equal(1, 1, 'One should equal one');
  });
  
  testUtils.it('should run multiple assertions', () => {
    testUtils.assert.equal("test", "test", 'Strings should match');
    testUtils.assert.deepEqual({a: 1}, {a: 1}, 'Objects should be equal');
  });
});

const result = testUtils.printSummary();
console.log("\nDiagnostic complete. Exit status:", result ? "Success" : "Failure");
