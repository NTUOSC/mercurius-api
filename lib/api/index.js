var request = require('request');

var app = require('express')();
var logger = require('../logger');
var config = require('../../config');
var vote = require('../vote');

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


    if (resp.locals.shared.student != null) {
        socket.emit('card attach', student.id + '@' + student.type);
    }

    socket.on('accept', () => {
        var student = resp.locals.shared.student;

        logger.debug('Acccept');
        logger.info('accept student' + student.id);

        vote.confirm(student.id, student.token, function (message) {
            socket.emit('message', message);
            resp.locals.shared.student = null; // set it back to null for next one
        });
    });

    socket.on('reject', () => {
        var student = resp.locals.shared.student;

        logger.info('reject student' + student.id);
        vote.report(student.id, student.token, function (message) {
            socket.emit('message', message);
            resp.locals.shared.student = null; // set it back to null for next one
        });
    });
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

    logger.debug(resp.locals.shared.student);

    if (resp.locals.shared.student === null) {
        vote.authenticate(req.body['student_id'], req.body['card_id'], function(student) {
            // student object contains token, id, type
            logger.debug(JSON.stringify(student));
            resp.locals.shared.student = student;
            socket.emit('card attach', student['id'] + '@' + student['type']);
            resp.send('');
        });
    } else {
        resp.send('system busy');
    }
});

module.exports = app;
