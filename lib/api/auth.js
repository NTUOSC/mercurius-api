const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const logger  = require('../logger')
const config  = require('../../config')

let store = {
  auth_api_token: null,
  station_id:     null,
  station_name:   null,
  tablet_count:  null
}
/*
 * @class auth
 */

/**
 * @typedef {string} ConnectionError
 * @typedef {ConnectionError} VoteError
 * @typedef {ConnectionError} AuthError
 */

/**
 * @typedef {Object} StationInfo
 * @property {string} station_name
 * @property {string} vote_api
 * @property {string} tablet_count
 */
/**
 * send post to retrive station infomatioin
 *
 * @param {int} station_id
 * @return {Promise.<StationInfo>}
 */
const vote_station_info = (station_id) => {
  return request.post({
    url: `${config.VOTE_API_URL}/status/booth`,
    form: {
      apikey: config.VOTE_API_KEY
    },
    json: true
  })
  .then(body => {
    logger.info(`api_callid ${body.api_callid}`)
    if (body.status === 'ok'){
      station = body.list.find((station) => {
        return parseInt(station.a_id) == station_id
      })
      return Promise.resolve({
        station_name: station.name,
        vote_api: config.VOTE_API_URL,
        tablet_count: station.tablet_count
      })
    }else{
      return Promise.reject(body.message)
    }
  })
  .catch(errors.RequestError, err => {
    logger.error(err)
    return Promise.reject('connection_error')
  });
}

/**
 * send post to retrieve tablet status.
 */
const vote_tablet_status = (callback) => {
  for (var tablet_slot = 1; tablet_slot <= store.tablet_number; tablet_slot++) {
    request.post({
      url: `${config.VOTE_API_URL}/status/tablet_status`,
      form: {
        a_id: store.station_id,
        num: tablet_slot
      }
    })
    .then(body => {
      try {
        const data = JSON.parse(body)
        logger.info(`api_callid ${data.api_callid}`)
        if (data.status === 'ok') {
          callback(null, {
            slot: tablet_slot,
            status: data.result
          })
        }
        else
          callback(data.message)
      } catch (e) {
        logger.error(data)
        callback('connection_error', null)
      }
    })
  }
}
/**
 * @typedef {Object} VoteResult
 * @property {int} slot A the number in [1-4] indicates a voting slot.
 */

/**
 * send post to config.VOTE_API_URL/vote/new to start voting
 * @param {} station_id
 * @param {} ballot
 * @param {} callback_url
 * @param {} callback
 *
 * @return {Promise.<VoteResult|VoteError>}
 */
const vote = (station_id, ballot, callback_url) => {
  return request.post({
    url: `${config.VOTE_API_URL}/vote/new`,
    form: {
      apikey:   config.VOTE_API_KEY,
      a_id:     station_id,
      authcode: ballot,
      callback: callback_url
    },
    json: true,
    simple: false // handles error without technical issue
  })
  .then(body => {
      logger.info(`api_callid ${body.api_callid}`)
      if (body.status === 'ok')
        return Promise.resolve({
          slot:   body.num
        })
      else
        return Promise.reject(body.message)
  })
  .catch(errors.RequestError, err => {
    logger.error(err)
    return Promise.reject('connection_error')
  })
}


/**
 * client station login to AUTH server, return station name when sucess
 *
 * @method auth#login
 * @param {string} username
 * @param {string} password
 * @return {Promise.<AuthError|StationInfo>}
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
    return vote_station_info(body.station_id)
      .then(result => {
        // update stored information
        _.assign(store, {
          auth_api_token: body.token,
          station_name: result.station_name,
          tablet_count: result.tablet_count,
          station_id: body.station_id
        })
        logger.info(`Station ${store.station_name} login success`)
        return Promise.resolve({
          station_name: store.station_name,
          tablet_count: store.tablet_count,
          station_id: store.station_id,
          vote_api: result.vote_api
        })
      })
  })
  .catch(errors.StatusCodeError, reason => {
    const body = reason.response.body
    logger.debug('login: ' + body.reason)
    return Promise.reject(body.reason)
  })
  .catch(errors.RequestError, reason => {
    logger.debug('login: ' + reason)
    logger.error('login: AUTH server connection error')
    return Promise.reject('connection_error')
  })
}

/**
 * ping AUTH server
 *
 * @method auth#ping
 * @return {Promise.<AuthError>}
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
    return undefined
  })
  .catch(errors.StatusCodeError, reason => {
    const body = reason.response.body
    logger.debug('ping: ' + body.reason)
    return Promise.reject(body.reason)
  })
  .catch(errors.RequestError, reason => {
    logger.debug('ping: ' + reason)
    logger.error('ping AUTH server connection error')
    return Promise.reject('connection_error')
  })
}

/**
 * @typedef {Object} StudentInfo
 * @property {string} uid
 * @property {string} type
 * @property {string} department
 * @property {string} vote_token
 */

/**
 * authenticate identity of student
 *
 * @method auth#authenticate
 * @param {string} student_id Student id
 * @param {string} card_id Mifare Classic card id
 * @return {Promise.<StudentInfo|AuthError>}
 */
const auth_authenticate = (student_id, card_id) => {
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
    return Promise.resolve({
      id:         body.uid,
      type:       body.type,
      department: body.college,
      token:      body.vote_token
    }, null)
  })
  .catch(errors.StatusCodeError, reason => {
    logger.debug(`error message: ${reason}`)
    return Promise.reject(reason.response.body.reason)
  })
  .catch(errors.RequestError, reason => {
    return Promise.reject('connection_error')
  })
}

/**
 * confrim user to vote
 *
 * @method auth#confirm
 * @param {string} student_id
 * @param {string} vote_token
 *
 * @return {Promise.<VoteResult|AuthError|VoteError>}
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
    // success
    // return a promise
    return vote(store.station_id, ballot, callback_url)
      .then(voteResult => {
        _.assign(voteResult, {student_id: student_id})
        return Promise.resolve(voteResult)
      })
      .catch(reason => {
        logger.error(`Ballot ${ballot} is deprecated in reasnon "${reason}"`)
        return Promise.reject(reason)
      })
  })
  .catch(errors.StatusCodeError, reason => {
    const body = reason.response.body
    logger.debug(`error message: ${body.reason}`)
    return Promise.reject(body.reason)
  })
  .catch(errors.RequestError, reason => {
    logger.error('confirm connection error')
    return Promise.reject('connection_error')
  })
}

/**
 * Reject Student
 *
 * @method auth#report
 * @param {string} student_id
 * @param {string} vote_token
 *
 * @return {Promise.<AuthError|string>}
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
  .then(body => {
    return Promise.resolve('reject_success')
  })
  .catch(errors.StatusCodeError, error => {
    const reason = error.response.body.reason
    logger.debug(`error message: ${reason}`)
    return Promise.reject(reason)
  })
  .catch(errors.RequestError, reason => {
    return Promise.reject('connection_error')
  })
}

module.exports = {
  login:        auth_login,
  ping:         auth_ping,
  authenticate: auth_authenticate,
  confirm:      auth_confirm,
  report:       auth_report
}
