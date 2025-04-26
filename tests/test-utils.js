/**
 * Simplified test utilities with no external dependencies
 */

// Global test state
const testState = {
  passed: 0,
  failed: 0,
  total: 0,
  currentSuite: null,
  results: []
};

// Test assertion functions
const assert = {
  // Assert that two values are strictly equal
  equal: (actual, expected, message) => {
    const passed = actual === expected;
    return recordAssertion(passed, message, { actual, expected, operator: 'equal' });
  },
  
  // Assert that a condition is truthy
  isTrue: (value, message) => {
    const passed = !!value;
    return recordAssertion(passed, message, { actual: value, expected: true, operator: 'isTrue' });
  },
  
  // Assert that a condition is falsy
  isFalse: (value, message) => {
    const passed = !value;
    return recordAssertion(passed, message, { actual: value, expected: false, operator: 'isFalse' });
  }
};

// Record the result of an assertion
function recordAssertion(passed, message, details) {
  testState.total++;
  
  if (passed) {
    testState.passed++;
    console.log(`  ✓ ${message || ''}`);
  } else {
    testState.failed++;
    console.error(`❌ ${message || ''}`);
    if (details) {
      console.error(`   Expected: ${JSON.stringify(details.expected)}`);
      console.error(`   Actual:   ${JSON.stringify(details.actual)}`);
    }
  }
  
  testState.results.push({
    suite: testState.currentSuite,
    passed,
    message,
    details
  });
  
  return passed;
}

// Define a test suite
function describe(name, fn) {
  console.log(`\n📁 ${name}`);
  testState.currentSuite = name;
  fn();
  testState.currentSuite = null;
}

// Define a test case
function it(name, fn) {
  console.log(`  🔍 ${name}`);
  
  try {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    
    // If the function returns a promise, handle it
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`     ✅ Passed (${duration}ms)`);
        })
        .catch(error => {
          testState.failed++;
          console.error(`     ❌ Failed: ${error.message}`);
          console.error(error.stack);
        });
    }
    
    console.log(`     ✅ Passed (${duration}ms)`);
  } catch (error) {
    testState.failed++;
    console.error(`     ❌ Failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Print test summary
function printSummary() {
  console.log('\n📊 Test Summary:');
  console.log(`   Total:  ${testState.total}`);
  console.log(`   Passed: ${testState.passed}`);
  console.log(`   Failed: ${testState.failed}`);
  
  if (testState.failed > 0) {
    console.log('\n❌ Some tests failed.');
    return false;
  } else {
    console.log('\n✅ All tests passed!');
    return true;
  }
}

// Reset test state
function resetTestState() {
  testState.passed = 0;
  testState.failed = 0;
  testState.total = 0;
  testState.currentSuite = null;
  testState.results = [];
}

// Minimal DOM utilities (primarily for legacy tests)
const dom = {
  // Create a minimal mock DOM environment for testing
  createMockDom: () => {
    if (typeof document !== 'undefined') {
      return document;
    }
    
    // For Node.js (simplified mock)
    global.document = {
      body: {},
      createElement: () => ({}),
      querySelector: () => null
    };
    
    global.window = {};
    
    return global.document;
  },
  
  // Clean up mock DOM
  cleanupMockDom: () => {
    if (typeof document === 'undefined') {
      delete global.document;
      delete global.window;
    }
  }
};

// Export test utilities
module.exports = {
  assert,
  describe,
  it,
  printSummary,
  resetTestState,
  dom
};
