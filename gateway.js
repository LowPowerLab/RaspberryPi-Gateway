var io = require('socket.io').listen(8080);
var serialport = require("serialport");
// change "/dev/ttyAMA0" to whatever your Pi's GPIO serial port is
var serial = new serialport.SerialPort("/dev/ttyAMA0", { baudrate : 115200, parser: serialport.parsers.readline("\n") });
 
//authorize handshake - make sure the request is coming from nginx, not from the outside world
//if you comment out this section, you will be able to hit this socket directly at the port it's running at, from anywhere!
io.use(function(socket, next) {
 var handshakeData = socket.request;
 console.log("AUTHORIZING CONNECTION FROM " + handshakeData.connection.remoteAddress + ":" + handshakeData.connection.remotePort);
 if (handshakeData.connection.remoteAddress == "localhost" || handshakeData.connection.remoteAddress == "127.0.0.1")
 next();
 next(new Error('REJECTED IDENTITY, not coming from localhost'));
});
 
io.sockets.on('connection', function (socket) {
  var address = socket.request.connection;
  console.log("New connection from " + address.remoteAddress + ":" + address.remotePort);
 
  // respond to STATUS updates
  socket.on('GRGSTS', function (data) {
    socket.emit('MOTEINOLOG', 'getting status...');
    serial.write('11:STS'); //serial.write('GRGSTS');
  });
 
  // open garage
  socket.on('GRGOPN', function (data) {
    socket.emit('MOTEINOLOG', 'requesting open...');
    serial.write('11:OPN'); //serial.write('GRGOPN');
  });
 
  // close garage
  socket.on('GRGCLS', function (data) {
    socket.emit('MOTEINOLOG', 'requesting close...');
    serial.write('11:CLS'); //serial.write('GRGCLS');
  });

  socket.on('message', function(data) { serial.write(data); } );
});
 
serial.on("data", function (data) {
  var status = '';
  if (data.indexOf(' OPEN ') != -1)  status = 'Open';
  if (data.indexOf(' CLOSED ') != -1) status = 'Closed';
  if (data.indexOf(' OPENING ') != -1) status = 'Opening';
  if (data.indexOf(' CLOSING ') != -1) status = 'Closing';
  if (data.indexOf(' UNKNOWN ') != -1) status = 'Unknown';
  if (status.length >0)
  {
    io.sockets.emit('MOTEINO', status);  
  }

  status='';
  if (data.indexOf("[21] SSR:0") != -1 || data.indexOf("[21] BTN1:0") != -1) status = "21:SSR:0";
  if (data.indexOf("[21] SSR:1") != -1 || data.indexOf("[21] BTN1:1") != -1) status = "21:SSR:1";
  if (data.indexOf("[23] SSR:0") != -1 || data.indexOf("[23] BTN1:0") != -1) status = "23:SSR:0";
  if (data.indexOf("[23] SSR:1") != -1 || data.indexOf("[23] BTN1:1") != -1) status = "23:SSR:1";
  if (data.indexOf("[25] SSR:0") != -1 || data.indexOf("[25] BTN1:0") != -1) status = "25:SSR:0";
  if (data.indexOf("[25] SSR:1") != -1 || data.indexOf("[25] BTN1:1") != -1) status = "25:SSR:1";
  if (data.indexOf("[26] SSR:0") != -1 || data.indexOf("[26] BTN1:0") != -1) status = "26:SSR:0";
  if (data.indexOf("[26] SSR:1") != -1 || data.indexOf("[26] BTN1:1") != -1) status = "26:SSR:1";
  if (data.indexOf("[27] SSR:0") != -1 || data.indexOf("[27] BTN1:0") != -1) status = "27:SSR:0";
  if (data.indexOf("[27] SSR:1") != -1 || data.indexOf("[27] BTN1:1") != -1) status = "27:SSR:1";
  if (status.length >0)
  {
    io.sockets.emit('SM', status);  
  }
  io.sockets.emit('MOTEINOLOG', data);
});