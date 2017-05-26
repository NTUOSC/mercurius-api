const _  = require('lodash')
const io = require('socket.io')()

const status_code = {
  authenticated: 'authenticated',
  confirmed:     'confirmed',
  message:       'message',
  clean:         'clean'
}

let private_data = {
  is_busy:        false,
  isLock:         false,
  auth_api_token: '',
  vote_token:     '',
  client_count:   0,
  tablet_count:   0
}

let public_data = {
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

const update = data => {
  _.merge(public_data, data)
  logger.info(`update ${JSON.stringify(data)}`)
  io.broadcast.emit('update', public_data)
}

const authenticated = data => {
  _.merge(store.public_data, data, { msg_status: status_code.authenticated })
  io.broadcast.emit('authenticated', store.data)
}

const message = (msg, data) => {
  const res = _.merge({}, data, {
    msg_status: status_code.message,
    error_msg:  msg
  })
  update(res)
}

const confirmed = slot => {
  update({
    msg_status: status_code.confirmed,
    slot:       slot
  })
}

module.exports = {
  status_code: status_code,
  get: {
    public:  () => public_data,
    private: () => private_data
  },
  set: {
    public:  data => { _.merge(public_data,  data) },
    private: data => { _.merge(private_data, data) }
  },
  update:        update,
  authenticated: authenticated,
  message:       message,
  confirmed:     confirmed
}