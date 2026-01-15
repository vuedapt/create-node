/**
 * Generate package.json content
 */
function generatePackageJson(name, version, description, author, license, database, packageManager) {
  const baseDependencies = {
    'dotenv': '^16.0.0',
    'express': '^4.18.0',
    'cors': '^2.8.5',
    'bcrypt': '^5.1.0',
    'jsonwebtoken': '^9.0.0',
    'cookie-parser': '^1.4.6',
    '@vuedapt/logger': '^1.0.0'
  };

  const databaseDependencies = {
    'mongodb': { 'mongoose': '^8.0.0' },
    'postgresql': { 'pg': '^8.11.0' },
    'mysql': { 'mysql2': '^3.6.0' },
    'sqlite': { 'better-sqlite3': '^9.0.0' },
    'none': {}
  };

  return {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version,
    description,
    main: 'index.js',
    type: 'module',
    scripts: {
      start: 'node index.js',
      dev: 'nodemon index.js',
      'seed:user': 'node scripts/seed-user.js',
      test: 'echo "Error: no test specified" && exit 1'
    },
    keywords: [],
    author: author || '',
    license,
    dependencies: {
      ...baseDependencies,
      ...databaseDependencies[database]
    },
    devDependencies: {
      'nodemon': '^2.0.0'
    }
  };
}

module.exports = { generatePackageJson };
