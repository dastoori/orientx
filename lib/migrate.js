const path = require('path');
const childProcess = require('child_process');
const npmRunPath = require('npm-run-path');
const minimist = require('minimist');
const dargs = require('dargs');
const chalk = require('chalk');

const { invariant } = require('./utils');

module.exports = (program, options) => {
  const env = npmRunPath.env();

  // Set orientdb options in env
  if (program.host) {
    env.ORIENTDB_HOST = program.host;
  }

  if (program.port) {
    env.ORIENTDB_PORT = program.port;
  }

  if (program.username) {
    env.ORIENTDB_USERNAME = program.username;
  }

  if (program.password) {
    env.ORIENTDB_PASSWORD = program.password;
  }

  // Force `migrate` output to have color (only if color supported)
  if (chalk.supportsColor) {
    env.FORCE_COLOR = 1;
  }

  // Exclude orientdb options from argv
  const argvList = dargs(minimist(program.rawArgs.slice(3)), {
    excludes: ['config', 'c', 'odb-host', 'odb-port', 'odb-username', 'odb-password'],
  });

  // Add default template option
  if (program.rawArgs[0] === 'create' && !options.templateFile) {
    argvList.push('--template-file', path.join(__dirname, 'migrate.tmpl.js'));
  }

  childProcess.execFile(
    'migrate',
    argvList,
    { env },
    (err, stdout) => {
      invariant(!err, err && (err.message + stdout));

      console.log(stdout); // eslint-disable-line no-console
    }
  );
};
