var request = require('request');

var logger = require('./logger');
var config = require('../config');

var auth_api_token = null;
var vote_api_token = null;
var station_id = null;
var station_name = null;

config.AUTH_API_VERSION = 3;

module.exports = {
    'login': function (username, password, callback) {
        logger.info('User ' + username + 'require login');
        // login to auth system
        request.post({
            url: config.AUTH_API_URL + '/general/register',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                username: username,
                password: password,
            },
            json: true
        }, function (error, response, body) {
            if (error) {
                logger.error('login connection error');
                callback('connection_error', null);
            } else {
                if (response.statusCode == 200) {
                    auth_api_token = body.token;
                    station_id = body.station_id;
                    station_name = body.name;
                    logger.info('Station ' + station_name + ' login success');
                    callback(null, station_name);
                } else {
                    logger.info('Login Failed on reason: ' + body.reason);
                    callback(body.reason, null);
                }
            }
        });

        // TODO: login to Vote system
        // seems no need to do this
    },
    'ping': function (callback) {
        request.post({
            url: config.AUTH_API_URL + '/general/ping',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: auth_api_token,
            },
            timeout: 2000,
            json: true
        }, function (error, response, body) {
            if (error) {
                logger.error('ping connection error');
                callback('connection_error');
            } else {
                if (response.statusCode == 200) {
                    callback(null);
                } else {
                    callback(body.reason);
                }
            }
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
            },
            json: true
        }, function (error, response, body) {
            if (error) {
                callback('connection_error', null);
            } else {
                if (response.statusCode == 200){
                    callback(null, {
                        token: body.vote_token,
                        id: body.uid,
                        type: body.type,
                        department: body.college,
                    });
                } else {
                    logger.debug('error message: ' + body.reason);
                    callback(body.reason, null);
                }
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
            },
            json: true
        }, function (error, response, body) {
            if (error) {
                logger.error('confirm connection error');
                callback('connection_error');
            } else {
                var ballot = body.ballot;
                var callback_url = body.callback;

                if (response.statusCode != 200) {
                    logger.debug('error message: ' + body.reason);
                    callback(body.reason, null);
                } else {
                    // success
                    vote(station_id, ballot, callback_url, (error, voting_resp) => {
                        if (error) {
                            callback(error);
                        } else {
                            // receive response from voting system
                            logger.info('api_callid ' + voting_resp.api_callid);
                            callback(null, {
                                slot: voting_resp.num,
                                student_id: student_id
                            });
                        }
                    });
                }
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
            },
            json: true
        }, function (error, response, body) {
            if (error) {
                callback('connection error', null);
            } else {
                if (response.statusCode == 200) {
                    callback(null, 'reject_success');
                } else {
                    callback(body.reason, null);
                }
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
        },
    }, function (error, response, body) {
        if (error) {
            callback(error, null);
        } else {
            try {
                var data = JSON.parse(body);
                if (data.status == 'ok') {
                    callback(null, data);
                } else {
                    callback(data.message, null);
                }
            } catch (e) {
                callback('connection_error');
            }
        }
    });

}
