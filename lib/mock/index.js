var app = require('express')();
var logger = require('../logger');

// as per: https://paper.dropbox.com/doc/LtJmPPolirxdcbajFcx1h
app.post('/authentication', function(req, resp) {
    if (req.body.account == null || req.body.password == null) {
        logger.debug('mock fail: token required for /authentication');
        return resp.status(400).json({ ok: false });
    }
    if (req.body.account != 'tester' && req.body.password != 'tester') {
        logger.debug('mock fail: failed login for /authentication');
        return resp.status(400).json({ ok: false });
    }

    resp.json({ ok: true, token: 'TEST_TOKEN' });
});

app.head('/seeker', function(req, resp) {
    if (req.body.token == null) {
        logger.debug('mock fail: token required for /seeker');
        return resp.status(400).json({ ok: false });
    }
    if (req.body.cardId == null && req.body.account == null) {
        logger.debug('mock fail: either cardId or account required for /seeker');
        return resp.status(400).json({ ok: false });
    }

    resp.json({ ok: true });
});

module.exports = app;
