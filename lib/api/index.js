var request = require('request');

var app = require('express')();
var logger = require('../logger');
var config = require('../../config');

app.use(function(req, resp, next) {
    if (resp.locals.shared.socket == null) {
        return resp.json({
            ok: false,
            fatal: true,
            msg: 'socket is not ready yet'
        });
    }
    next();
});

app.get('/info', function(req, resp) {
    // TODO: to push custom info to the client
});

app.post('/update', function(req, resp) {
    var socket = resp.locals.shared.socket;

    // as per: https://github.com/azdkj532/mercurius/blob/master/controller.py#L43
    logger.info('recv update request');

    var required_args = ['student_id', 'card_id'];
    for (var x in required_args) {
        if (req.body[required_args[x]] == null) {
            return resp.json({ ok: false, msg: 'missing parameter: ' + required_args[x] });
        }
    }

    logger.info('emit checking status to socket');
    socket.emit('auth recv', {
        token: resp.locals.shared.token,
        student_id: req.body.student_id,
        card_id: req.body.card_id
    });
});

module.exports = app;

/*
// HEAD /seeker ---------------------------------------------
request(config.API_URL_BASE + '/seeker', {
    json: true,
    method: 'head',
    form: args
}, function(err, fresp, fbody) {
    if (err) {
        resp.json({
            ok: false,
            err: err
        });
        logger.error('failed to connect to remote', err);
        socket.emit('auth failure', {
            reason: 'connect',
            code: err.code
        });
        return;
    }

    if (fresp.statusCode >= 400) {
        resp.json({
            ok: false,
            err: fresp.statusCode
        });
        logger.error('failed to auth with remote; status code', fresp.statusCode);
        socket.emit('auth failure', {
            reason: 'rejected',
            code: fresp.statusCode
        });
        return;
    }

    logger.info('recv auth data from remote');
    // console.log(fbody);
 */
