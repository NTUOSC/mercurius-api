/**
 * A module enumerating for all message code.
 * @module controller.code
 * @readonly 
 * @enum {string}
 */

/**
 * @typedef {Object} Code
 * @property {string} authentication_is_not_ready a code when accept a student without authentication
 * @property {string} success
 * @property {string} login.success a code when login to auth server successfully
 * @property {string} reject.success a code when reject a student successfully, @see module:controller.auth.reject
 * @property {string} connection.error a code when connection error happened
 */
module.exports = {
  authentication_is_not_ready: 'authentication_is_not_ready',
  success:                     'success',
  login:      { success:       'login_success'    },
  reject:     { success:       'reject_success'   },
  connection: { error:         'connection_error' }
}