const _       = require('lodash')
var   Promise = require('bluebird')

const code    = require('./code')
const auth    = require('./auth')
const vote    = require('./vote')
const logger  = require('../logger')

let store = {
  student:      null,
  socket:       null,
  station_name: null,
  station_id: null,
  tablet_count: 0,
  isLock: false
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

  // mention that is authenticated
  if (store.student !== null) {
      socket.emit('authenticated', _.pick(store.student, ['id', 'type', 'department']))
  }

  // restore station name
  if (store.station_name !== null) {
      socket.emit('station', store.station_name)
  }

  socket.on('accept', () => {
    const student = store.student
    store.student = null // set it back to null for next one

    if (student !== null) {
      logger.debug('Acccept')
      logger.info(`accept student ${student.id}`)

      auth.confirm(student.id, student.token)
        .then(info => {
          /**
           *  @todo need to handle store.station_id in auth.js
           */
          return vote.get(store.station_id, info.ballot, info.callback_url)
            .then(slot => {
              const data = {
                slot:       slot,
                student_id: student.id
              }
              logger.info(`accept: preserve slot ${data.slot}`)
              socket.emit('confirmed', data)
            })
            .catch(err => {
              logger.error(`Deprecated ballot: ${info.ballot}`)
              throw err
            })
        })
        .catch(err => {
          logger.info(`receive error ${err}`)
          socket.emit('message', err)
        })
        .finally(() => {
          store.student = null // set it back to null for next one
          setTimeout(function() { store.isLock = false }, 10000); // unisLock after 10s
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
    // report
    auth.report(student.id, student.token, onError)
    .then(message => {
      socket.emit('message', message)
    }, reason => {
      socket.emit('message', reason)
    })
    .finally(() => {
      store.student = null // set it back to null for next one
      setTimeout(function() { store.isLock = false }, 10000); // unisLock after 10s
    })
  })
}

/**
 *  set ping
 *  @method socket_ping
 */
const socket_ping = () => {
  const socket = store.socket
  if (socket !== null) {
    auth.ping().catch(reason => socket.emit('message', reason))
  }
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
          return null
        })
        // .tap(result => {logger.debug(`${result.slot} ${result.status}`)})
    })
    .filter(tablet_status => {
      // logger.debug(`${tablet_status.slot} ${tablet_status.status}`)
      return tablet_status !== null
    })
    .each(tablet => {
      logger.debug(`fetch ${store.station_name}-${tablet.slot}: ${tablet.status}`)
    })
    .then(result => {
      socket.emit('update', result)
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
    else {
      next()
    }
  }
}

/**
 *  Check whether shared socket exists or not
 *  @method middleware_check_socket_handler
 */
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

/**
 *  Handler for POST /update
 *  @method middleware_update_handler
 */
const middleware_update_handler = (req, res) => {
  const socket = store.socket

  // as per: https://github.com/azdkj532/mercurius/blob/master/controller.py#L43
  logger.info('recv update request')

  const student_id = req.body.student_id
  const card_id    = req.body.card_id

  auth.authenticate(student_id, card_id)
    .then(student => {
      // student object contains token, id, type
      logger.debug(JSON.stringify(student))
      store.student = student
      socket.emit('authenticated', {
          id:         student.id,
          type:       student.type,
          department: student.department,
      })
      isLock = true
      res.send('success')
    })
    .catch(reason => {
      logger.error(`authentication error: ${reason}`)
      socket.emit('message', reason)
      res.send(reason)
    })
}

/**
 *  isLocker for POST /update
 *  @method middleware_update_isLocker
 */

const middleware_update_lock = (req, res, next) => {
  if (store.isLock)
    res.send('system busy')
  next()
}

/**
 *  Handler for POST /login
 *  @method middleware_update_handler
 */
const middleware_login_handler = (req, res) => {
  const socket = store.socket

  // client station login
  auth.login(req.body.username, req.body.password)
    .then(station => {
      store.station_name = station.name  // set station_name fetched from auth server
      store.station_id = station.id
      socket.emit('station', station.name)
      socket.emit('message', code.login_success)
      res.send('login success')
      return station.id
    })
    .catch(reason => {
      logger.info(`Login failed on reason: ${reason}`)
      socket.emit('message', reason)
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
  socket: {
    initialise: socket_initialise,
    ping:       socket_ping,
    update:     socket_update_tablet
  },
  middleware: {
    check: {
      requirement: middleware_requirement_factory,
      socket:      middleware_check_socket_handler
    },
    update: middleware_update_handler,
    locker: middleware_update_lock,
    login:  middleware_login_handler
  }
}
