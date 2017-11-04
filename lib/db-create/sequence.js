const pMap = require('p-map');
const yup = require('yup');

const {
  Alert,
  colors,
  invariant,
} = require('../utils');

module.exports = async (db, schema) => {
  if (!schema.sequence) {
    return;
  }

  // Get database info
  const dbSeqList = await db.select('name')
    .from('OSequence')
    .all();
  const dbSeqMap = dbSeqList.reduce((acc, i) => {
    acc[i.name] = true;

    return acc;
  }, {});
  const validatorSchema = yup.object({
    name: yup.string().required().matches(/^\w+$/, 'Sequence name must only includes alphanumeric characters, underscores and dashes: "${value}"'), // eslint-disable-line no-template-curly-in-string
    type: yup.string().oneOf(['ordered', 'cached']).required(),
    start: yup.number().positive(),
    incr: yup.number().positive(),
    cache: yup.number().positive(),
  }).noUnknown();

  // Create classes
  await pMap(Object.keys(schema.sequence), async seqKey => {
    const seqSchema = schema.sequence[seqKey];
    const seqName = seqSchema.name || seqKey;

    if (dbSeqMap[seqName]) {
      Alert.warn(colors.warn.bold('[SequenceIgnored] ') + colors.warn(`"${db.name}/sequence('${seqName}')" already exists`) + colors.hint(`\n  at ${schema.__filename}`));

      return undefined;
    }

    if (typeof seqSchema === 'string') {
      let validatedSchema;

      try {
        validatedSchema = await validatorSchema.validate({
          name: seqName,
          type: seqSchema,
        });
      } catch (e) {
        e.message = colors.danger.bold('[SequenceError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
        invariant(false, e);
      }

      return db.query(`CREATE SEQUENCE ${db.escape(validatedSchema.name)} TYPE ${db.escape(validatedSchema.type)}`);
    }

    try {
      const validatedSchema = await validatorSchema.validate({
        ...seqSchema,
        name: seqName,
      });
      const query = [];

      if (validatedSchema.start) {
        query.push(`START ${validatedSchema.start}`);
      }

      if (validatedSchema.incr) {
        query.push(`INCREMENT ${validatedSchema.incr}`);
      }

      if (validatedSchema.cache) {
        query.push(`CACHE ${validatedSchema.cache}`);
      }

      return db.query(`CREATE SEQUENCE ${db.escape(validatedSchema.name)} TYPE ${db.escape(validatedSchema.type)} ${query.join(' ')}`);
    } catch (e) {
      e.message = colors.danger.bold('[SequenceError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
      invariant(false, e);
    }

    return undefined;
  }, { concurrency: 4 });

  Alert.success(`Creating "${db.name}" sequences${colors.hint(`\n  at ${schema.__filename}`)}`);
};
