const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const code    = require('./code')
const logger  = require('../logger')
const config  = require('../../config')

let store = {
  auth_api_token: null,
  station_id:     null,
  station_name:   null,
  tablet_number:  null
}
/**
 *  @class auth
 *    Communicate with auth server.
 */

/**
 *  A simple factory producing a handler when request status code error
 * 
 *  @method statusCodeErrorHandlerFactory
 *  @param {string} where
 *  @return {handler}
 */
const statusCodeErrorHandlerFactory = where => {
  return err => {
    const body = err.response.body
    logger.debug(`${where}: ${body.reason}`)
    throw body.reason
  }
}
/**
 *  A simple factory producing a handler when request error
 * 
 *  @method requestErrorHandlerFactory
 *  @param {string} where
 *  @return {handler}
 */
const requestErrorHandlerFactory = where => {
  return reason => {
    logger.debug(`${where}: ${reason}`)
    logger.error(`${where}: connection error`)
    throw code.connection_error
  }
}

/**
 *  @typedef {string} ConnectionError
 *  @typedef {ConnectionError} VoteError
 *  @typedef {ConnectionError} AuthError
 */

/**
 *  client station login to AUTH server, return station name when success; otherwise, return AuthError
 *
 *  @method auth#login
 * 
 *  @param {string} username
 *  @param {string} password
 * 
 *  @return {Promise.<AuthError|string>}
 */
const auth_login = (username, password) => {
  logger.info(`User ${username} requests login`)
  // login to auth system
  return request.post({
    url: `${config.AUTH_API_URL}/general/register`,
    form: {
      api_key:  config.AUTH_API_KEY,
      username: username,
      password: password
    },
    json: true
  })
  .then(body => {
    // write data to store
    _.assign(store, {
      auth_api_token: body.token,
      station_id:     body.station_id,
      station_name:   body.name
    })
    logger.info(`Station ${store.station_name} login success`)
    return store.station_name
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('login'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('login'))
}

/**
 *  ping AUTH server
 *
 *  @method auth#ping
 *  @return {Promise.<AuthError>}
 */
const auth_ping = () => {
  return request.post({
    url: `${config.AUTH_API_URL}/general/ping`,
    form: {
      api_key: config.AUTH_API_KEY,
      token:   store.auth_api_token
    },
    timeout: 2000,
    json:    true
  })
  .then(body => {
    logger.debug('ping: success')
    return
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('ping'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('ping'))
}

/**
 *  @typedef {Object} StudentInfo
 *  @property {string} uid
 *  @property {string} type
 *  @property {string} department
 *  @property {string} vote_token
 */

/**
 *  authenticate identity of student
 *
 *  @method auth#authenticate
 * 
 *  @param {string} student_id Student id
 *  @param {string} card_id    Mifare Classic card id
 * 
 *  @return {Promise.<StudentInfo|AuthError>}
 */
const auth_authenticate = (student_id, card_id) => {
  logger.debug(`get student_id = ${student_id}, card_id = ${card_id}`)
  return request.post({
    url: `${config.AUTH_API_URL}/elector/authenticate`,
    form: {
      api_key: config.AUTH_API_KEY,
      version: config.AUTH_API_VERSION, /** @todo api version ?? */
      token:   store.auth_api_token,
      uid:     student_id,
      cid:     card_id
    },
    json: true
  })
  .then(body => {
    // return StudentInfo
    return {
      id:         body.uid,
      type:       body.type,
      department: body.college,
      token:      body.vote_token
    }
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('authenticate'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('authenticate'))
}

/**
 *  confirm user to vote
 *
 *  @method auth#confirm
 * 
 *  @param {string} student_id
 *  @param {string} vote_token
 *
 *  @return {Promise.<VoteResult|AuthError|VoteError>}
 */
const auth_confirm = (student_id, vote_token) => {
  return request.post({
    url: `${config.AUTH_API_URL}/elector/confirm`,
    form: {
      api_key:    config.AUTH_API_KEY,
      token:      store.auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => {
    const ballot       = body.ballot
    const callback_url = body.callback
    logger.info(`confirm: fetch ballot ${ballot.slice(0, 10)}`)
    // return a promise
    return {
      ballot: ballot,
      callback_url: callback_url
    }
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('confirm'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('confirm'))
}

/**
 *  Reject Student
 *
 *  @method auth#report
 * 
 *  @param {string} student_id
 *  @param {string} vote_token
 *
 *  @return {Promise.<AuthError|string>}
 */
const auth_report = (student_id, vote_token) => {
  return request.post({
    url: `${config.AUTH_API_URL}/elector/reject`,
    form: {
      api_key:    config.AUTH_API_KEY,
      token:      store.auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => code.reject_success)
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('report'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('report'))
}

module.exports = {
  login:        auth_login,
  ping:         auth_ping,
  authenticate: auth_authenticate,
  confirm:      auth_confirm,
  report:       auth_report
}
