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
  $$('#message-box section').forEach(function (it) { it.innerHTML = ''; });
};

var change_button_state = function (s) {
  if (s === 'default') {
    $$('#authenticate-button button').forEach(function (it) { it.setAttribute('disabled', true); });
    $$('#clear-button button').forEach(function (it) { it.removeAttribute('disabled'); });
  } else if (s === 'authenticated') {
    $$('#authenticate-button button').forEach(function (it) { it.removeAttribute('disabled'); });
    $$('#clear-button button').forEach(function (it) { it.setAttribute('disabled', true); });
  } else if (s === 'offline') {
    $$('#authenticate-button button').forEach(function (it) { it.setAttribute('disabled', true); });
    $$('#clear-button button').forEach(function (it) { it.setAttribute('disabled', true); });
  }
};

var timeout = null;

var socket = io(document.URL);
socket.on('authenticated', function(data) {
  $('#name').innerHTML = data.id;
  $('#message').innerHTML = data.type + ' ' + data.department;
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

$$('button').forEach(function (it) {
  // active style
  it.addEventListener('touchstart', function (ev) { ev.preventDefault(); ev.target.className = 'active'; });
  it.addEventListener('mousedown', function (ev) { ev.preventDefault(); ev.target.className = 'active'; });

  // normal style
  it.addEventListener('touchend', function (ev) { ev.preventDefault(); ev.target.className = ''; });
  it.addEventListener('mouseup', function (ev) { ev.preventDefault(); ev.target.className = ''; });
});
