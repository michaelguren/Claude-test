/**
 * Simple test runner with no external dependencies
 */

const fs = require("fs");
const path = require("path");
const testUtils = require("./test-utils");

// Run all tests in a directory
async function runTestsInDirectory(directory) {
  const fullPath = path.join(__dirname, directory);

  try {
    const files = fs.readdirSync(fullPath);
    let anyTestsRun = false;

    for (const file of files) {
      if (file.endsWith(".test.js")) {
        console.log(`\n📄 Running tests in ${path.join(directory, file)}`);
        anyTestsRun = true;

        // Reset test state before each test file
        testUtils.resetTestState();

        // Execute the test file
        try {
          // This approach ensures the file is executed in the correct context
          // and that any global describe/it calls will work
          process.argv = [process.argv[0], path.join(fullPath, file)];
          require(path.join(fullPath, file));
          
          // Print summary for this test file
          testUtils.printSummary();
        } catch (error) {
          console.error(`❌ Error executing test file ${file}:`, error);
        }
      }
    }

    if (!anyTestsRun) {
      console.log(`No test files found in directory: ${directory}`);
    }
  } catch (error) {
    console.error(`❌ Error running tests in ${directory}:`, error);
  }
}

// Run tests for a specific test file
async function runTestFile(filePath) {
  try {
    console.log(`\n📄 Running tests in ${filePath}`);

    // Reset test state
    testUtils.resetTestState();

    // Execute the test file
    try {
      // Set up process.argv for the test file
      process.argv = [process.argv[0], path.join(__dirname, filePath)];
      require(path.join(__dirname, filePath));
      
      // Print summary
      testUtils.printSummary();
    } catch (error) {
      console.error(`❌ Error executing test file ${filePath}:`, error);
      console.error(error.stack);
    }
  } catch (error) {
    console.error(`❌ Error running tests in ${filePath}:`, error);
  }
}

// Run all tests
async function runAllTests() {
  const testDirectories = ["unit", "integration", "api"];

  console.log("🧪 Running all tests...");
  let totalRun = 0;

  for (const directory of testDirectories) {
    const dirPath = path.join(__dirname, directory);
    if (fs.existsSync(dirPath)) {
      await runTestsInDirectory(directory);
      totalRun++;
    }
  }

  if (totalRun === 0) {
    console.log("No test directories found.");
  } else {
    console.log("\n🏁 All test suites completed.");
  }
}

module.exports = {
  runTestsInDirectory,
  runTestFile,
  runAllTests,
};
