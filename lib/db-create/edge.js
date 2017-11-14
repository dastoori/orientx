const createClass = require('./class');
const createClassProps = require('./class-props');

module.exports = async (db, schema) => {
  if (!schema.edge) {
    return;
  }

  Object.keys(schema.edge).forEach(edgeKey => {
    let edge = schema.edge[edgeKey];

    if (typeof edge === 'string') {
      edge = schema.edge[edgeKey] = {
        name: edgeKey,
        superClass: edge,
      };
    }

    if (!edge.superClass) {
      edge.superClass = 'E';
    }
  });

  await createClass(db, schema.edge, 'edge', schema.__filename);
  await createClass.superClass(db, schema.edge, 'edge super class', schema.__filename);
  await createClassProps(db, schema.edge, 'edge property', schema.__filename);
};
