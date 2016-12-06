var $ = function (s) {
  return document.querySelector(s);
};
var $$ = function (s) {
  return document.querySelectorAll(s);
};

var l = function (string) {
    return string.toLocaleString("zh_tw");
};

var clear_message = function () {
  $$('#message-box section').forEach(function (it) { it.innerHTML = '' });
}

var change_button_state = function (s) {
  var valid_action = { 'activate' : true, 'deactivate' : false };
  if (valid_action[s]) {
    $('#accept').setAttribute('disabled', true);
    $('#reject').setAttribute('disabled', true);
    $('#dismiss').removeAttribute('disabled');
  } else {
    $('#accept').removeAttribute('disabled');
    $('#reject').removeAttribute('disabled');
    $('#dismiss').setAttribute('disabled', true);
  }
}

var timeout;

var socket = io('http://localhost:8080');
socket.on('card attach', function(data) {
  $('#name').innerHTML = data;
  // $('#name').innerHTML = data.id;
  // $('#message').innerHTML = data.type;
  change_button_state('activate');
});

socket.on('message', function(data) {
  $('#name').innerHTML = '';
  $('#message').innerHTML = data;
  change_button_state('deactivate');
  timeout = setTimeout(clear_message, 5000);
});

// Connection ON
socket.on('connect', function () {
  $('#status').innerHTML = l('online');
  change_button_state('deactivate');
});
socket.on('reconnect', function () {
  $('#status').innerHTML = l('online');
  change_button_state('deactivate');
});

// Connection OFF
socket.on('disconnect', function () {
  $('#status').innerHTML = l('offline');
  change_button_state('deactivate');
  clear_message();
});

$('#accept').addEventListener('click', function (ev) {
  socket.emit('accept');
  change_button_state('deactivate');
});

$('#reject').addEventListener('click', function (ev) {
  socket.emit('reject');
  change_button_state('deactivate');
});

$('#dismiss').addEventListener('click', function (ev) {
  change_button_state('deactivate');
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
