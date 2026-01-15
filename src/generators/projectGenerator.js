const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { generatePackageJson } = require('../utils/packageJson');
const templates = require('../templates/index');
const { logFileCreation, logDirectoryCreation } = require('../utils/banner');

/**
 * Generate project structure and files
 */
class ProjectGenerator {
  constructor(answers, baseDir, useCurrentDir) {
    this.answers = answers;
    this.baseDir = baseDir;
    this.useCurrentDir = useCurrentDir;
    this.projectDir = null;
  }

  async generate() {
    const { projectName: name, description, version, author, license, database, packageManager, installDeps } = this.answers;
    
    // Determine project directory
    this.projectDir = this.useCurrentDir ? this.baseDir : path.join(this.baseDir, name);
    await fs.ensureDir(this.projectDir);

    // Create directory structure
    await this.createDirectories();

    // Generate files
    await this.generatePackageJson(name, version, description, author, license, database, packageManager);
    await this.generateIndexJs(database);
    await this.generateDatabaseConfig(database);
    await this.generateAuthFiles();
    await this.generateUserModel(database);
    await this.generateRoutes();
    await this.generateUtils();
    await this.generateSeedScript(database);
    await this.generateEnvExample(database, name);
    await this.generateGitignore();
    await this.generateNpmrc(packageManager);
    await this.generateReadme(name, description, packageManager, database);
    await this.generateGitkeep();

    // Install dependencies if requested
    if (installDeps) {
      await this.installDependencies(packageManager);
    }

    // Show success message
    this.showSuccessMessage(name, packageManager, installDeps);
  }

  async createDirectories() {
    const dirs = [
      'configs',
      'controllers',
      'middlewares',
      'models',
      'routes',
      'scripts',
      'utils',
      'uploads'
    ];

    console.log('\nCreating directory structure...\n');
    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.projectDir, dir));
      logDirectoryCreation(dir);
    }
  }

  async generatePackageJson(name, version, description, author, license, database, packageManager) {
    console.log('\nGenerating files...\n');
    const packageJson = generatePackageJson(name, version, description, author, license, database, packageManager);
    await fs.writeJson(path.join(this.projectDir, 'package.json'), packageJson, { spaces: 2 });
    logFileCreation('package.json');
  }

  async generateIndexJs(database) {
    const content = templates.getIndexJs(database);
    await fs.writeFile(path.join(this.projectDir, 'index.js'), content);
    logFileCreation('index.js');
  }

  async generateDatabaseConfig(database) {
    const content = templates.getDatabaseConfig(database);
    await fs.writeFile(path.join(this.projectDir, 'configs', 'database.js'), content);
    logFileCreation('configs/database.js');
  }

  async generateAuthFiles() {
    const authController = templates.getAuthController();
    const authMiddleware = templates.getAuthMiddleware();
    
    await fs.writeFile(path.join(this.projectDir, 'controllers', 'auth.controller.js'), authController);
    logFileCreation('controllers/auth.controller.js');
    
    await fs.writeFile(path.join(this.projectDir, 'middlewares', 'auth.middleware.js'), authMiddleware);
    logFileCreation('middlewares/auth.middleware.js');
  }

  async generateUserModel(database) {
    const content = templates.getUserModel(database);
    await fs.writeFile(path.join(this.projectDir, 'models', 'user.model.js'), content);
    logFileCreation('models/user.model.js');
  }

  async generateRoutes() {
    const content = templates.getAuthRoute();
    await fs.writeFile(path.join(this.projectDir, 'routes', 'auth.route.js'), content);
    logFileCreation('routes/auth.route.js');
  }

  async generateUtils() {
    const jwtContent = templates.getJwtUtil();
    await fs.writeFile(path.join(this.projectDir, 'utils', 'jwt.js'), jwtContent);
    logFileCreation('utils/jwt.js');
  }

  async generateSeedScript(database) {
    if (database !== 'none') {
      const content = templates.getSeedUserScript(database);
      await fs.writeFile(path.join(this.projectDir, 'scripts', 'seed-user.js'), content);
      logFileCreation('scripts/seed-user.js');
    }
  }

  async generateEnvExample(database, name) {
    const content = templates.getEnvExample(database, name);
    await fs.writeFile(path.join(this.projectDir, '.env.example'), content);
    logFileCreation('.env.example');
  }

  async generateGitignore() {
    const content = templates.getGitignore();
    await fs.writeFile(path.join(this.projectDir, '.gitignore'), content);
    logFileCreation('.gitignore');
  }

  async generateNpmrc(packageManager) {
    // Only create .npmrc for pnpm to enable build scripts for native modules
    if (packageManager === 'pnpm') {
      const content = 'enable-pre-post-scripts=true\n';
      await fs.writeFile(path.join(this.projectDir, '.npmrc'), content);
      logFileCreation('.npmrc');
    }
  }

  async generateReadme(name, description, packageManager, database) {
    const content = templates.getReadme(name, description, packageManager, database);
    await fs.writeFile(path.join(this.projectDir, 'README.md'), content);
    logFileCreation('README.md');
  }

  async generateGitkeep() {
    await fs.writeFile(path.join(this.projectDir, 'uploads', '.gitkeep'), '');
    logFileCreation('uploads/.gitkeep');
  }

  async installDependencies(packageManager) {
    console.log('\nInstalling dependencies...\n');
    try {
      const installCmd = packageManager === 'npm' ? 'npm install' : 
                        packageManager === 'yarn' ? 'yarn install' : 
                        'pnpm install';
      
      execSync(installCmd, { 
        cwd: this.projectDir, 
        stdio: 'inherit' 
      });
      
      // For pnpm, rebuild native modules after installation
      if (packageManager === 'pnpm') {
        console.log('\nRebuilding native modules...\n');
        try {
          execSync('pnpm rebuild', { 
            cwd: this.projectDir, 
            stdio: 'inherit' 
          });
        } catch (rebuildError) {
          // If rebuild fails, it's not critical - user can run it manually
          console.log('\nNote: Some native modules may need to be rebuilt. Run "pnpm rebuild" if needed.\n');
        }
      }
      
      const green = '\x1b[32m';
      const reset = '\x1b[0m';
      console.log(`\n${green}✓${reset} Dependencies installed successfully!\n`);
    } catch (error) {
      const red = '\x1b[31m';
      const reset = '\x1b[0m';
      console.error(`\n${red}✗${reset} Error installing dependencies:`, error.message);
      console.log('You can install them manually later.\n');
    }
  }

  showSuccessMessage(name, packageManager, installDeps) {
    // ANSI color codes
    const reset = '\x1b[0m';
    const bright = '\x1b[1m';
    const cyan = '\x1b[36m';
    const green = '\x1b[32m';
    const yellow = '\x1b[33m';
    const blue = '\x1b[34m';
    const magenta = '\x1b[35m';
    const dim = '\x1b[2m';
    
    const text = 'Project initialized successfully!';
    const width = 40;
    const textWidth = text.length;
    const padding = Math.floor((width - textWidth) / 2);
    const equals = '='.repeat(width);
    const spacesBefore = ' '.repeat(Math.max(0, padding));
    const spacesAfter = ' '.repeat(Math.max(0, width - padding - textWidth));
    const middleLine = `${spacesBefore}${text}${spacesAfter}`;
    
    console.log('\n' + equals);
    console.log(middleLine);
    console.log(equals);
    console.log(`\n${bright}Project location:${reset} ${cyan}${this.projectDir}${reset}\n`);
    console.log(`${green}${bright}Your Node.js application is ready!${reset}\n`);
    console.log(`${yellow}${bright}Next steps:${reset}`);
    
    const commands = [];
    
    if (!this.useCurrentDir) {
      commands.push({ label: 'Navigate to project', cmd: `cd ${name}`, color: cyan });
    }
    
    if (!installDeps) {
      commands.push({ label: 'Install dependencies', cmd: `${packageManager} install`, color: blue });
    }
    
    commands.push(
      { label: 'Start application', cmd: `${packageManager} start`, color: green },
      { label: 'Start in development mode', cmd: `${packageManager} run dev`, color: magenta }
    );
    
    // Only add seed command if database is not 'none'
    if (this.answers.database && this.answers.database !== 'none') {
      commands.push({ label: 'Seed a test user', cmd: `${packageManager} run seed:user`, color: yellow });
    }
    
    commands.forEach(({ label, cmd, color }) => {
      console.log(`  ${color}${cmd}${reset}  ${dim}${label}${reset}`);
    });
    
    console.log('');
  }
}

module.exports = ProjectGenerator;
