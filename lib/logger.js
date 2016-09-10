var Winston = require('winston');

var config = require('../config.json');

var logger = new Winston.Logger({
    transports: [
        new Winston.transports.Console({
            handleExceptions: true,
            prettyPrint: true,
            json: false,
            colorize: true,
            level: 'debug'
        })
    ]
});

module.exports = logger;
