#!/usr/bin/env node

const {
  Alert,
  colors,
  errorHandler,
} = require('../lib/utils');

/**
 * Set error handlers
 */

process.on('uncaughtException', errorHandler.bind(null, 'Exception'));
process.on('unhandledRejection', errorHandler.bind(null, 'UnhandledRejection'));

const program = require('commander');

const dbSchema = require('../lib/db-schema');
const {
  getConfig,
} = require('../lib/utils');
const migrate = require('../lib/migrate');
const pkg = require('../package.json');

process.title = pkg.name;

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('<command> [options]')
  .option('-c, --config <config>', 'orientx configuration file')
  .option('--odb-host <host>', 'orientdb server host')
  .option('--odb-port <port>', 'orientdb server port')
  .option('--odb-username <username>', 'orientdb server username')
  .option('--odb-password <password>', 'orientdb server password');

program
  .command('db:create <schema>')
  .alias('dbc')
  .description('create database structure from one or more schemas')
  .action(async schema => {
    const config = getConfig(program);

    await dbSchema.create(schema, config);
  });

program
  .command('db:drop <name...>')
  .alias('dbd')
  .description('drop one or more database')
  .action(async name => {
    const config = getConfig(program);

    await dbSchema.drop(name, config);
  });

program
  .command('migrate')
  .alias('m')
  .description('database migration')
  .option('--template-file')
  .allowUnknownOption()
  .action(async options => {
    await migrate(program, options);
  });

program
  .action(() => {
    Alert.fail(colors.danger`Invalid command`);
  });

if (process.argv.length === 2) {
  program.outputHelp();
  console.log(); // eslint-disable-line no-console
  Alert.fail(colors.danger`Command is missing`);
  process.exit(1);
}

program.parse(process.argv);
