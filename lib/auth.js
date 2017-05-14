const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const logger  = require('./logger')
const code    = require('./code')
const config  = require('../config')

/**
 *  version of authentication API
 */
const AUTH_API_VERSION = 3

let store = {
  auth_api_token: null,
  vote_api_token: null,
  station_id:     null,
  station_name:   null
}

/**
 *  get tablet status
 */
const vote_tablet_status = (station_id, tablet_id, callback) => {
  return request.post({
    url: `${config.VOTE_API_URL}/status/tablet_status`,
    form: {
      apikey: config.VOTE_API_KEY,
      a_id:   station_id,
      num:    tablet_id
    },
  })
  /*
  , function (error, response, body) {
    if (error) {
      callback('connection_error', null);
    } else {
      try {
        var data = JSON.parse(body);
        logger.info('api_callid ' + data.api_callid);
        if (data.status == 'ok') {
          callback(null, data.result);
        } else {
          callback(data.message, null);
        }
      } catch (e) {
        logger.error(body);
        callback('connection_error', null);
      }
    }
  });
  */
}

/**
 *  send post to config.VOTE_API_URL
 *  @param {} station_id
 *  @param {} ballot
 *  @param {} callback_url
 */
const get_vote = (station_id, ballot, callback_url) => {
  return request.post({
    url: `${config.VOTE_API_URL}/vote/new`,
    form: {
      apikey:   config.VOTE_API_KEY,
      a_id:     station_id,
      authcode: ballot,
      callback: callback_url
    },
    json: true
  })
  .then(data => {
    logger.info(`api_callid ${data.api_callid}`)
    return data
  })
}

/**
 *  client station login to AUTH server
 *
 *  @param   {} username
 *  @param   {} password
 *  @returns {Promise} station_name
 */
const auth_login = (username, password) => {
  logger.info(`User ${username} requests login`)
  // login to auth system
  return request.post({
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
    logger.info(`Station ${store.station_name} login success`)
    return store.station_name
  })
}

/**
 *  ping AUTH server
 *
 *  @returns {Promise}
 */
const auth_ping = () => {
  return request.post({
    url: `${config.AUTH_API_URL}/general/ping`,
    form: {
      api_key: config.AUTH_API_KEY,
      version: AUTH_API_VERSION,
      token:   auth_api_token
    },
    timeout: 2000,
    json:    true
  })
}

/**
 *  authenticate identity of student
 *
 *  @param   {} student_id
 *  @param   {} card_id
 *  @returns {Promise} student
 *    consists of following keys:
 *    - id
 *    - type
 *    - department
 *    - token
 */
const auth_authenticate = (student_id, card_id) => {
  logger.debug(`get student_id = ${student_id}, card_id = ${card_id}`)
  return request.post({
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
    return {
      id:         body.uid,
      type:       body.type,
      department: body.college,
      token:      body.vote_token
    }
  })
}

/**
 *  @param   {} student_id
 *  @param   {} vote_token
 *  @returns {Promise}
 */
const auth_confirm = (student_id, vote_token) => {
  return request.post({
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
    return get_vote(store.station_id, ballot, callback_url)
      .then(voting_res => {
        // receive response from voting system
        return {
          slot:       voting_res.num,
          student_id: student_id
        }
      })
  })
}

/**
 *
 */
const auth_report = (student_id, vote_token) => {
  return request.post({
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
}

module.exports = {
  login:         auth_login,
  ping:          auth_ping,
  authenticate:  auth_authenticate,
  confirm:       auth_confirm,
  tablet_status: vote_tablet_status,
  report:        auth_report
}