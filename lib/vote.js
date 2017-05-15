const _       = require('lodash')
const request = require('request-promise')
const errors  = require('request-promise/errors')

const logger  = require('./logger')
const code    = require('./code')
const config  = require('../config')

let store = {
  auth_api_token: null,
  station_id:     null,
  station_name:   null,
  tablet_number:  null
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
 *  @param {} station_id
 *  @param {} ballot
 *  @param {} callback_url
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
    return code.connection_error
  })
}

/**
 *  send post to retrive station infomatioin
 */
const vote_station_info = (onError) => {
  return request.post({
    url: `${config.VOTE_API_URL}/status/booth`,
    form: {
      apikey: config.VOTE_API_KEY
    }
  })
  .then(body => {
    try {
      logger.info(`api_callid ${data.api_callid}`)
      if (data.status === 'ok') {
        station = data.list.find((station) => {
          return station.a_id == store.station_id
        })
        _.assign(store, {
          station_name: station.name,
          tablet_count: station.tablet_count
        })
      }
      else
        onError(data.message)
    } catch (e) {
      logger.error(body)
      onError('connection_error')
    }
  })
}

/**
 *  send post to retrieve tablet status.
 */
const vote_tablet_status = (callback) => {
  for (let tablet_slot = 1; tablet_slot <= store.tablet_number; tablet_slot++) {
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

module.exports = {
  station: {
    info: vote_station_info
  },
  tablet: {
    status: vote_tablet_status
  },
  get: vote_get
}