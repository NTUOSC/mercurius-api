var http = require('http');

var express = require('express');
var request = require('request');
var Promise = require('bluebird');
var socketIO = require('socket.io');
var winston = require('winston');
var morgan = require('morgan');

var logger = require('./lib/logger');

var config = require('./config');
var vote = require('./lib/vote');
var app = express();
var server = http.Server(app);
var io = socketIO(server);

var PORT = config.PORT || 8080;

// for the future
var env = process.env.NODE_ENV || 'development';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(morgan('combined'));
app.use(express.static(__dirname + '/dist'));

app.locals.shared = {};
app.locals.shared.student = null;
app.use((req, resp, next) => {
    // inject socket for each request to allow communications
    resp.locals.shared = app.locals.shared;
    next();
});

app.use(require('body-parser').urlencoded({ extended: true }));
app.use('/api', require('./lib/api'));
// no longer needed
// app.use('/mock', require('./lib/mock'));

io.on('connection', (socket) => {
    logger.info('socket client connected');
    // XXX: will only respond to the last socket
    app.locals.shared.socket = socket;
});

server.listen(PORT, (err) => {
    if (err) throw err;
    logger.info(`Server listening on port ${PORT}.`);

    vote.login(config.username, config.password);
});
