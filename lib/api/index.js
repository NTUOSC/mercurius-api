var request = require('request');

var app = require('express')();
var io = require('socket.io')();
var logger = require('../logger');
var config = require('../../config');
var vote = require('../vote');

app.locals.shared = {};
app.locals.shared.student = null;
app.locals.shared.socket = null;

app.use((req, resp, next) => {
    // inject socket for each request to allow communications
    resp.locals.shared = app.locals.shared;
    next();
});

app.use((req, resp, next) => {
    if (resp.locals.shared.socket === null) {
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
        if (req.body[required_args[x]] === null) {
            return resp.json({ ok: false, msg: 'missing parameter: ' + required_args[x] });
        }
    }

    if (resp.locals.shared.student === null) {
        var student_id = req.body.student_id;
        var card_id = req.body.card_id;
        vote.authenticate(student_id, card_id, function(err, student) {
            if (err) {
                logger.error('receive error ' + err);
                socket.emit('message', err);
                resp.send(err);
            } else {
                // student object contains token, id, type
                logger.debug(JSON.stringify(student));
                resp.locals.shared.student = student;
                socket.emit('card attach', student.id + '@' + student.type);
                socket.emit('message', '');
                resp.send('success');
            }
        });
    } else {
        resp.send('system busy');
    }
});

io.on('connection', (socket) => {
    logger.info('socket client connected');
    // XXX: will only respond to the last socket
    app.locals.shared.socket = socket;

    if (app.locals.shared.student !== null) {
        socket.emit('card attach', student.id + '@' + student.type);
    }

    socket.on('accept', () => {
        var student = app.locals.shared.student;

        logger.debug('Acccept');
        logger.info('accept student' + student.id);

        vote.confirm(student.id, student.token, function (err, response) {
            if (err) {
                logger.info('receive error ' + err);
                socket.emit('message', err);
            } else {
                logger.info('receive information ' + response);
                socket.emit('message', response);
            }
            app.locals.shared.student = null; // set it back to null for next one
        });
    });

    socket.on('reject', () => {
        var student = app.locals.shared.student;

        logger.info('reject student' + student.id);
        vote.report(student.id, student.token, function (message) {
            socket.emit('message', message);
            app.locals.shared.student = null; // set it back to null for next one
        });
    });
});

module.exports = {
    router: app,
    io: io,
};
