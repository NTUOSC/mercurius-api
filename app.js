const http    = require('http')
const express = require('express')
const morgan  = require('morgan')
const parser  = require('body-parser')
const bonjour = require('bonjour')()

const config  = require('./config')
const logger  = require('./lib/logger')

const app     = express()
const server  = http.Server(app)
const api     = require('./lib/api')

const PORT    = config.PORT || 9487

// for the future
const env = process.env.NODE_ENV || 'development'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

app
.use( morgan('combined') )
.use( express.static(`${__dirname}/panel/dist`) )
.use( parser.urlencoded({ extended: true }) )
// api layer
.use('/api', api.router)

server
.listen(PORT, err => {
  if (err)
    throw err
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
  pingTimeout:  2000,
  pingInterval: 5000
})
