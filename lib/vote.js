var request = require('request');

var logger = require('./logger');
var config = require('../config');

var auth_api_token = null;
var vote_api_token = null;
var station_id = null;
var station_name = null;

config.AUTH_API_VERSION = 3;

module.exports = {
    'login': function (username, password) {
        logger.info('User ' + username + 'require login');
        // login to auth system
        request.post({
            url: config.AUTH_API_URL + '/general/register',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                username: username,
                password: password,
            }
        }, function (error, response, body) {
            if (error) throw error;
            logger.debug(body);
            try {
                var data = JSON.parse(body);
                if (response.statusCode == 200) {
                    auth_api_token = data.token;
                    station_id = data.station_id;
                    station_name = data.name;
                    logger.info('Station ' + station_name + ' login success');
                } else {
                    logger.info('Login Failed on reason: ' + data.reason);
                }
            } catch (e) {
                logger.error('login: json parse error');
            }
        });

        // TODO: login to Vote system
        // seems seems no need to do this
    },
    'ping': function () {
        // TODO
        request.post({
            url: config.AUTH_API_URL + '/general/ping',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: auth_api_token,
            },
            timeout: 2,
        }, function (error, response, body) {
            if (error) throw error;
        });
    },
    'authenticate': function (student_id, card_id, callback) {
        logger.debug('get student_id, card_id' + student_id + ' ' + card_id);
        request.post({
            url: config.AUTH_API_URL + '/elector/authenticate',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: auth_api_token,
                uid: student_id,
                cid: card_id,
            }
        }, function (error, response, body) {
            if (error) throw error;
            logger.debug(body);
            try {
                var data = JSON.parse(body);
                if (response.statusCode == 200){
                    callback(null, {
                        token: data.vote_token,
                        id: data.uid,
                        type: data.type,
                    });
                } else {
                    logger.debug('error message: ' + data.reason);
                    callback(data.reason, null);
                }
            } catch (e) {
                // catch Syntax Error only
                callback('json parse error', null);
            }
        });
    },
    'confirm': function (student_id, vote_token, callback) {
        request.post({
            url: config.AUTH_API_URL + '/elector/confirm',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: auth_api_token,
                uid: student_id,
                vote_token: vote_token,
            }
        }, function (error, response, body) {
            if (error) throw error;
            logger.debug(body);

            try {
                var data = JSON.parse(body);

                var ballot = data.ballot;
                var callback_url = data.callback;

                if (response.statusCode != 200) {
                    logger.debug('error message: ' + data.reason);
                    callback(data.reason, null);
                } else {
                    // success
                    callback(null, ballot + ' ' + callback_url);

                    /*
                    vote(station_id, ballot, callback_url, (response) => {
                        callback(null, {
                            slot: response.num,
                            student_id: student_id
                        });
                    });
                    */
                }
            } catch (e) {
                // catch Syntax Error only
                callback('json parse error', null);
            }
        });
    },
    'report': function (student_id, vote_token, callback) {
        // TODO
        request.post({
            url: config.AUTH_API_URL + '/elector/reject',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: auth_api_token,
                uid: student_id,
                vote_token: vote_token,
            }
        }, function (error, response, body) {
            if (error) throw error;

            try {
                var data = JSON.parse(body);
                if (response.statusCode == 200) {
                    callback(null, 'Reject success');
                } else {
                    callback(data.reason, null);
                }
            } catch(e) {
                // catch Syntax Error only
                callback('json parse error', null);
            }
        });

    },
};

function vote(station_id, ballot, callback_url, callback) {
    request.post({
        url: config.VOTE_API_URL,
        form: {
            'apikey': config.VOTE_API_KEY, 
            'a_id': station_id,
            'authcode': ballot,
            'callback': callback_url,
        }
    }, function (error, response, body) {
        callback(JSON.parse(body));
    });

}
