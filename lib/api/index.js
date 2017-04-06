const io      = require('socket.io')()

const logger  = require('../logger')
const vote    = require('../vote')

const app     = require('express')()

app.locals.shared = {
  student:      null,
  socket:       null,
  station_name: null
}

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

  var required_args = ['student_id', 'card_id']

  for (var x in required_args) {
    if (req.body[required_args[x]] === null) {
      return res.json({
        ok:  false,
        msg: `missing parameter: ${required_args[x]}`
      })
    }
  }

  if (res.locals.shared.student === null) {
    var student_id = req.body.student_id
    var card_id    = req.body.card_id

    vote.authenticate(student_id, card_id, (err, student) => {
        if (err) {
          logger.error(`receive error ${err}`)
          socket.emit('message', err)
          res.send(err)
        } else {
          // student object contains token, id, type
          logger.debug(JSON.stringify(student))
          res.locals.shared.student = student
          socket.emit('authenticated', {
              id:         student.id,
              type:       student.type,
              department: student.department,
          })
          res.send('success')
        }
    })
  } else {
    res.send('system busy')
  }
})
/**
 *  POST /login
 */
.post('/login', (req, res) => {
  var required_args = ['username', 'password']

  for (var x in required_args) {
    if (req.body[required_args[x]] === null) {
      return res.json({
        ok:  false,
        msg: `missing parameter: ${required_args[x]}`
      })
    }
  }

  var socket = res.locals.shared.socket
  vote.login(req.body.username, req.body.password, (err, station_name) => {
      if (err) {
        socket.emit('message', err)
        res.send('login Failed')
      } else {
        res.locals.shared.station_name = station_name
        socket.emit('station', station_name)
        socket.emit('message', 'login_success')
        res.send('login success')
      }
  })
})

io.on('connection', (socket) => {
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

    vote.confirm(student.id, student.token, (err, response) => {
      if (err) {
        logger.info(`receive error ${err}`)
        socket.emit('message', err)
      } else {
        logger.info(`receive information ${response}`)
        socket.emit('confirmed', response)
      }
      app.locals.shared.student = null // set it back to null for next one
    })
  })

  socket.on('reject', () => {
    var student = app.locals.shared.student

    logger.info(`reject student ${student.id}`)
    vote.report(student.id, student.token, (err, message) => {
      if (err) {
        socket.emit('message', err)
      } else {
        socket.emit('message', message)
      }
      app.locals.shared.student = null // set it back to null for next one
    })
  })
})

setInterval(() => {
  var socket = app.locals.shared.socket
  if (socket !== null) {
    vote.ping(error => {
      if (error !== null)
        socket.emit('message', error)
    })
  }
}, 5000)

module.exports = {
  router: app,
  io:     io
}
