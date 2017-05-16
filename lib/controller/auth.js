/**
 *  @module auth
 *    Communicate with auth server.
 */


const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const code    = require('./code')
const logger  = require('../logger')
const config  = require('../../config')

/**
 *  @method statusCodeErrorHandlerFactory
 *    
 *  @param {string} where
 *  @return {handler} It throws { @const err.response.body.reason }
 */
/**
 * A simple factory producing a handler when request status code error.
 * 
 * @param {string} where 
 * @returns {function}
 */
const statusCodeErrorHandlerFactory = where => {
  return err => {
    const body = err.response.body
    logger.debug(`${where}: ${body.reason}`)
    throw body.reason
  }
}
/**
 *  @method requestErrorHandlerFactory
 *    A simple factory producing a handler when request error.
 *  @param {string} where
 *  @return {handler} It throws { @const code.connection.error }
 */
const requestErrorHandlerFactory = where => {
  return reason => {
    logger.debug(`${where}: ${reason}`)
    logger.error(`${where}: connection error`)
    throw code.connection.error
  }
}

/**
 *  @typedef {string} ConnectionError
 *  @typedef {ConnectionError} VoteError
 *  @typedef {ConnectionError} AuthError
 */

/**
 *  @method auth#login
 *    Client station login to AUTH server, return { @const auth_api_token } and
 *  { @const station } when success.
 *  @param {string} username
 *  @param {string} password
 *  @return {Promise}
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
    const res = {
      auth_api_token: body.token,
      station: {
        id:   body.station_id,
        name: body.name
      }
    }
    logger.info(`Station ${res.station.name} login success`)
    return res
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('login'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('login'))
}

/**
 *  @method auth#ping
 *    Ping AUTH server.
 *  @param {string} auth_api_token
 *  @return {Promise.<AuthError>}
 */
const auth_ping = auth_api_token => {
  return request.post({
    url: `${config.AUTH_API_URL}/general/ping`,
    form: {
      api_key: config.AUTH_API_KEY,
      token:   auth_api_token
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
 *  @method auth#authenticate
 *    Authenticate identity of student. Return { @const vote_token } and
 *  { @const {StudentInfo} student } if success.
 *  @param {string} auth_api_token
 *  @param {string} student_id Student id
 *  @param {string} card_id    Mifare Classic card id
 *  @return {Promise}
 */
const auth_authenticate = (auth_api_token, student_id, card_id) => {
  logger.debug(`get student_id = ${student_id}, card_id = ${card_id}`)
  return request.post({
    url: `${config.AUTH_API_URL}/elector/authenticate`,
    form: {
      api_key: config.AUTH_API_KEY,
      token:   auth_api_token,
      uid:     student_id,
      cid:     card_id
    },
    json: true
  })
  .then(body => {
    return {
      vote_token: body.vote_token,
      student: {
        id:         body.uid,
        type:       body.type,
        department: body.college
      }
    }
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('authenticate'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('authenticate'))
}

/**
 *  @method auth#confirm
 *    Confirm vote and ballot for any authenticated student.
 *  @param {string} auth_api_token
 *  @param {string} student_id
 *  @param {string} vote_token
 *  @return {Promise.<VoteResult|AuthError|VoteError>}
 */
const auth_confirm = (auth_api_token, student_id, vote_token) => {
  return request.post({
    url: `${config.AUTH_API_URL}/elector/confirm`,
    form: {
      api_key:    config.AUTH_API_KEY,
      token:      auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => {
    const ballot       = body.ballot
    const callback_url = body.callback
    logger.info(`confirm: fetch ballot ${ballot.slice(0, 10)}`)
    return {
      ballot: ballot,
      callback_url: callback_url
    }
  })
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('confirm'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('confirm'))
}

/**
 *  @method auth#reject
 *    Reject student.
 *  @param {string} auth_api_token
 *  @param {string} student_id
 *  @param {string} vote_token
 *  @return {Promise.<AuthError|string>}
 */
const auth_reject = (auth_api_token, student_id, vote_token) => {
  return request.post({
    url: `${config.AUTH_API_URL}/elector/reject`,
    form: {
      api_key:    config.AUTH_API_KEY,
      token:      auth_api_token,
      vote_token: vote_token,
      uid:        student_id
    },
    json: true
  })
  .then(body => code.reject.success)
  .catch(errors.StatusCodeError, statusCodeErrorHandlerFactory('report'))
  .catch(errors.RequestError,    requestErrorHandlerFactory('report'))
}

module.exports = {
  login:        auth_login,
  ping:         auth_ping,
  authenticate: auth_authenticate,
  confirm:      auth_confirm,
  reject:       auth_reject
}
