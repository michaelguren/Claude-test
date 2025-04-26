/**
 * Simple code coverage utility
 * 
 * This module provides minimal code coverage functionality without external dependencies.
 * It implements function wrapping to track which functions have been called during testing.
 */

// Coverage data storage
const coverageData = {
  functions: new Map(), // Maps function names to execution counts
  files: new Map(),     // Maps file paths to coverage information
};

/**
 * Wrap a function to track execution for code coverage
 * 
 * @param {Function} fn - The function to wrap
 * @param {string} name - Function name for reporting
 * @param {string} filePath - Path to the file containing the function
 * @returns {Function} Wrapped function
 */
function instrumentFunction(fn, name, filePath) {
  if (typeof fn !== 'function') return fn;
  
  // Create a unique key for this function
  const key = `${filePath}:${name}`;
  
  // Initialize coverage data for this function
  if (!coverageData.functions.has(key)) {
    coverageData.functions.set(key, {
      name,
      filePath,
      calls: 0,
      executed: false
    });
  }
  
  // Track file coverage
  if (!coverageData.files.has(filePath)) {
    coverageData.files.set(filePath, {
      path: filePath,
      functions: new Set(),
      executedFunctions: new Set()
    });
  }
  
  const fileData = coverageData.files.get(filePath);
  fileData.functions.add(name);
  
  // Return wrapped function
  return function(...args) {
    const functionData = coverageData.functions.get(key);
    functionData.calls++;
    functionData.executed = true;
    
    fileData.executedFunctions.add(name);
    
    return fn.apply(this, args);
  };
}

/**
 * Instrument an entire object for coverage tracking
 * 
 * @param {Object} obj - Object containing functions to instrument
 * @param {string} namespace - Namespace for function names
 * @param {string} filePath - Path to the file containing the object
 * @returns {Object} Instrumented object
 */
function instrumentObject(obj, namespace, filePath) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullName = `${namespace}.${key}`;
    
    if (typeof value === 'function') {
      result[key] = instrumentFunction(value, fullName, filePath);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = instrumentObject(value, fullName, filePath);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Reset coverage data
 */
function resetCoverage() {
  coverageData.functions.clear();
  coverageData.files.clear();
}

/**
 * Generate a coverage report
 * 
 * @returns {Object} Coverage statistics
 */
function generateCoverageReport() {
  const totalFunctions = coverageData.functions.size;
  const executedFunctions = Array.from(coverageData.functions.values()).filter(f => f.executed).length;
  const coverage = totalFunctions > 0 ? (executedFunctions / totalFunctions) * 100 : 0;
  
  const fileReports = [];
  
  for (const [filePath, fileData] of coverageData.files.entries()) {
    const totalFileFunctions = fileData.functions.size;
    const executedFileFunctions = fileData.executedFunctions.size;
    const fileCoverage = totalFileFunctions > 0 ? (executedFileFunctions / totalFileFunctions) * 100 : 0;
    
    fileReports.push({
      file: filePath,
      functions: {
        total: totalFileFunctions,
        executed: executedFileFunctions,
        coverage: fileCoverage.toFixed(2) + '%'
      }
    });
  }
  
  return {
    summary: {
      functions: {
        total: totalFunctions,
        executed: executedFunctions,
        coverage: coverage.toFixed(2) + '%'
      }
    },
    files: fileReports
  };
}

/**
 * Print a coverage report to the console
 */
function printCoverageReport() {
  const report = generateCoverageReport();
  
  console.log('='.repeat(50));
  console.log('CODE COVERAGE REPORT');
  console.log('='.repeat(50));
  console.log(`Overall function coverage: ${report.summary.functions.coverage}`);
  console.log(`Functions: ${report.summary.functions.executed}/${report.summary.functions.total}`);
  console.log('-'.repeat(50));
  
  console.log('File Coverage:');
  report.files.forEach(file => {
    // Create a visual bar representation of coverage
    const barLength = 20;
    const filledLength = Math.round((parseInt(file.functions.coverage) / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    console.log(`${file.file}`);
    console.log(`  Functions: ${file.functions.executed}/${file.functions.total} (${file.functions.coverage})`);
    console.log(`  ${bar}`);
  });
  
  console.log('='.repeat(50));
  
  return report;
}

module.exports = {
  instrumentFunction,
  instrumentObject,
  resetCoverage,
  generateCoverageReport,
  printCoverageReport
};
