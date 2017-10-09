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
      classSchema.parent,
      classSchema.cluster,
      classSchema.abstract
    );
  }, { concurrency: 4 });

  Alert.success(`Creating "${db.name}" ${plur(title, 10)}`);
};

const getDbClassList = exports.getDbClassList = async (db, classSchema, refresh = false) => {
  const classList = await db.class.list(refresh);

  if (classSchema) {
    return classList.filter(i => !!classSchema[i.name]);
  }

  return classList;
};
