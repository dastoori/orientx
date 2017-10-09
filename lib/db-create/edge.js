const createClass = require('./class');
const createClassProps = require('./class-props');

module.exports = async (db, schema) => {
  if (!schema.edge) {
    return;
  }

  Object.keys(schema.edge).forEach(edgeKey => {
    const edge = schema.edge[edgeKey];

    if (!edge.parent) {
      edge.parent = 'E';
    }
  });

  await createClass(db, schema.edge, 'edge', schema.__filename);
  await createClassProps(db, schema.edge, 'edge property', schema.__filename);
};
