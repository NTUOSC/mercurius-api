var $ = function (s) {
  return document.querySelector(s);
};
var $$ = function (s) {
  return document.querySelectorAll(s);
};

var l = function (string) {
    return string.toLocaleString("zh_tw");
};

var socket = io('http://localhost:8080');
socket.on('card attach', function(data) {
  $('#name').innerHTML = data;
  $('#accept').removeAttribute('disabled');
  $('#reject').removeAttribute('disabled');
});

socket.on('message', function(data) {
  $('#message').innerHTML = l(data);
});

// Connection ON
socket.on('connect', function () {
  $('#message').innerHTML = l('online');
});
socket.on('reconnect', function () {
  $('#message').innerHTML = l('online');
});

// Connection OFF
socket.on('disconnect', function () {
  $('#message').innerHTML = l('offline');
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
