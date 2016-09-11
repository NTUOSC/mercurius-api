var Vue = require('vue');
var request = require('request');

var Par = require('./particles');

Par.setCanvas('#background-canvas');

Vue.config.debug = true;

var app = new Vue({
  el: '#app',
  data: {
    state: 'waiting',
    socket: null,
    disconnected: null,
    authStatus: null,
    authData: null,
    authInfo: ''
  },
  created: function() {
    var self = this;
    self.socket = io.connect('/');
    self.socket.on('connect', function() {
        self.state = 'ok';
        Par.init(200);
    });
    self.socket.on('disconnect', function() {
        reset();
        self.disconnected = true;
    });
    self.socket.on('reconnect', function() {
        reset();
        self.disconnected = false;
    });

    self.socket.on('auth recv', function(authData) {
        self.authStatus = 'checking';
        self.authData = authData;
        console.log('checking!!', authData);

        doCheck(authData, {
            authSuccess: function(msg) {
                self.authStatus = 'success';
                self.authInfo = JSON.stringify(msg);
                // Par.init(2000);
                Par.burstRandom();
                rememberToSetItBack();
                console.log('success!!', arguments);
            },

            authFailure: function(msg) {
                self.authStatus = 'failure';
                self.authInfo = JSON.stringify(msg);
                rememberToSetItBack();
                console.log('failure!!', arguments);
            }
        });
    });

    function reset() {
        self.authStatus = null;
        self.authInfo = '';
    }

    var stamp = null;
    function rememberToSetItBack() {
        if (stamp) {
            clearTimeout(stamp);
        }
        stamp = setTimeout(reset, 6000);
    }
  }
});

console.log(request);

function doCheck(authData, cbs) {
    var args = {};
    args.token = authData.token;
    args.personal = JSON.stringify({
        id: authData.student_id
    });
    args.cardId = authData.card_id;

    var rtn = {
        ok: false
    };

    // POST /seeker ------------------------------------------------------
    request.post('https://api.ntuosc.org/seeker', {
        json: true,
        form: args
    }, function(err, ffresp, ffbody) {
        if (ffresp.statusCode >= 400) {
            // repeated!
            console.warn('post /seeker failed -- may be duplicated card', ffbody);
            rtn.joined = true;
        }

        // POST /stamp ------------------------------------------------------
        request.post('https://api.ntuosc.org/stamp', {
            json: true,
            form: args
        }, function(err, fffresp, fffbody) {
            if (fffresp.statusCode >= 400) {
                // repeated!
                // whywhywhywhywhywhywhywhywhy
                console.warn('post /stamp failed -- may be duplicated stamp', fffbody);
                console.info('emit failure status to socket');
                cbs.authFailure({
                    reason: 'rejected',
                    code: fffresp.statusCode
                });
                return;
            }

            rtn.ok = true;
            rtn.resp = fffbody;
            cbs.authSuccess(rtn);
        });
    });
} 
