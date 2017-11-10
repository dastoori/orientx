const { promisify } = require('util');
const pMap = require('p-map');
const glob = promisify(require('glob'));
const flatten = require('lodash.flatten');

const {
  Alert,
  colors,
  invariant,
  getDbServer,
  readConfigFileSync,
} = require('../lib/utils');
const createDatabase = require('./db-create/database');
const createSequence = require('./db-create/sequence');
const createFunction = require('./db-create/function');
const createSchedule = require('./db-create/schedule');
const createCluster = require('./db-create/cluster');
const createClass = require('./db-create/class');
const createClassProps = require('./db-create/class-props');
const createEdge = require('./db-create/edge');
const createIndex = require('./db-create/index');

exports.create = async (schemaPattern, config) => {
  const server = getDbServer(config.server);
  const schemaPaths = await glob(schemaPattern);

  invariant(schemaPaths.length, 'The schema file coud not be found');

  const schemaList = flatten(readConfigFileSync(schemaPaths));

  Alert.success('Loading schema');

  try {
    const callbacks = await pMap(
      schemaList,
      (schema, i) => {
        schema.__filename = schemaPaths[i];

        return createFromSchema(server, config, schema);
      },
      { concurrency: 1 }
    );

    await pMap(callbacks, cb => cb(), { concurrency: 4 });
  } catch (e) {
    e.message += colors.hint(`\n${e.stack}`);
    invariant(false, e);
  } finally {
    server.close();
  }
};

exports.drop = async (names, config) => {
  const server = getDbServer(config.server);

  try {
    await pMap(names, async name => {
      const dbExists = await createDatabase.isDbExists(server, name);

      if (dbExists) {
        await server.drop(name);
        Alert.success(`Dropping "${name}"`);
      } else {
        Alert.warn(colors.warn(`"${name}" doesn't exist`));
      }
    }, { concurrency: 4 });
  } catch (e) {
    e.message += colors.hint(`\n${e.stack}`);
    invariant(false, e);
  } finally {
    server.close();
  }
};

async function createFromSchema(server, config, schema) {
  const db = await createDatabase(server, config, schema);

  if (!db) {
    return undefined;
  }

  // Independent entities
  await createSequence(db, schema);
  await createFunction(db, schema);
  await createSchedule(db, schema);
  await createCluster(db, schema);
  await createClass(db, schema.class, 'class', schema.__filename);

  return async () => {
    // Dependent entities
    await createClass.superClass(db, schema.class, 'super class', schema.__filename);
    await createClassProps(db, schema.class, 'class property', schema.__filename);
    await createEdge(db, schema);
    await createIndex(db, schema);
  };
}

