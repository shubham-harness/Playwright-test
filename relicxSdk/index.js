const RelicxSDK = require('./src/relicxSdk');
const { relicxTasks } = require('./cypress/plugins/index');
const { setupRelicxCommands } = require('./cypress/support/commands');

module.exports = { RelicxSDK, relicxTasks, setupRelicxCommands };