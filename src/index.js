#!/usr/bin/env node

const { parseArgs } = require('./utils/args');
const { promptUser } = require('./prompts');
const ProjectGenerator = require('./generators/projectGenerator');
const { showBanner } = require('./utils/banner');

async function init() {
  showBanner();
  console.log('');

  // Parse command line arguments
  const { defaultProjectName, baseDir, useCurrentDir } = parseArgs();

  // Prompt for project details
  const answers = await promptUser(defaultProjectName);

  // Generate project
  const generator = new ProjectGenerator(answers, baseDir, useCurrentDir);
  await generator.generate();
}

// Handle errors
init().catch((error) => {
  console.error('Error initializing project:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});
