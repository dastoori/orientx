const {
  Alert,
  colors,
} = require('../utils');

module.exports = exports = async (server, config, schema) => {
  if (!schema.db && !config.db) {
    Alert.warn(colors.warn('"db" config was not found'));

    return undefined;
  }

  const name = (schema.db && schema.db.name) || config.db.name;

  if (!name) {
    Alert.warn(colors.warn('"db.name" was not found'));

    return undefined;
  }

  const dbConfig = {
    ...config.db,
    ...schema.db,
  };
  const db = server.use(dbConfig);

  if (await isDbExists(server, name)) {
    if (!config.db || config.db.name !== name) {
      Alert.warn(colors.warn(`"${name}" already exists`));
    }

    return db;
  }

  await server.create(dbConfig);

  // Set database configs
  if (dbConfig.lightweightEdges || (schema.db && schema.db.lightweightEdges)) {
    await db.query('ALTER DATABASE custom useLightweightEdges = true');
  }

  Alert.success(`Creating "${name}" database${colors.hint(`\n  at ${schema.__filename}`)}`);

  return db;
};

const isDbExists = exports.isDbExists = async (server, name) => {
  const dbList = await server.list();

  if (dbList.findIndex(i => i.name === name) > -1) {
    return true;
  }

  return false;
};

