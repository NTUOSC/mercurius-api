const http    = require('http')
const express = require('express')
const request = require('request')
const Promise = require('bluebird')
const winston = require('winston')
const morgan  = require('morgan')
const bonjour = require('bonjour')()

const config  = require('./config')
const logger  = require('./lib/logger')
const vote    = require('./lib/vote')

var app       = express()
var server    = http.Server(app)
var api       = require('./lib/api')

var PORT = config.PORT || 8080

// for the future
var env = process.env.NODE_ENV || 'development'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

app
.use( morgan('combined') )
.use( express.static(`${__dirname}/dist`) )
.use( require('body-parser').urlencoded({ extended: true }) )
.use('/api', api.router)

server
.listen(PORT, (err) => {
  if (err) throw err

  logger.info(`Server listening on port ${PORT}.`)

  // advertise an HTTP server
  bonjour.publish({
    name: 'Card Reader Server',
    host: 'vote.local',
    type: 'http',
    port: PORT
  })
})

api.io.attach(server, {
  'pingTimeout': 2000,
  'pingInterval': 5000
})
