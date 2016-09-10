var Vue = require('vue');

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

    self.socket.on('auth checking', function() {
        self.authStatus = 'checking';
        console.log('checking!!');
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

    self.socket.on('auth success', function(msg) {
        self.authStatus = 'success';
        self.authInfo = JSON.stringify(msg);
        // Par.init(2000);
        Par.burstRandom();
        rememberToSetItBack();
        console.log('success!!', arguments);
    });

    self.socket.on('auth failure', function(msg) {
        self.authStatus = 'failure';
        self.authInfo = JSON.stringify(msg);
        rememberToSetItBack();
        console.log('failure!!', arguments);
    });
  }
});
