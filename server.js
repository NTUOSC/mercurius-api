var http = require('http');

var express = require('express');
var request = require('request');
var Promise = require('bluebird');
var winston = require('winston');
var morgan = require('morgan');

var logger = require('./lib/logger');

var config = require('./config');
var vote = require('./lib/vote');
var app = express();
var server = http.Server(app);
var api = require('./lib/api');

var PORT = config.PORT || 8080;

// for the future
var env = process.env.NODE_ENV || 'development';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(morgan('combined'));
app.use(express.static(__dirname + '/dist'));


app.use(require('body-parser').urlencoded({ extended: true }));
app.use('/api', api.router);

server.listen(PORT, (err) => {
    if (err) throw err;
    logger.info(`Server listening on port ${PORT}.`);

    vote.login(config.username, config.password);
});
api.io.attach(server, {
    'pingTimeout': 500,
    'pingInterval': 3000
});
