const _      = require('lodash')
const io     = require('socket.io')()

const code   = require('./code')
const auth   = require('./auth')
const vote   = require('./vote')
const logger = require('../logger')

let data = {
  student: {
    id:         '',
    type:       '',
    department: ''
  },
  station: {
    id: '',
    name: ''
  },
  info: {
    title:   '',
    message: ''
  }
}

let store = {
  auth_api_token: '',
  vote_token:     '',
  data: data
}

const emit_initalise = () => {
  io.broadcast.emit('initialise', store.data)
}

const emit_update = newData => {
  _.assign(store.data, newData)
  logger.info(`update ${JSON.stringify(newData)}`)
  socket.broadcast.emit('update', store.data)
}

const message_packet = msg => {
  return {
    info: {
      title:   '',
      message: msg
    }
  }
}

const check_socket = () => {
  const room = io.sockets.adapter.rooms['/']
  return room.length > 0
}

/*
io.on('connection', socket => {
  socket.broadcast.
}) */

/**
 *  @method socket_initialise
 */
const socket_initialise = socket => {

  logger.info('socket client connected')
  emit_initalise()

  socket.on('accept', () => {
    const student    = store.data.student
    const vote_token = store.vote_token
    store.student = null // set it back to null for next one

    if (student !== null) {
      logger.debug('Acccept')
      logger.info(`accept student ${student.id}`)

      auth.confirm(store.auth_api_token, student.id, vote_token)
        .then(info => {
          /**
           *  @todo need to handle store.station_id in auth.js
           */
          return vote.get(store.data.station.id, info.ballot, info.callback_url)
            .then(slot => {
              const data = {
                slot:       slot,
                station_id: student.id
              }
              logger.info(`accept: preserve slot ${data.slot}`)
              socket.emit('confirmed', data)
            })
        })
        .catch(err => {
          logger.info(`receive error ${err}`)
          socket.emit('message', err)
        })
    } else {
      logger.info('Event accept: student is null')
      socket.emit('message', code.authentication_is_not_ready)
    }
  })

  socket.on('reject', () => {
    const student = store.student
    const onError = err => socket.emit('message', err)
    store.student = null // set it back to null for next one

    logger.info(`reject student ${student.id}`)
    // reject
    auth.reject(store.auth_api_token, student.id, student.token)
      .then(message => {
        socket.emit('message', message)
      }, reason => {
        socket.emit('message', reason)
      })
  })
}

/**
 *  set ping
 *  @method socket_ping
 */
const socket_ping = () => {
  if (check_socket()) {
    auth.ping(store.auth_api_token).catch(reason => {
      emit_update( message_packet(reason) )
    })
  }
}

/**
 *  @method middleware_requirement_factory
 *  @param {Array} args List of arguments
 *  @return {middleware}
 */
const middleware_requirement_factory = (args) => {
  return (req, res, next) => {
    const required = _.filter(args, arg => !(arg in req.body))
    // check required arguments
    if (required.length) {
      res.json({
        ok:  false,
        msg: `missing parameter(s): ${required.join(', ')}`
      })
    }
    next()
  }
}

/**
 *  Check whether shared socket exists or not
 *  @method middleware_check_socket_handler
 */
/**
const middleware_check_socket_handler = (req, res, next) => {
  if (store.socket === null) {
    res.json({
      ok:    false,
      fatal: true,
      msg:   'socket is not ready yet'
    })
  }
  next()
}
*/
const middleware_check_socket_handler = (req, res, next) => {
  if (check_socket() === false) {
    res.json({
      ok:    false,
      fatal: true,
      msg:   'socket is not ready yet'
    })
  }
  next()
}

/**
 *  @method middleware_check_update_busy
 */
const middleware_check_update_busy = (req, res, next) => {
  if (store.student !== null)
    res.send('system busy')
  next()
}

/**
 *  Handler for POST /update
 *  @method middleware_update_handler
 */
const middleware_update_handler = (req, res) => {
  // as per: https://github.com/azdkj532/mercurius/blob/master/controller.py#L43
  logger.info('recv update request')

  const student_id = req.body.student_id
  const card_id    = req.body.card_id

  auth.authenticate(store.auth_api_token, student_id, card_id)
    .then(data => {
      // student object contains token, id, type
      logger.debug(JSON.stringify(data))
      store.vote_token = data.vote_token
      socket.emit('authenticated', data.student)
      res.send('success')
    })
    .catch(reason => {
      logger.error(`authentication error: ${reason}`)
      emit_update( message_packet(reason) )
      res.send(reason)
    })
}

/**
 *  Handler for POST /login
 *  @method middleware_login_handler
 */
const middleware_login_handler = (req, res) => {
  // client station login
  auth.login(req.body.username, req.body.password)
    .then(info => {
      store.auth_api_token = info.auth_api_token
      emit_update( _.assign(info.station, message_packet(code.login.success)) )
      res.send('login success')
    })
    .catch(reason => {
      logger.info(`Login failed on reason: ${reason}`)
      emit_update( message_packet(reason) )
      res.send('login Failed')
    })
}

module.exports = {
  socket: {
    initialise: socket_initialise,
    ping:       socket_ping
  },
  middleware: {
    check: {
      requirement: middleware_requirement_factory,
      socket:      middleware_check_socket_handler,
      busy:        middleware_check_update_busy
    },
    handler: {
      update: middleware_update_handler,
      login:  middleware_login_handler
    }
  }
}
