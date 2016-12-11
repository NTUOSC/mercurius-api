var $ = function (s) {
  return document.querySelector(s);
};
var $$ = function (s) {
  return document.querySelectorAll(s);
};

var l = function (string) {
    if (string) {
        return string.toLocaleString("zh_tw");
    } else {
        return string;
    }
};

var clear_message = function () {
  for (var i = 0; i < $$('#message-box section').length; ++i) {
    $$('#message-box section')[i].innerHTML = '';
  }
};

var change_button_state = function (s) {
  if (s === 'default') {
    for (var i = 0; i < $$('#authenticate-button button').length; ++i) {
      $$('#authenticate-button button')[i].setAttribute('disabled', true);
    }
    for (var i = 0; i < $$('#clear-button button').length; ++i) {
      $$('#clear-button button')[i].removeAttribute('disabled');
    }
  } else if (s === 'authenticated') {
    for (var i = 0; i < $$('#authenticate-button button').length; ++i) {
      $$('#authenticate-button button')[i].removeAttribute('disabled');
    }
    for (var i = 0; i < $$('#clear-button button').length; ++i) {
      $$('#clear-button button')[i].setAttribute('disabled', true);
    }
  } else if (s === 'offline') {
    for (var i = 0; i < $$('#authenticate-button button').length; ++i) {
      $$('#authenticate-button button')[i].setAttribute('disabled', true);
    }
    for (var i = 0; i < $$('#clear-button button').length; ++i) {
      $$('#clear-button button')[i].setAttribute('disabled', true);
    }
  }
};

var timeout = null;

var socket = io(document.URL);
socket.on('authenticated', function(data) {
  $('#name').innerHTML = data.id;
  $('#message').innerHTML = data.type + ' ' + data.department;
  change_button_state('authenticated');
});

socket.on('confirmed', function(data) {
  $('#name').innerHTML = data.id;
  $('#message').innerHTML = l('please go to station') + ' ' + data.slot;
  change_button_state('authenticated');
});

socket.on('message', function(data) {
  $('#name').innerHTML = '';
  $('#message').innerHTML = l(data);
  change_button_state('default');
  if (timeout !== null){
    clearTimeout(timeout);
  }
  timeout = setTimeout(clear_message, 5000);
});

socket.on('station', function (data) {
  $('#station').innerHTML = data;
});

// Connection ON
socket.on('connect', function () {
  $('#status').innerHTML = l('online');
  $('#status-box').className = '';
  change_button_state('default');
});
socket.on('reconnect', function () {
  $('#status').innerHTML = l('online');
  $('#status-box').className = '';
  change_button_state('default');
});

// Connection OFF
socket.on('disconnect', function () {
  $('#status').innerHTML = l('offline');
  $('#status-box').className = 'offline';
  change_button_state('offline');
  clear_message();
});

$('#accept').addEventListener('click', function (ev) {
  socket.emit('accept');
  change_button_state('default');
});

$('#reject').addEventListener('click', function (ev) {
  socket.emit('reject');
  change_button_state('default');
});

$('#dismiss').addEventListener('click', function (ev) {
  change_button_state('default');
  clear_message();
  clearTimeout(timeout);
});
