$(function () {
    var socket = io('http://localhost:8080');
    socket.on('card attach', function(data) {
        $('#name').text(data);
        $('#accept').prop( "disabled", false);
        $('#reject').prop( "disabled", false);
    });

    socket.on('message', function(data) {
        $('#message').text(data);
    });

    // Connection ON
    socket.on('connect', function () {
        $('#message').text('Connection ON');
    });
    socket.on('reconnect', function () {
        $('#message').text('Connection ON');
    });

    // Connection OFF
    socket.on('disconnect', function () {
        $('#message').text('Connection DOWN');
    });

    $('#accept').click(function () {
        socket.emit('accept');
        $('#accept').prop( "disabled", true);
        $('#reject').prop( "disabled", true);
    });

    $('#reject').click(function () {
        socket.emit('reject');
        $('#accept').prop( "disabled", true);
        $('#reject').prop( "disabled", true);
    });
});
