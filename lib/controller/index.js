const _      = require('lodash')
const io     = require('socket.io')()

const code   = require('./code')
const auth   = require('./auth')
const vote   = require('./vote')
const logger = require('../logger')

let data = {
  msg_status: 'clean',
  student: {
    id:         '',
    type:       '',
    department: ''
  },
  station: {
    id:   '',
    name: ''
  },
  tablets:   [],
  slot:      '',
  error_msg: ''
}

let store = {
  is_busy:        false,
  auth_api_token: '',
  vote_token:     '',
  client_count:   0,
  data: data
}

const status_code = {
  authenticated: 'authenticated',
  confirmed:     'confirmed',
  message:       'message',
  clean:         'clean'
}

const emit_update = newData => {
  _.merge(store.data, newData)
  logger.info(`update ${JSON.stringify(newData)}`)
  io.broadcast.emit('update', store.data)
}

const emit_authenticated = newData => {
  _.merge(store.data, newData, { msg_status: status_code.authenticated })
  io.broadcast.emit('authenticated', store.data)
}

const emit_message = (msg, newData) => {
  const res = _.merge({}, newData, {
    msg_status: status_code.message,
    error_msg:  msg
  })
  emit_update(res)
}

const emit_confirmed = slot => {
  emit_update({
    msg_status: status_code.confirmed,
    slot:       slot
  })
}

/**
 *  check socket alive or not
 */
const check_socket = () => {
  // const room = io.sockets.adapter.rooms['/']
  return store.client_count > 0
}

/**
 *  @method auth_ping
 *    Keep pinging AUTH server when there has any socket
 */
const auth_ping = () => {
  if ( check_socket() ) {
    auth.ping(store.auth_api_token).catch(emit_message)
  }
}

/**
 *  @method panel_socket_accept
 *    Receive `accept` operation from panel.
 */
const panel_socket_accept = () => {
  const student = store.data.student
  // no student
  if (store.is_busy === false) {
    logger.info('Event accept: student is null')
    emit_message(code.authentication_is_not_ready)
    return
  }
  logger.debug('Acccept')
  logger.info(`accept student ${student.id}`)
  // confirm
  auth.confirm(store.auth_api_token, student.id, store.vote_token)
    .then(info => vote.get(store.data.station.id, info.ballot, info.callback_url))
    .then(slot => {
      logger.info(`accept: preserve slot ${slot}`)
      emit_confirmed(slot)
    })
    .catch(reason => {
      logger.info(`receive error ${reason}`)
      emit_message(reason)
    })
    .finally(() => {
      // free student
      emit_update({
        student: {
          id:   '',
          type: '',
          department: ''
        }
      })
      store.is_busy = false
    })
}

/**
 *  @method panel_socket_reject
 *    Receive `reject` operation from panel.
 */
const panel_socket_reject = () => {
  const student = store.data.student
  logger.info(`reject student ${store.data.student.id}`)
  // reject
  auth.reject(store.auth_api_token, student.id, student.token)
    .finally(msg => {
      // send message and free student
      emit_message(msg, {
        student: {
          id:   '',
          type: '',
          department: ''
        }
      })
      store.is_busy = false
    })
  
}

/**
 *  @method socket_initialise
 */
const socket_initialise = socket => {
  logger.info('socket client connected')
  store.client_count = store.client_count + 1
  socket.emit('initialise', store.data)
  socket.on('accept', panel_socket_accept)
  socket.on('reject', panel_socket_reject)

  socket.on('disconnect', reason => {
    store.client_count = store.client_count - 1
  })
}

/**
 *  @method middleware_requirement_factory
 *  @param {Array} args List of arguments
 *  @return {middleware}
 */
const middleware_requirement_factory = args => {
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
 *  @method middleware_check_socket_handler
 *    Check whether shared socket exists or not.
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
 *    @todo
 */
const middleware_check_update_busy = (req, res, next) => {
  if (is_busy)
    res.send('system busy')
  next()
}

/**
 *  @method middleware_update_handler
 *    Handler for POST /update
 */
const middleware_update_handler = (req, res) => {
  // as per: https://github.com/azdkj532/mercurius/blob/master/controller.py#L43
  logger.info('recv update request')
  auth.authenticate(store.auth_api_token, req.body.student_id, req.body.card_id)
    .then(info => {
      // student object contains token, id, type
      logger.debug(JSON.stringify(info))
      // store Vote token
      store.vote_token = info.vote_token
      store.is_busy    = true
      emit_authenticated(info.student)
      res.send('success')
    })
    .catch(reason => {
      logger.error(`authentication error: ${reason}`)
      emit_message(reason)
      res.send(reason)
    })
}

/**
 *  @method middleware_login_handler
 *    Handler for POST /login
 */
const middleware_login_handler = (req, res) => {
  // client station login
  auth.login(req.body.username, req.body.password)
    .then(info => {
      // store Auth API token
      store.auth_api_token = info.auth_api_token
      /** return { @const code.login.success } and { @const station } */
      emit_message(code.login.success, info.station)
      res.send('login success')
    })
    .catch(reason => {
      logger.info(`Login failed on reason: ${reason}`)
      emit_message(reason)
      res.send('login Failed')
    })
}

module.exports = {
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
  },
  ping: {
    auth: auth_ping
  },
  socket: {
    initialise: socket_initialise
  }
}
