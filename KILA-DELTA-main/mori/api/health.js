'use strict';
const { sendJson } = require('./_lib/guard');
module.exports = (req, res) => {
  let engine = false, sites = null;
  try { sites = require('./_lib/engine').listSites(); engine = true; } catch (e) {}
  sendJson(res, 200, { status: true, name: 'mori-aixi', node: process.version, engine, sites });
};
