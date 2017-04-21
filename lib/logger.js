const Winston  = require('winston')

const config   = require('../config')
const log_path = config.LOG_PATH || 'mercurius.log'

const logger   = new Winston.Logger({
  transports: [
    new Winston.transports.File({
      filename:         log_path,
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