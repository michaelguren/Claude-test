#!/usr/bin/env node
/**
 * Simplified test execution script
 * Usage:
 *   node tests/run-tests.js         # Run all tests
 *   node tests/run-tests.js e2e     # Run end-to-end tests
 */

const fs = require("fs");
const path = require("path");

// Ensure we're running the script from the correct location
function validateEnvironment() {
  // Check if we're in the tests directory or project root
  const currentDir = process.cwd();
  const isTestDir = path.basename(currentDir) === "tests";

  // If we're in tests directory, move up one level
  if (isTestDir) {
    process.chdir("..");
    console.log("Changed directory to project root:", process.cwd());
  }

  // Make sure the e2e directory exists
  const e2eDir = path.join(process.cwd(), "tests", "e2e");
  if (!fs.existsSync(e2eDir)) {
    console.error("Error: Cannot find e2e tests directory at", e2eDir);
    console.error("Please run this script from the project root directory.");
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

// Test runner for e2e tests
async function runEndToEndTests() {
  console.log("🧪 Running end-to-end tests...");
  
  try {
    const testDir = path.join(process.cwd(), "tests", "e2e");
    const files = fs.readdirSync(testDir);
    
    for (const file of files) {
      if (file.endsWith(".test.js")) {
        console.log(`\n📄 Running test: ${file}`);
        
        // Load test utilities
        const testUtils = require("./test-utils");
        testUtils.resetTestState();
        
        // Run the test
        require(path.join(testDir, file));
        
        // Print summary
        testUtils.printSummary();
      }
    }
    
    console.log("\n✅ End-to-end tests completed");
  } catch (error) {
    console.error("❌ Error running end-to-end tests:", error);
    process.exit(1);
  }
}

async function main() {
  // Validate environment
  validateEnvironment();
  
  if (args.length === 0 || args[0] === "e2e") {
    // Run end-to-end tests
    await runEndToEndTests();
  } else {
    console.error(`Unknown test category: ${args[0]}`);
    console.error("Usage: node tests/run-tests.js [e2e]");
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error("Unhandled error running tests:", error);
  process.exit(1);
});
