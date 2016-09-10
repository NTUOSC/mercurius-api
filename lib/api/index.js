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
    socket.emit('auth checking');

    var args = {};
    args.token = resp.locals.shared.token;
    args.personal = JSON.stringify({
        id: req.body.student_id
    });
    args.cardId = req.body.card_id;

    var rtn = {
        ok: false
    };

    // POST /seeker ------------------------------------------------------
    request.post(config.API_URL_BASE + '/seeker', {
        json: true,
        form: args
    }, function(err, ffresp, ffbody) {
        if (ffresp.statusCode >= 400) {
            // repeated!
            logger.warn('post /seeker failed -- may be duplicated card', ffbody);
            rtn.joined = true;
        }

        // POST /stamp ------------------------------------------------------
        request.post(config.API_URL_BASE + '/stamp', {
            json: true,
            form: args
        }, function(err, fffresp, fffbody) {
            if (fffresp.statusCode >= 400) {
                // repeated!
                // whywhywhywhywhywhywhywhywhy
                logger.warn('post /stamp failed -- may be duplicated stamp', fffbody);
                logger.info('emit failure status to socket');
                socket.emit('auth failure', {
                    reason: 'rejected',
                    code: fffresp.statusCode
                });
                rtn.resp = fffresp.statusCode;
                resp.json(rtn);
                return;
            }

            rtn.ok = true;
            rtn.resp = fffbody;
            resp.json(rtn);

            logger.info('emit success status to socket');
            socket.emit('auth success', fffbody);
        });
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
