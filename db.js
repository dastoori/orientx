const {
  getDb,
  getDbServer,
} = require('./lib/utils');
const orientjs = require('orientjs');

module.exports = exports = getDb;
exports.getServer = getDbServer;
exports.orientjs = orientjs;
