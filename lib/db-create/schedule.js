const pMap = require('p-map');
const yup = require('yup');

const {
  Alert,
  colors,
  invariant,
} = require('../utils');

module.exports = async (db, schema) => {
  if (!schema.schedule) {
    return;
  }

  // Get database info
  const dbScheduleList = await db.select('name')
    .from('OSchedule')
    .all();
  const dbScheduleMap = dbScheduleList.reduce((acc, i) => {
    acc[i.name] = true;

    return acc;
  }, {});
  const validatorSchema = yup.object({
    name: yup.string().required().matches(/^\w+$/, 'Schedule name must only includes alphanumeric characters, underscores and dashes: "${value}"'), // eslint-disable-line no-template-curly-in-string
    function: yup.string().required(),
    rule: yup.string().required(),
    arguments: yup.object(),
    startTime: yup.mixed().test({
      name: 'stringOrNumber',
      message: '${path} must be string or number', // eslint-disable-line no-template-curly-in-string
      test: value => {
        switch (typeof value) {
          case 'number':
          case 'string':
            return false;
          default:
            return true;
        }
      },
    }),
  }).from('startTime', 'starttime').noUnknown();

  // Create classes
  await pMap(Object.keys(schema.schedule), async scheduleKey => {
    const scheduleSchema = schema.schedule[scheduleKey];
    const scheduleName = scheduleSchema.name || scheduleKey;

    if (dbScheduleMap[scheduleName]) {
      Alert.warn(colors.warn.bold('[ScheduleIgnored] ') + colors.warn(`"${db.name}/SCHEDULE:${scheduleName}" already exists`) + colors.hint(`\n  at ${schema.__filename}`));

      return undefined;
    }

    try {
      const validatedSchema = await validatorSchema.validate({
        ...scheduleSchema,
        name: scheduleName,
      });

      const functionQuery = db.select()
        .from('OFunction')
        .where({ name: validatedSchema.function })
        .toString();

      delete validatedSchema.function;
      validatorSchema.starttime = new Date(validatedSchema.starttime);

      return db.insert()
        .into('OSchedule')
        .set(validatedSchema)
        .set(`function = (${functionQuery})`)
        .one();
    } catch (e) {
      e.message = colors.danger.bold('[ScheduleError] ') + e.message + colors.hint(`\n  at ${schema.__filename}`);
      invariant(false, e);
    }

    return undefined;
  }, { concurrency: 4 });

  Alert.success(`Creating "${db.name}" schedules`);
};
