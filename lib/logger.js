var Winston = require('winston');

var config = require('../config.json');
var log_path = config.LOG_PATH || 'mercurius-union.log';

var logger = new Winston.Logger({
    transports: [
        new Winston.transports.File({
            filename: 'mercurius.log',
            timestamp: true,
            handleExceptions: true,
            prettyPrint: true,
            json: false,
            level: 'info'
        }),
        new Winston.transports.Console({
            timestamp: true,
            handleExceptions: true,
            prettyPrint: true,
            json: false,
            colorize: true,
            level: 'debug'
        })
    ]
});

module.exports = logger;
