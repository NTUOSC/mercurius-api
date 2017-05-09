const _      = require('lodash')

const logger = require('./logger')
const code   = require('./code')
const auth   = require('./auth')

const io     = require('socket.io')()
const app    = require('express')()

app.locals.shared = {
  student:      null,
  socket:       null,
  station_name: null
}


const checkRequirement = (args, obj) => _.filter(args, arg => arg in obj)

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
 *
 *  @param {required} student_id
 *  @param {required} card_id
 */
.post('/update', (req, res) => {
  const socket = res.locals.shared.socket

  // as per: https://github.com/azdkj532/mercurius/blob/master/controller.py#L43
  logger.info('recv update request')

  // check required arguments
  const required = checkRequirement(['student_id', 'card_id'], req.body)
  if (required.length) {
    return res.json({
      ok:  false,
      msg: `missing parameter(s): ${required.join(', ')}`
    })
  }

  if (res.locals.shared.student === null) {
    const student_id = req.body.student_id
    const card_id    = req.body.card_id

    auth.authenticate(student_id, card_id)
      .catch(reason => {
        logger.error(`receive error ${code.connection_error}`)
        socket.emit('message', code.connection_error)
        res.send(code.connection_error)
      })
      .then(student => {
        // student object contains token, id, type
        logger.debug(JSON.stringify(student))
        res.locals.shared.student = student
        socket.emit('authenticated',
          _.pick(student, ['id', 'type', 'department']) )
        res.send(code.success)
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
  const socket = res.locals.shared.socket

  // check required arguments
  const required = checkRequirement(['username', 'password'], req.body)
  if (required.length) {
    return res.json({
      ok:  false,
      msg: `missing parameter: ${required.join(', ')}`
    })
  }

  // client station login
  auth.login(req.body.username, req.body.password)
    .catch(reason => {
      logger.error('login connection error')
      socket.emit('message', code.connection_error)
      res.send('login Failed')
    })
    .then(station_name => {
      res.locals.shared.station_name = station_name
      socket.emit('station', station_name)
      socket.emit('message', code.login_success)
      res.send('login success')
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
    var student = app.locals.shared.student

    logger.debug('Acccept')
    logger.info(`accept student ${student.id}`)

    auth.confirm(student.id, student.token)
      .catch(reason => {
        logger.info(`receive error ${code.connection_error}`)
        socket.emit('message', code.connection_error)
        app.locals.shared.student = null // set it back to null for next one
      })
      .then(response => {
        logger.info(`receive information ${response}`)
        socket.emit('confirmed', response)
        app.locals.shared.student = null // set it back to null for next one
      })
  })

  socket.on('reject', () => {
    const student = app.locals.shared.student
    const onError = err => socket.emit('message', err)

    logger.info(`reject student ${student.id}`)
    // report
    auth.report(student.id, student.token)
      .catch(reason => {
        socket.emit('message', code.connection_error)
      })
      .then(body => {
        socket.emit('message', code.reject_success)
        app.locals.shared.student = null // set it back to null for next one
      })
  })
})

/**
 *  set ping
 */
setInterval(() => {
  const socket   = app.locals.shared.socket
  if (socket !== null) {
    auth.ping()
      .catch(reason => {
        logger.error('ping AUTH server connection error')
        socket.emit('message', code.connection_error)
      })
  }
}, 5000)

module.exports = {
  router: app,
  io:     io
}
