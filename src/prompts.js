const inquirer = require('inquirer');

/**
 * Prompt user for project configuration
 * @param {string} defaultProjectName - Default project name
 * @returns {Promise<Object>} User answers
 */
async function promptUser(defaultProjectName) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultProjectName,
      validate: (input) => {
        if (!input.trim()) {
          return 'Project name cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: 'A Node.js application'
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: '1.0.0'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author:',
      default: ''
    },
    {
      type: 'input',
      name: 'license',
      message: 'License:',
      default: 'ISC'
    },
    {
      type: 'list',
      name: 'database',
      message: 'Database:',
      choices: [
        { name: 'None', value: 'none' },
        { name: 'MongoDB', value: 'mongodb' },
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'SQLite', value: 'sqlite' }
      ],
      default: 'none'
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['npm', 'yarn', 'pnpm'],
      default: 'npm'
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies?',
      default: true
    }
  ]);

  return answers;
}

module.exports = { promptUser };
