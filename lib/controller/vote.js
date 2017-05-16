const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const code    = require('./code')
const logger  = require('../logger')
const config  = require('../../config')

let store = {
  auth_api_token: null, // not in use
}
/**
 * @class vote
 */

/**
 * @typedef {string} ConnectionError
 * @typedef {ConnectionError} VoteError
 * @typedef {ConnectionError} AuthError
 */

/**
 * @typedef {Object} VoteResult
 * @property {int} slot A the number in [1-4] indicates a voting slot.
 */

/**
 *  send post to `${config.VOTE_API_URL}/vote/new` to start voting
 * 
 *  @method vote#get
 * 
 *  @param {int} station_id
 *  @param {string} ballot
 *  @param {string} callback_url
 *
 *  @return {Promise.<VoteResult|VoteError>}
 */
const vote_get = (station_id, ballot, callback_url) => {
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
    if (body.status === 'ok') {
      return body.num
    }
    else {
      throw body.message
    }
  })
  .catch(errors.RequestError, err => {
    logger.error(err)
    throw code.connection_error
  })
}

/**
 *  send post to retrive station infomatioin
 *  @param {int} station_id
 *  @return {Promise.<StationInfo>}
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
      if (typeof station === 'undefined'){
        logger.error('station id not found in the info list')
        throw code.connection_error
      }else {
        return {
          station_name: station.name,
          tablet_count: station.tablet_count
        }
      }
    }else{
      return Promise.reject(body.message)
    }
  })
  .catch(errors.RequestError, err => {
    logger.error(err)
    throw code.connection_error
  });
}

/**
 *  send post to retrieve tablet status.
 *  @param {int} station_id
 *  @param {int} tablet_num
 *
 *  @return {Promise.<TabletStatus>}
 */
const vote_tablet_status = (station_id, tablet_num) => {
  return request.post({
      url: `${config.VOTE_API_URL}/status/tablet_status`,
      form: {
        a_id: station_id,
        num: tablet_num
      },
      json: true
    })
    .then(data => {
      logger.debug(`tablet_status: api_callid ${data.api_callid}`)
      if (data.status === 'ok') {
        return {
          slot: tablet_num,
          status: data.result
        }
      } else {
        throw data.message
      }
    })
    .catch(err => {
      logger.error(err)
      throw code.connection_error
    })
}

module.exports = {
  station: {
    info: vote_station_info
  },
  tablet: {
    status: vote_tablet_status
  },
  get: vote_get
}
