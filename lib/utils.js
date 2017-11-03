const path = require('path');
const {
  promisify,
  format,
} = require('util');
const fse = require('fs-extra');
const onExit = require('signal-exit');
const orientjs = require('orientjs');
const pkgDir = require('pkg-dir');
const mem = require('mem');
const yaml = require('js-yaml');
const glob = promisify(require('glob'));
const chalk = require('chalk');

const colors = exports.colors = chalk;

colors.success = chalk.green;
colors.danger = chalk.red;
colors.warn = chalk.keyword('orange');
colors.hint = chalk.gray;

const Alert = exports.Alert = {
  success(msg) {
    console.log(colors.success('✔ ') + msg); // eslint-disable-line no-console
  },

  warn(msg) {
    console.log(colors.warn('⚠ ') + msg); // eslint-disable-line no-console
  },

  fail(msg) {
    console.log(colors.danger('✖ ') + msg); // eslint-disable-line no-console
  },
};

const invariant = exports.invariant = (condition, msg, ...args) => {
  if (condition) {
    return;
  }

  let error;

  if (msg instanceof Error) {
    error = msg;
  } else {
    error = new Error(format(msg, ...args));
  }

  error.name = 'Invariant';
  error.stack = '';
  throw error;
};

exports.errorHandler = (title, err) => {
  if (err instanceof Error) {
    Alert.fail(
      (err.name !== 'Invariant' ? colors.danger.bold(`[${title}] `) : '')
      + colors.danger(String(err.message).trim())
      + (err.stack ? colors.hint(`\n${err.stack}`) : '')
    );
  } else {
    Alert.fail(
      colors.danger.bold(`[${title}] `)
      + colors.danger(err)
    );
  }
};

const getConfig = exports.getConfig = (argv = {}) => {
  const DEFAULT_ORIENTDB_HOST = 'localhost';
  const DEFAULT_ORIENTDB_PORT = 2424;
  const DEFAULT_ORIENTDB_USERNAME = 'root';
  const {
    ORIENTDB_HOST,
    ORIENTDB_PORT,
    ORIENTDB_USERNAME,
    ORIENTDB_PASSWORD,
  } = process.env;

  const config = getConfigFromFile(argv.config) || { db: {} };

  if (argv.odbPassword || ORIENTDB_PASSWORD) {
    const dbConfig = config.db;

    config.db = {
      ...dbConfig,
      host: argv.odbHost || ORIENTDB_HOST || dbConfig.host || DEFAULT_ORIENTDB_HOST,
      port: argv.odbPort || ORIENTDB_PORT || dbConfig.port || DEFAULT_ORIENTDB_PORT,
      username: argv.odbUsername || ORIENTDB_USERNAME || dbConfig.username ||
        DEFAULT_ORIENTDB_USERNAME,
      password: argv.odbPassword || ORIENTDB_PASSWORD || dbConfig.password,
    };
  }

  invariant(config.db.password, 'password is required');
  invariant(config.db.username, 'username is required');
  invariant(config.db.host, 'host is required');
  invariant(config.db.port, 'port is required');

  config.db.username = config.db.username.toString();
  config.db.password = config.db.password.toString();

  return config;
};

exports.getDb = dbConfig => {
  const config = getConfig();
  const server = getDbServer(config.db);

  return server.use(dbConfig);
};

const getDbServer = exports.getDbServer = mem(config => {
  const server = orientjs(config);
  const serverClose = server.close.bind(server);

  server.close = () => {
    serverClose();
    mem.clear(getDbServer);
  };

  onExit(server.close.bind(server));

  return server;
});

const getConfigFromFile = exports.getConfigFromFile = mem(configPath => {
  // Find config file in project's root directory
  if (!configPath) {
    const rootDir = pkgDir.sync(path.join(__dirname, '..', '..', '..'));

    configPath = glob.sync(path.join(rootDir, '?(.)orientxrc.{y?(a)ml,json,js}'), {
      nosort: true,
      dot: true,
    });

    if (configPath) {
      configPath = configPath[0];
    }
  }

  if (!configPath) {
    return undefined;
  }

  const config = readConfigFileSync(path.resolve(process.cwd(), configPath), false);

  if (!config) {
    return undefined;
  }

  return config;
});

const readConfigFileSync = exports.readConfigFileSync = (src, multi) => {
  if (typeof src === 'string') {
    return readAndParseFileSync(src, multi);
  }

  return src.map(i => readAndParseFileSync(i, multi));
};

const readAndParseFileSync = exports.readAndParseFileSync = (src, multi = true) => {
  try {
    switch (path.extname(src)) {
      case '.js':
        return require(src); // eslint-disable-line global-require, import/no-dynamic-require
      case '.json':
        return fse.readJsonSync(src);
      case '.yml':
      case '.yaml':
        return yaml[multi ? 'safeLoadAll' : 'safeLoad'](fse.readFileSync(src));
      default:
        invariant(false, `The file format is not supported: ${path.basename(src)}`);
    }
  } catch (e) {
    invariant(false, colors.danger.bold('[ParseError] ') + e.message);
  }

  return undefined;
};
