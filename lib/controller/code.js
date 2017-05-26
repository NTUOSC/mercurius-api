/**
 * A module enumerating for all message code.
 * @module code
 */

/**
 * @readonly
 * @enum {string}
 */
const code = {
  /**
   * A code when accept a student without authentication
   * @default
   */
  authentication_is_not_ready: 'authentication_is_not_ready',
  success:                     'success',
  /**
   * A code when login to auth server successfully
   * @member {string} module:code.login.success
   */
  login_success:       'login_success'    ,
  /** A code when reject a student successfully, @see { @link module:auth.reject } */
  reject_success:       'reject_success'   ,
  /** A code when connection error happened */
  connection_error: 'connection_error'
}

module.exports = {
  authentication_is_not_ready: code.authentication_is_not_ready,
  success:                     code.success,
  login:  { success: code.login_success  },
  reject: { success: code.reject_success },
  connection: { error: code.connection_error }
}