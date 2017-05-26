const io         = require('socket.io')()
const router     = require('express')()

const controller = require('./controller')

/**
 *  socket setting
 */
io.on('connection', controller.socket.initialise)
/**
 * set auth ping
 */
setInterval(controller.socket.ping, 5000)
setInterval(controller.socket.update, 5000)

/**
 *  router setting
 */
router
/**
 * Checking socket status
 */
.use(controller.middleware.check.socket)
/**
 *  POST /update
 *
 *  @param {required} student_id
 *  @param {required} card_id
 */
.post('/update', controller.middleware.check.requirement(['student_id', 'card_id']) )
.post('/update', controller.middleware.locker)
.post('/update', controller.middleware.update)
/**
 *  POST /login
 *
 *  @param {required} username
 *  @param {required} password
 */
.post('/login', controller.middleware.check.requirement(['username', 'password']) )
.post('/login', controller.middleware.handler.login)

module.exports = {
  router: router,
  io:     io
}

