const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const logger  = require('./logger')
const config  = require('../config')

let store = {
  auth_api_token: null,
  vote_api_token: null,
  station_id:     null,
  station_name:   null
}
let auth_api_token = null
let vote_api_token = null
let station_id     = null
let station_name   = null

const AUTH_API_VERSION = 3

/**
 *  send post to config.VOTE_API_URL
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
  .then(data => {
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
 *
 */
const vote_login = (username, password, callback) => {
  logger.info(`User ${username} require login`)
  // login to auth system
  request.post({
    url: `${config.AUTH_API_URL}/general/register`,
    form: {
      api_key:  config.AUTH_API_KEY,
      version:  AUTH_API_VERSION,
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
    auth_api_token = body.token
    station_id     = body.station_id
    station_name   = body.name
    logger.info(`Station ${station_name} login success`)
    callback(null, station_name)
  })
  .catch(errors.StatusCodeError, reason => {
    logger.info(`Login Failed on reason: ${reason}`)
    callback(reason, null)
  })
  .catch(errors.RequestError, reason => {
    logger.error('login connection error')
    callback('connection_error', null)
  })
  // TODO: login to Vote system
  // seems no need to do this
}

/**
 *
 */
const vote_ping = (callback) => {
  request.post({
    url: `${config.AUTH_API_URL}/general/ping`,
    form: {
      api_key: config.AUTH_API_KEY,
      version: AUTH_API_VERSION,
      token:   auth_api_token
    },
    timeout: 2000,
    json:    true
  })
  .then(body => {
    callback(null)
  })
  .catch(errors.StatusCodeError, reason => {
    callback(reason)
  })
  .catch(errors.RequestError, reason => {
    logger.error('ping connection error')
    callback('connection_error')
  })
}

/**
 *
 */
const vote_authenticate = (student_id, card_id, callback) => {
  logger.debug(`get student_id, card_id ${student_id} ${card_id}`)
  request.post({
    url: `${config.AUTH_API_URL}/elector/authenticate`,
    form: {
      api_key: config.AUTH_API_KEY,
      version: AUTH_API_VERSION,
      token:   auth_api_token,
      uid:     student_id,
      cid:     card_id
    },
    json: true
  })
  .then(body => {
    callback(null, {
      id:         body.uid,
      type:       body.type,
      department: body.college,
      token:      body.vote_token
    })
  })
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    callback(reason, null)
  })
  .catch(errors.RequestError, reason => {
    callback('connection_error', null)
  })
}

/**
 *
 */
const vote_confirm = (student_id, vote_token, callback) => {
  request.post({
    url: `${config.AUTH_API_URL}/elector/confirm`,
    form: {
      api_key:    config.AUTH_API_KEY,
      version:    AUTH_API_VERSION,
      token:      auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => {
    const ballot       = body.ballot
    const callback_url = body.callback
    // success
    vote(station_id, ballot, callback_url, (err, voting_res) => {
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
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    callback(reason, null)
  })
  .catch(errors.RequestError, reason => {
    logger.error('confirm connection error')
    callback('connection_error')
  })
}

/**
 *
 */
const vote_report = (student_id, vote_token, callback) => {
  // TODO
  request.post({
    url: `${config.AUTH_API_URL}/elector/reject`,
    form: {
      api_key:    config.AUTH_API_KEY,
      version:    AUTH_API_VERSION,
      token:      auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => {
    callback(null, 'reject_success')
  })
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    callback(reason, null)
  })
  .catch(errors.RequestError, reason => {
    callback('connection error', null)
  })
}

module.exports = {
  login:        vote_login,
  ping:         vote_ping,
  authenticate: vote_authenticate,
  confirm:      vote_confirm,
  report:       vote_report
}