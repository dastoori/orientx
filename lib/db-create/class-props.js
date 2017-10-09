const pMap = require('p-map');
const plur = require('plur');
const pascalCase = require('pascal-case');

const {
  Alert,
  colors,
} = require('../utils');
const { getDbClassList } = require('./class');

module.exports = async (db, schema, title, filename) => {
  if (!schema) {
    return;
  }

  // Get database info
  const dbClassList = await getDbClassList(db, schema);
  const dbClassMap = dbClassList.reduce((acc, i) => {
    acc[i.name] = i;

    return acc;
  }, {});
  const dbClassMapProps = dbClassList.reduce((classMap, c) => {
    classMap[c.name] = c.properties.reduce((propsMap, p) => {
      propsMap[p.name] = true;

      return propsMap;
    }, {});

    return classMap;
  }, {});

  // Create properties
  await pMap(Object.keys(schema), classKey => {
    const classSchema = schema[classKey];
    const className = classSchema.name || classKey;

    if (!classSchema.props) {
      return undefined;
    }

    const classObject = dbClassMap[className];
    const dbClassPropsMap = dbClassMapProps[className];
    const propsKeys = Object.keys(classSchema.props);
    const propsList = propsKeys.reduce((acc, propKey) => {
      const propSchema = classSchema.props[propKey];
      const isStringSchema = typeof propSchema === 'string';
      const propName = isStringSchema ?
        propKey :
        (propSchema.name || propKey);

      if (dbClassPropsMap[propName]) {
        Alert.warn(colors.warn.bold(`[${pascalCase(plur(title, 1))}Ignored] `) + colors.warn(`"${db.name}/CLASS:${className}.${propName}" already exists`) + colors.hint(`\n  at ${filename}`));

        return acc;
      }

      if (isStringSchema) {
        acc.push({
          name: propKey,
          type: propSchema,
        });

        return acc;
      }

      acc.push({
        name: propName,
        ...propSchema,
      });

      return acc;
    }, []);

    return classObject.property.create(propsList);
  }, { concurrency: 8 });

  Alert.success(`Creating "${db.name}" ${plur(title, 10)}`);
};
