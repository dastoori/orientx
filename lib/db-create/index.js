const pMap = require('p-map');

const {
  Alert,
  colors,
} = require('../utils');

module.exports = async (db, schema) => {
  if (!schema.index && !schema.class) {
    return;
  }

  const indexMap = [];

  // Add global indexes to map
  if (schema.index) {
    Object.keys(schema.index).forEach(indexKey => {
      const indexSchema = schema.index[indexKey];
      const isStringSchema = typeof indexSchema === 'string';
      const indexName = isStringSchema ?
        indexKey :
        (indexSchema.name || indexKey);
      const indexKeySplit = indexKey.split('.');

      indexMap.push({
        ...(isStringSchema ? undefined : indexSchema),
        name: indexName,
        type: isStringSchema ? indexSchema : indexSchema.type,
        class: indexSchema.class || indexKeySplit[0],
        properties: indexSchema.properties || indexKeySplit[1],
      });
    });
  }

  // Add class indexes to map
  Object.keys(schema.class).forEach(classKey => {
    const classSchema = schema.class[classKey];
    const classIndexSchema = classSchema.index || {};
    const className = classSchema.name || classKey;

    // Auto detect class and property
    Object.keys(classIndexSchema).forEach(indexKey => {
      const indexSchema = classIndexSchema[indexKey];
      const isStringSchema = typeof indexSchema === 'string';
      const indexName = isStringSchema ?
        indexKey :
        (indexSchema.name || indexKey);

      indexMap.push({
        ...(isStringSchema ? undefined : indexSchema),
        name: indexName,
        type: isStringSchema ? indexSchema : indexSchema.type,
        class: indexSchema.class || className,
        properties: indexSchema.properties || indexKey.split('.')[1],
      });
    });
  });

  const dbIndexMap = await getDbIndexMap(db);

  await pMap(indexMap, indexSchema => {
    if (dbIndexMap[indexSchema.name]) {
      Alert.warn(colors.warn.bold('[IndexIgnored]') + colors.warn(`"${indexSchema.name}" already exists`) + colors.hint(`\n  at ${schema.__filename}`));

      return undefined;
    }

    return db.index.create(indexSchema);
  });

  Alert.success(`Creating "${db.name}" indexes`);
};

const getDbIndexMap = async (db, refresh = false) => {
  const indexMap = await db.index.list(refresh);

  return indexMap.reduce((acc, i) => {
    acc[i.name] = true;

    return acc;
  }, {});
};
