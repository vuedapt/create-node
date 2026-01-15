/**
 * Display attractive banner
 */
function showBanner() {
  const text = 'Initializing Node Application 🚀';
  const width = 40;
  const textWidth = text.length;
  const padding = Math.floor((width - textWidth) / 2);
  const equals = '='.repeat(width);
  const spacesBefore = ' '.repeat(Math.max(0, padding));
  const spacesAfter = ' '.repeat(Math.max(0, width - padding - textWidth));
  const middleLine = `${spacesBefore}${text}${spacesAfter}`;
  
  const banner = `${equals}
${middleLine}
${equals}`;
  console.log(banner);
}

/**
 * Log file creation with checkmark
 */
function logFileCreation(filePath) {
  const green = '\x1b[32m';
  const reset = '\x1b[0m';
  console.log(`${green}✓${reset} Created ${filePath}`);
}

/**
 * Log directory creation
 */
function logDirectoryCreation(dirPath) {
  const green = '\x1b[32m';
  const reset = '\x1b[0m';
  console.log(`${green}✓${reset} Created directory: ${dirPath}`);
}

module.exports = {
  showBanner,
  logFileCreation,
  logDirectoryCreation
};
