const pMap = require('p-map');
const plur = require('plur');
const pascalCase = require('pascal-case');

const {
  Alert,
  colors,
} = require('../utils');

module.exports = exports = async (db, schema, title, filename) => {
  if (!schema) {
    return;
  }

  // Get database info
  const dbClassList = await getDbClassList(db, schema);
  const dbClassNames = dbClassList.reduce((acc, i) => {
    acc[i.name] = true;

    return acc;
  }, {});

  // Create classes
  await pMap(Object.keys(schema), async classKey => {
    const classSchema = schema[classKey];
    const className = classSchema.name || classKey;

    if (dbClassNames[className]) {
      Alert.warn(colors.warn.bold(`[${pascalCase(plur(title, 1))}Ignored] `) + colors.warn(`"${db.name}/CLASS:${className}" already exists`) + colors.hint(`\n  at ${filename}`));

      return undefined;
    }

    return db.class.create(
      className,
      null, // Set superClass later
      classSchema.cluster,
      classSchema.abstract
    );
  }, { concurrency: 4 });

  Alert.success(`Creating "${db.name}" ${plur(title, 10)}${colors.hint(`\n  at ${filename}`)}`);
};

const getDbClassList = exports.getDbClassList = async (db, classSchema, refresh = false) => {
  const classList = await db.class.list(refresh);

  if (classSchema) {
    return classList.filter(i => !!classSchema[i.name]);
  }

  return classList;
};

exports.superClass = async (db, schema, title, filename) => {
  const result = await pMap(Object.keys(schema), async classKey => {
    const classSchema = schema[classKey];

    if (!classSchema.superClass) {
      return undefined;
    }

    const className = classSchema.name || classKey;

    return db.class.update({
      name: className,
      superClass: classSchema.superClass,
    });
  });

  if (result.length && result[0]) {
    Alert.success(`Setting "${db.name}" ${plur(title, 10)}${colors.hint(`\n  at ${filename}`)}`);
  }
};

