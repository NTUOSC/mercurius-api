/**
 * A module storing all message code.
 * @module controller/code
 * @type {Object}
 */
module.exports = {
  /** A code when accept a student without authentication. */
  authentication_is_not_ready: 'authentication_is_not_ready',
  success:                     'success',
  /** A code when login to auth server successfully */
  login:      { success:       'login_success'    },
  /**
   * A code when reject a student successfully.
   * @see module:controller/auth.reject
   */
  reject:     { success:       'reject_success'   },
  /** A code when connection error happened. */
  connection: { error:         'connection_error' }
}