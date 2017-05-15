const io         = require('socket.io')()
const router     = require('express')()

const controller = require('./controller')

/**
 *  initialise socket
 */
io.on('connection', controller.socket.initialise)

/**
 * set ping
 */
setInterval(controller.socket.ping, 5000)

/**
 *  router setting
 */
router
/**
 * Checking socket status
 */
.use(controller.middleware.check.socket)
/**
 *  GET /info
 */
.get('/info', (req, res) => {
  /** @todo to push custom info to the client */
})
/**
 *  POST /update
 *
 *  @param {required} student_id
 *  @param {required} card_id
 */
.post('/update', controller.middleware.check.requirement(['student_id', 'card_id']) )
.post('/update', (req, res, next) => {
  if (store.student !== null)
    res.send('system busy')
  next()
})
.post('/update', controller.middleware.update)
/**
 *  POST /login
 *
 *  @param {required} username
 *  @param {required} password
 */
.post('/login', controller.middleware.check.requirement(['username', 'password']) )
.post('/login', controller.middleware.login)

module.exports = {
  router: router,
  io:     io
}