const pMap = require('p-map');
const yup = require('yup');

const {
  Alert,
  colors,
  invariant,
} = require('../utils');

module.exports = async (db, schema) => {
  if (!schema.function) {
    return;
  }

  // Get database info
  const dbFuncList = await db.select('name')
    .from('OFunction')
    .all();
  const dbFuncMap = dbFuncList.reduce((acc, i) => {
    acc[i.name] = true;

    return acc;
  }, {});
  const validatorSchema = yup.object({
    name: yup.string().required().matches(/^\w+$/, 'Function name must only includes alphanumeric characters, underscores and dashes: "${value}"'), // eslint-disable-line no-template-curly-in-string
    code: yup.string().required(),
    parameters: yup.array().of(yup.string()),
    idempotent: yup.bool(),
    language: yup.string().oneOf(['sql', 'javascript']),
  }).noUnknown();

  // Create classes
  await pMap(Object.keys(schema.function), async funcKey => {
    const funcSchema = schema.function[funcKey];
    const funcName = funcSchema.name || funcKey;

    if (dbFuncMap[funcName]) {
      Alert.warn(colors.warn.bold('[FunctionIgnored] ') + colors.warn(`"${db.name}/${funcName}()" already exists`) + colors.hint(`\n  at ${schema.__filename}`));

      return undefined;
    }

    if (typeof funcSchema === 'string') {
      let validatedSchema;

      try {
        validatedSchema = await validatorSchema.validate({
          name: funcName,
          code: funcSchema,
        });
      } catch (e) {
        e.message = colors.danger.bold('[FunctionError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
        invariant(false, e);
      }

      return db.query(`CREATE FUNCTION ${db.escape(validatedSchema.name)} :code`, {
        params: {
          code: validatedSchema.code,
        },
      });
    }

    let validatedSchema;

    try {
      validatedSchema = await validatorSchema.validate({
        ...funcSchema,
        name: funcName,
      });
    } catch (e) {
      e.message = colors.danger.bold('[FunctionError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
      invariant(false, e);
    }

    const query = [];
    const params = {
      code: validatedSchema.code,
    };

    if (validatedSchema.parameters) {
      query.push(`PARAMETERS [${validatedSchema.parameters.map(i => db.escape(i)).join(',')}]`);
    }

    if (validatedSchema.idempotent) {
      query.push('IDEMPOTENT :idempotent');
      params.idempotent = validatedSchema.idempotent;
    }

    if (validatedSchema.language) {
      query.push('LANGUAGE :language');
      params.language = db.rawExpression(validatedSchema.language.toUpperCase());
    }

    return db.query(`CREATE FUNCTION ${db.escape(validatedSchema.name)} :code ${query.join(' ')}`, {
      params,
    });
  }, { concurrency: 4 });

  Alert.success(`Creating "${db.name}" functions${colors.hint(`\n  at ${schema.__filename}`)}`);
};
