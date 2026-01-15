const path = require('path');

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments with defaultProjectName, baseDir, and useCurrentDir
 */
function parseArgs() {
  const initCwd = process.env.INIT_CWD || process.cwd();
  const args = process.argv.slice(2);
  let defaultProjectName = 'node-app';
  let baseDir = initCwd;
  let useCurrentDir = false;

  // Check if first arg is "." (use current directory)
  if (args[0] === '.') {
    useCurrentDir = true;
    baseDir = process.cwd();
    defaultProjectName = args[1] || path.basename(baseDir) || 'node-app';
  } else if (args[0]) {
    // First arg is project name
    defaultProjectName = args[0];
    // Second arg could be path
    if (args[1]) {
      if (args[1] === '.') {
        useCurrentDir = true;
        baseDir = process.cwd();
      } else {
        baseDir = path.resolve(initCwd, args[1]);
      }
    }
  }

  return { defaultProjectName, baseDir, useCurrentDir };
}

module.exports = { parseArgs };
