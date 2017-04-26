const Winston   = require('winston')

const config    = require('../config')
const pathToLog = config.LOG_PATH || 'mercurius.log'

const logger   = new Winston.Logger({
  transports: [
    new Winston.transports.File({
      filename:         pathToLog,
      timestamp:        true,
      handleExceptions: true,
      prettyPrint:      true,
      json:             false,
      level:            'info'
    }),
    new Winston.transports.Console({
      colorize:         true,
      timestamp:        true,
      handleExceptions: true,
      prettyPrint:      true,
      json:             false,
      level:            'debug'
    })
  ]
})

module.exports = logger