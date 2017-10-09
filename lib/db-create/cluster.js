const pMap = require('p-map');
const yup = require('yup');

const {
  Alert,
  colors,
  invariant,
} = require('../utils');

module.exports = async (db, schema) => {
  if (!schema.cluster) {
    return;
  }

  // Get database info
  const dbClusterList = await db.cluster.list();
  const dbClusterMap = dbClusterList.reduce((acc, i) => {
    acc[i.name] = true;

    return acc;
  }, {});
  const validatorSchema = yup.object({
    name: yup.string().required().matches(/^[\w-]+$/, 'Cluster name must only includes alphanumeric characters, underscores and dashes: "${value}"'), // eslint-disable-line no-template-curly-in-string
    id: yup.number().positive(),
  }).noUnknown();

  // Create classes
  await pMap(Object.keys(schema.cluster), async clusterKey => {
    const clusterSchema = schema.cluster[clusterKey];
    const clusterName = (clusterSchema ? clusterSchema.name : clusterKey) || clusterKey;

    if (dbClusterMap[clusterName]) {
      Alert.warn(colors.warn.bold('[ClusterIgnored] ') + colors.warn(`"${db.name}/CLUSTER:${clusterName}" already exists`) + colors.hint(`\n  at ${schema.__filename}`));

      return undefined;
    }

    if (typeof clusterSchema !== 'object') {
      let validatedSchema;

      try {
        validatedSchema = await validatorSchema.validate({
          name: clusterName,
          id: clusterSchema,
        });
      } catch (e) {
        e.message = colors.danger.bold('[ClusterError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
        invariant(false, e);
      }

      let query = '';

      if (validatedSchema.id) {
        query += `ID ${validatedSchema.id}`;
      }

      return db.query(`CREATE CLUSTER ${db.escape(validatedSchema.name)} ${query}`);
    }

    let validatedSchema;

    try {
      validatedSchema = await validatorSchema.validate({
        ...clusterSchema,
        name: clusterName,
      });
    } catch (e) {
      e.message = colors.danger.bold('[ClusterError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
      invariant(false, e);
    }

    let query = '';

    if (validatedSchema.id) {
      query += `ID ${validatedSchema.id}`;
    }

    return db.query(`CREATE CLUSTER ${db.escape(validatedSchema.name)} ${query}`);
  }, { concurrency: 4 });

  Alert.success(`Creating "${db.name}" clusters`);
};
