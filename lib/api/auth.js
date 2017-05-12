const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const logger  = require('../logger')
const config  = require('../../config')

let store = {
  auth_api_token: null,
  station_id:     null,
  station_name:   null,
  tablet_number:  null
}

/**
 *  send post to config.VOTE_API_URL/vote/new to start voting
 *  @param {} station_id
 *  @param {} ballot
 *  @param {} callback_url
 *  @param {} callback
 */
const vote = (station_id, ballot, callback_url, callback) => {
  request.post({
    url: config.VOTE_API_URL,
    form: {
      apikey:   config.VOTE_API_KEY,
      a_id:     station_id,
      authcode: ballot,
      callback: callback_url
    }
  })
  .then(body => {
    try {
      const data = JSON.parse(body)
      logger.info(`api_callid ${data.api_callid}`)
      if (data.status === 'ok')
        callback(null, data)
      else
        callback(data.message, null)
    } catch (e) {
      logger.error(body)
      callback('connection_error', null)
    }
  })
  .catch(err => {
    callback('connection_error', null)
  })
}

/**
 *  client station login to AUTH server
 *
 *  @param {} username
 *  @param {}
 */
const auth_login = (username, password, onError) => {
  logger.info(`User ${username} requests login`)
  // login to auth system
  return request.post({
    url: `${config.AUTH_API_URL}/general/register`,
    form: {
      api_key:  config.AUTH_API_KEY,
      version:  config.AUTH_API_VERSION,
      username: username,
      password: password
    },
    json: true
  })
  .then(body => {
    _.assign(store, {
      auth_api_token: body.token,
      station_id:     body.station_id,
      station_name:   body.name
    })
    logger.info(`Station ${store.station_name} login success`)
    return store.station_name
  })
}

/**
 *  ping AUTH server
 */
const auth_ping = (onError) => {
  return request.post({
    url: `${config.AUTH_API_URL}/general/ping`,
    form: {
      api_key: config.AUTH_API_KEY,
      version: config.AUTH_API_VERSION,
      token:   store.auth_api_token
    },
    timeout: 2000,
    json:    true
  })
  /*
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    onError(reason)
  })
  .catch(errors.RequestError, error => {
    logger.error('ping AUTH server connection error')
    onError('connection_error')
  })
  */
  .catch(reason => {
    logger.error('ping AUTH server connection error')
    onError('connection_error')
  })
}

/**
 *   authenticate identity of student
 */
const auth_authenticate = (student_id, card_id, onError) => {
  logger.debug(`get student_id = ${student_id}, card_id = ${card_id}`)
  return request.post({
    url: `${config.AUTH_API_URL}/elector/authenticate`,
    form: {
      api_key: config.AUTH_API_KEY,
      version: config.AUTH_API_VERSION,
      token:   store.auth_api_token,
      uid:     student_id,
      cid:     card_id
    },
    json: true
  })
  .then(body => {
    return {
      id:         body.uid,
      type:       body.type,
      department: body.college,
      token:      body.vote_token
    }
  })
  /*
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    onError(reason)
  })
  .catch(errors.RequestError, reason => {
    onError('connection_error')
  })
  */
  .catch(reason => {
    onError('connection_error')
  })
}

/**
 *
 */
const auth_confirm = (student_id, vote_token, onError) => {
  return request.post({
    url: `${config.AUTH_API_URL}/elector/confirm`,
    form: {
      api_key:    config.AUTH_API_KEY,
      version:    config.AUTH_API_VERSION,
      token:      store.auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => {
    const ballot       = body.ballot
    const callback_url = body.callback
    // success
    vote(store.station_id, ballot, callback_url, (err, voting_res) => {
      if (err) {
          callback(err)
      } else {
        // receive response from voting system
        callback(null, {
          slot:       voting_res.num,
          student_id: student_id
        })
      }
    })
  })
  /*
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    onError(reason)
  })
  .catch(errors.RequestError, reason => {
    logger.error('confirm connection error')
    onError('connection_error')
  })
  */
  .catch(reason => {
    logger.error('confirm connection error')
    onError('connection_error')
  })
}

/**
 *
 */
const auth_report = (student_id, vote_token, onError) => {
  return request.post({
    url: `${config.AUTH_API_URL}/elector/reject`,
    form: {
      api_key:    config.AUTH_API_KEY,
      version:    config.AUTH_API_VERSION,
      token:      store.auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => {
    return 'reject_success'
  })
  /*
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    onError(reason)
  })
  .catch(errors.RequestError, reason => {
    onError('connection_error')
  })
  */
  .catch(reason => {
    onError('connection_error')
  })
}

module.exports = {
  login:        auth_login,
  ping:         auth_ping,
  authenticate: auth_authenticate,
  confirm:      auth_confirm,
  report:       auth_report
}
