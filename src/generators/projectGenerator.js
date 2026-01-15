const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { generatePackageJson } = require('../utils/packageJson');
const templates = require('../templates/index');

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

    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.projectDir, dir));
    }
  }

  async generatePackageJson(name, version, description, author, license, database, packageManager) {
    const packageJson = generatePackageJson(name, version, description, author, license, database, packageManager);
    await fs.writeJson(path.join(this.projectDir, 'package.json'), packageJson, { spaces: 2 });
  }

  async generateIndexJs(database) {
    const content = templates.getIndexJs(database);
    await fs.writeFile(path.join(this.projectDir, 'index.js'), content);
  }

  async generateDatabaseConfig(database) {
    const content = templates.getDatabaseConfig(database);
    await fs.writeFile(path.join(this.projectDir, 'configs', 'database.js'), content);
  }

  async generateAuthFiles() {
    const authController = templates.getAuthController();
    const authMiddleware = templates.getAuthMiddleware();
    
    await fs.writeFile(path.join(this.projectDir, 'controllers', 'auth.controller.js'), authController);
    await fs.writeFile(path.join(this.projectDir, 'middlewares', 'auth.middleware.js'), authMiddleware);
  }

  async generateUserModel(database) {
    const content = templates.getUserModel(database);
    await fs.writeFile(path.join(this.projectDir, 'models', 'user.model.js'), content);
  }

  async generateRoutes() {
    const content = templates.getAuthRoute();
    await fs.writeFile(path.join(this.projectDir, 'routes', 'auth.route.js'), content);
  }

  async generateUtils() {
    const jwtContent = templates.getJwtUtil();
    await fs.writeFile(path.join(this.projectDir, 'utils', 'jwt.js'), jwtContent);
  }

  async generateSeedScript(database) {
    if (database !== 'none') {
      const content = templates.getSeedUserScript(database);
      await fs.writeFile(path.join(this.projectDir, 'scripts', 'seed-user.js'), content);
    }
  }

  async generateEnvExample(database, name) {
    const content = templates.getEnvExample(database, name);
    await fs.writeFile(path.join(this.projectDir, '.env.example'), content);
  }

  async generateGitignore() {
    const content = templates.getGitignore();
    await fs.writeFile(path.join(this.projectDir, '.gitignore'), content);
  }

  async generateReadme(name, description, packageManager, database) {
    const content = templates.getReadme(name, description, packageManager, database);
    await fs.writeFile(path.join(this.projectDir, 'README.md'), content);
  }

  async generateGitkeep() {
    await fs.writeFile(path.join(this.projectDir, 'uploads', '.gitkeep'), '');
  }

  async installDependencies(packageManager) {
    console.log('Installing dependencies...\n');
    try {
      const installCmd = packageManager === 'npm' ? 'npm install' : 
                        packageManager === 'yarn' ? 'yarn install' : 
                        'pnpm install';
      execSync(installCmd, { 
        cwd: this.projectDir, 
        stdio: 'inherit' 
      });
      console.log('\nDependencies installed!\n');
    } catch (error) {
      console.error('\nError installing dependencies:', error.message);
      console.log('You can install them manually later.\n');
    }
  }

  showSuccessMessage(name, packageManager, installDeps) {
    console.log('\nProject initialized successfully!');
    console.log(`Project created at: ${this.projectDir}\n`);
    console.log('Your Node.js application is ready!\n');
    console.log('Next steps:');
    if (!this.useCurrentDir) {
      console.log(`  cd ${name}`);
    }
    if (!installDeps) {
      console.log(`  ${packageManager} install`);
    }
    console.log(`  ${packageManager} start\n`);
  }
}

module.exports = ProjectGenerator;
