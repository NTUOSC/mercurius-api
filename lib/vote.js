var request = require('request');

var logger = require('./logger');
var config = require('../config');

module.exports = {
    vote_api_token: null,
    auth_api_token: null,
    login_required: function (f) {
        return function () {
            if (vote_api_token == null) {
                throw Exception;
            }
        }
    }
    login: function (username, password) {
        // TODO
        
    },
    ping: function () {
        // TODO
        
    },
    authenticate: function (student_id, card_id, callback) {
        // TODO
        return 'This is a token';
    },
    confirm: function (student_id, vote_token, callback) {
        // TODO
        return 'this is a ballot';
    },
    report: function (student_id, vote_token, callback) {
        // TODO
        
    },
    vote: function (station_id, ballot, callback_url) {
        // TODO

    }
};
