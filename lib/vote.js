var request = require('request');

var logger = require('./logger');
var config = require('../config');

module.exports = {
    'login': function (username, password) {
        // TODO

    },
    'ping': function () {
        // TODO

    },
    'authenticate': function (student_id, card_id, callback) {
        logger.debug('get student_id, card_id' + student_id + ' ' + card_id);
        request.post({
            url: config.AUTH_API_URL + '/authenticate',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: '3D18640BD359DA667842C704CB54AD6EFA7C5168C87693C34AA410F7949E0337',
                uid: student_id,
                cid: card_id,
            }
        }, function (error, response, body) {
            if (error) throw error;
            logger.debug(body);
            var data = JSON.parse(body);
            callback({
                token: data['vote_token'],
                id: data['uid'],
                type: data['type'],
            });
        });
    },
    'confirm': function (student_id, vote_token, callback) {
        request.post({
            url: config.AUTH_API_URL + '/confirm',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: '3D18640BD359DA667842C704CB54AD6EFA7C5168C87693C34AA410F7949E0337',
                // token: config.AUTH_API_TOKEN,
                uid: student_id,
                vote_token: vote_token,
            }
        }, function (error, response, body) {
            if (error) throw error;
            logger.debug(body);

            var data = JSON.parse(body);
            var ballot = data['ballot'];
            var callback_url = data['callback'];

            var station_id = '1';

            callback(ballot);
            //vote(station_id, ballot, callback_url, (response) => {
            //    callback(response['num']);
            //});
        });
    },
    'report': function (student_id, vote_token, callback) {
        // TODO
        request.post({
            url: config.AUTH_API_URL + '/report',
            form: {
                api_key: config.AUTH_API_KEY,
                version: config.AUTH_API_VERSION,
                token: '3D18640BD359DA667842C704CB54AD6EFA7C5168C87693C34AA410F7949E0337',
                // token: config.AUTH_API_TOKEN,
                uid: student_id,
                vote_token: vote_token,
            }
        }, function (error, response, body) {
            if (error) throw error;
            logger.debug(body);

            callback('Rejext');
            //vote(station_id, ballot, callback_url, (response) => {
            //    callback(response['num']);
            //});
        });

    },
};

function vote(station_id, ballot, callback_url, callback) {
    request.post({
        url: config.VOTE_API_URL,
        form: {
            'apikey': api_key,
            'a_id': station_id,
            'authcode': ballot,
            'callback': callback_url,
        }
    }, function (error, response, body) {
        callback(JSON.parse(body));
    });

}
