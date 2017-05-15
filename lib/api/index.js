const _      = require('lodash')
const aarrr  = require('request-promise/errors')

const logger = require('../logger')
const auth   = require('./auth')

const io     = require('socket.io')()
const app    = require('express')()

app.locals.shared = {
  student:      null,
  socket:       null,
  station_name: null,
  lock: false
}

const checkRequirement = (args, obj) => _.filter(args, arg => !(arg in obj))

app
.use((req, res, next) => {
  // inject socket for each request to allow communications
  res.locals.shared = app.locals.shared
  next()
})
// Checking socket status
.use((req, res, next) => {
  if (res.locals.shared.socket === null) {
    return res.json({
      ok:    false,
      fatal: true,
      msg:   'socket is not ready yet'
    })
  }
  next()
})
/**
 *  GET /info
 */
.get('/info', (req, res) => {
  // TODO: to push custom info to the client
})
/**
 *  POST /update
 */
.post('/update', (req, res) => {
  var socket = res.locals.shared.socket

  // as per: https://github.com/azdkj532/mercurius/blob/master/controller.py#L43
  logger.info('recv update request')

  const required = checkRequirement(['student_id', 'card_id'], req.body)
  if (required.length) {
    return res.json({
      ok:  false,
      msg: `missing parameter: ${required.join(', ')}`
    })
  }

  if (!res.locals.shared.lock) {
    res.locals.shared.lock = true
    const student_id = req.body.student_id
    const card_id    = req.body.card_id

    socket('attached', student_id)
    const onError  = err => {
      logger.error(`receive error ${err}`)
      socket.emit('message', err)
      res.send(err)
    }

    auth.authenticate(student_id, card_id)
      .then(student => {
        // student object contains token, id, type
        logger.debug(JSON.stringify(student))
        res.locals.shared.student = student
        socket.emit('authenticated', {
            id:         student.id,
            type:       student.type,
            department: student.department,
        })
        res.send('success')
      }, reason => {
        logger.error(`authentication error: ${reason}`)
        onError(reason)
        res.locals.shared.lock = false
      })
  } else {
    res.send('system busy')
  }
})
/**
 *  POST /login
 *
 *  @param {required} username
 *  @param {required} password
 */
.post('/login', (req, res) => {
  const required = checkRequirement(['username', 'password'], req.body)
  if (required.length) {
    return res.json({
      ok:  false,
      msg: `missing parameter: ${required.join(', ')}`
    })
  }

  const socket   = res.locals.shared.socket
  // client station login
  auth.login(req.body.username, req.body.password)
  .then(station_name => {
    res.locals.shared.station_name = station_name
    socket.emit('station', station_name)
    socket.emit('message', 'login_success')
    res.send('login success')
  })
  .catch(reason => {
    logger.info(`Login Failed on reason: ${reason}`)
    socket.emit('message', reason)
    res.send('login Failed')
  })
})

io.on('connection', socket => {
  logger.info('socket client connected')
  // XXX: will only respond to the last socket
  app.locals.shared.socket = socket

  // mention that is authenticated
  if (app.locals.shared.student !== null) {
      socket.emit('authenticated', {
          id:         app.locals.shared.student.id,
          type:       app.locals.shared.student.type,
          department: app.locals.shared.student.department,
      })
  }

  // restore station name
  if (app.locals.shared.station_name !== null) {
      socket.emit('station', app.locals.shared.station_name)
  }

  socket.on('accept', () => {
    const student = app.locals.shared.student

    if (student !== null) {
      logger.debug('Acccept')
      logger.info(`accept student ${student.id}`)

      auth.confirm(student.id, student.token)
      .then(data => {
        logger.info(`accept: preserve slot ${data.slot}`)
        socket.emit('confirmed', data)
        app.locals.shared.student = null // set it back to null for next one
        setTimeout(function() { app.locals.shared.lock = false; logger.debug(app.locals.shared.lock) }, 10000); // unlock after 10s
      }, err => {
        logger.info(`receive error ${err}`)
        socket.emit('message', err)
      })
    } else {
      logger.warning('Event accept: student is null')
      socket.emit('message', 'authentication_is_not_ready')
    }
  })

  socket.on('reject', () => {
    const student = app.locals.shared.student
    const onError = err => socket.emit('message', err)

    logger.info(`reject student ${student.id}`)
    // report
    auth.report(student.id, student.token, onError)
    .then(message => {
      socket.emit('message', message)
      app.locals.shared.student = null // set it back to null for next one
      setTimeout(function() { app.locals.shared.lock = false; logger.debug(app.locals.shared.lock) }, 10000); // unlock after 10s
    }, reason => {
      socket.emit('message', reason)
    })
  })
})

/**
 *  set ping
 */
setInterval(() => {
  const socket   = app.locals.shared.socket
  const onEaarrr = err => socket.emit('message', err)
  if (socket !== null) {
    auth.ping().catch(onEaarrr)
  }
}, 5000)

module.exports = {
  router: app,
  io:     io
}
