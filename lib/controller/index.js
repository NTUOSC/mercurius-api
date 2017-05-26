const _      = require('lodash')
const io     = require('socket.io')()

const code    = require('./code')
const auth    = require('./auth')
const vote    = require('./vote')
const logger  = require('../logger')

const store  = require('./store')

/**
 *  check socket alive or not
 */
const check_socket = () => {
  // const room = io.sockets.adapter.rooms['/']
  return store.get.private().client_count > 0
}

/**
 *  @method auth_ping
 *    Keep pinging AUTH server when there has any socket
 */
const auth_ping = () => {
  if ( check_socket() ) {
    auth.ping(store.get.private().auth_api_token).catch(store.message)
  }
}

/**
 *  @method panel_socket_accept
 *    Receive `accept` operation from panel.
 */
const panel_socket_accept = () => {
  const student = store.get.public().student
  // no student
  if (store.is_busy === false) {
    logger.info('Event accept: student is null')
    store.message(code.authentication_is_not_ready)
    return
  }
  logger.debug('Acccept')
  logger.info(`accept student ${student.id}`)
  // confirm
  auth.confirm(store.auth_api_token, student.id, store.vote_token)
    .then( info => vote.get(store.data.station.id, info.ballot, info.callback_url) )
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
      setTimeout(function() { store.isLock = false }, 10000); // unisLock after 10s
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
      setTimeout(function() { store.isLock = false }, 10000); // unisLock after 10s
    })
}

/**
 *  @method socket_initialise
 */
const socket_initialise = socket => {
  logger.info('socket client connected')
  
  // XXX: will only respond to the last socket
  if (store.socket !== null)
    store.socket.disconnect(true)
  store.socket = socket

  store.client_count = store.client_count + 1

  socket.emit('initialise', store.data)
  socket.on('accept', panel_socket_accept)
  socket.on('reject', panel_socket_reject)

  socket.on('disconnect', reason => {
    store.client_count = store.client_count - 1
  })
}

/**
 *  set update tablet status
 *  @method socket_update_tablet
 */
const socket_update_tablet = () => {
  const socket = store.socket
  if (socket !== null && store.station_id !== null) {
    logger.debug(`tablet_count: ${store.tablet_count}`)
    Promise.all(Array.apply(null, {length: store.tablet_count}))
    .map((item, index, length) => {return index+1}) // from 1 to N
    .map(num => {
      logger.debug(`fetching ${store.station_name}-${num}`)
      return vote.tablet.status(store.station_id, num)
        .catch(err => {
          logger.error(`Fail to update tablet status ${store.station_name}-${num}`)
          return {slot: num, status: 'error'}
        })
        // .tap(result => {logger.debug(`${result.slot} ${result.status}`)})
    })
    .each(tablet => {
      logger.debug(`fetch ${store.station_name}-${tablet.slot}: ${tablet.status}`)
    })
    .map(result => { return result.status })
    .then(result => {
      // encapsulate data and send
      const data = {
        tablets: result
      }
      socket.emit('update', data)
    })
  }
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

  const student_id = req.body.student_id
  const card_id    = req.body.card_id

  socket.emit('attached', student_id)

  auth.authenticate(store.auth_api_token, req.body.student_id, req.body.card_id)
    .then(info => {
      // student object contains token, id, type
      logger.debug(JSON.stringify(info))
      // store Vote token
      store.vote_token = info.vote_token
      store.is_busy    = true
      emit_authenticated(info.student)
      isLock = true
      res.send('success')
    })
    .catch(reason => {
      logger.error(`authentication error: ${reason}`)
      emit_message(reason)
      res.send(reason)
      store.isLock = false
    })
}

/**
 *  isLocker for POST /update
 *  @method middleware_update_isLocker
 */

const middleware_update_lock = (req, res, next) => {
  if (store.isLock)
    res.send('system busy')
  else {
    store.isLock = true
    next()
  }
}

/**
 *  Handler for POST /login
 *  @method middleware_update_handler
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
      return station.id
    })
    .catch(reason => {
      logger.info(`Login failed on reason: ${reason}`)
      emit_message(reason)
      res.send('login Failed')
    })
    .then(vote.station.info)
    .then(info => {
      // set station_name, tablet_count fetched from voet server
      _.assign(store, info)
      logger.info(`Logging completed with ${store.station_name}(${store.station_id})`)
      logger.info(`Tablet count ${info.tablet_count}`)
    })
    .catch(reason => {
      socket.emit('message', reason)
    })
}

module.exports = {
  middleware: {
    check: {
      requirement: middleware_requirement_factory,
      socket:      middleware_check_socket_handler,
      busy:        middleware_check_update_busy
    },
    update: middleware_update_handler,
    locker: middleware_update_lock,
    login:  middleware_login_handler,
    handler: {
      update: middleware_update_handler,
      login:  middleware_login_handler
    }
  },
  ping: {
    auth: auth_ping
  },
  socket: {
    initialise: socket_initialise,
    ping:       socket_ping,
    update:     socket_update_tablet
  }
}
