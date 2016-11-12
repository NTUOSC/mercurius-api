var $ = function (s) {
  return document.querySelector(s);
}
var $$ = function (s) {
  return document.querySelectorAll(s);
}

var socket = io('http://localhost:8080/info');
socket.on('card attach', function(data) {
  $('#name').innerHTML = data;
  $('#accept').removeAttribute('disabled');
  $('#reject').removeAttribute('disabled');
});

socket.on('message', function(data) {
  $('#message').innerHTML = data;
});

// Connection ON
socket.on('connect', function () {
  $('#message').innerHTML = 'Connection ON';
});
socket.on('reconnect', function () {
  $('#message').innerHTML = 'Connection ON';
});

// Connection OFF
socket.on('disconnect', function () {
  $('#message').innerHTML = 'Connection DOWN';
});

$('#accept').addEventListener('click', function (ev) {
  socket.emit('accept');
  $('#accept').setAttribute('disabled', true);
  $('#reject').setAttribute('disabled', true);
});

$('#reject').addEventListener('click', function (ev) {
  socket.emit('reject');
  $('#accept').setAttribute('disabled', true);
  $('#reject').setAttribute('disabled', true);
});
