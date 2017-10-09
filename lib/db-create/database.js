const pick = require('lodash.pick');

const {
  Alert,
  colors,
} = require('../utils');

module.exports = exports = async (server, schema) => {
  if (!schema.db) {
    Alert.warn(colors.warn(`"db" was not found in "${schema.__filename}"`));

    return undefined;
  }

  const name = schema.db.name;

  if (!name) {
    Alert.warn(colors.warn(`"db.name" was not found in "${schema.__filename}"`));

    return undefined;
  }

  const dbConfig = pick(schema.db, ['name', 'username', 'password']);
  const db = server.use(dbConfig);

  if (await isDbExists(server, name)) {
    Alert.warn(colors.warn(`"${name}" already exists`));

    return db;
  }

  await server.create(dbConfig);

  // Set database configs
  if (schema.db.lightweightEdges) {
    await db.query('ALTER DATABASE custom useLightweightEdges = true');
  }

  Alert.success(`Creating "${name}" database`);

  return db;
};

const isDbExists = exports.isDbExists = async (server, name) => {
  const dbList = await server.list();

  if (dbList.findIndex(i => i.name === name) > -1) {
    return true;
  }

  return false;
};

