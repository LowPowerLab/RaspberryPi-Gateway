var io = require('socket.io').listen(8080);
var serialport = require("serialport");
// change "/dev/ttyAMA0" to whatever your Pi's GPIO serial port is
var serial = new serialport.SerialPort("/dev/ttyAMA0", { baudrate : 115200, parser: serialport.parsers.readline("\n") });

//authorize handshake - make sure the request is coming from nginx, not from the outside world
//if you comment out this section, you will be able to hit this socket directly at the port it's running at, from anywhere!
io.configure(function () {
 io.set('authorization', function (handshake, accept) {
   console.log("AUTHORIZING CONNECTION FROM " + handshake.address.address + ":" + handshake.address.port);

   if (handshake.address.address == "localhost" || handshake.address.address == "127.0.0.1")
     accept(null, true);
   else
     accept("REJECTED IDENTITY", false);
   });
});

io.sockets.on('connection', function (socket) {
  var address = socket.handshake.address;
  console.log("New connection from " + address.address + ":" + address.port);

  // respond to STATUS updates
  socket.on('GRGSTS', function (data) {
    socket.emit('MOTEINOLOG', 'getting status...');
    serial.write('GRGSTS');
  });

  // open garage
  socket.on('GRGOPN', function (data) {
    socket.emit('MOTEINOLOG', 'requesting open...');
    serial.write('GRGOPN');
  });

  // close garage
  socket.on('GRGCLS', function (data) {
    socket.emit('MOTEINOLOG', 'requesting close...');
    serial.write('GRGCLS');
  });
});

serial.on("data", function (data) {
  var status = '';
  if (data.indexOf(' OPEN ') != -1)  status = 'Open';
  if (data.indexOf(' CLOSED ') != -1) status = 'Closed';
  if (data.indexOf(' OPENING ') != -1) status = 'Opening';
  if (data.indexOf(' CLOSING ') != -1) status = 'Closing';
  if (data.indexOf(' UNKNOWN ') != -1) status = 'Unknown';
  if (status.length >0)
    io.sockets.emit('MOTEINO', status);  
  io.sockets.emit('MOTEINOLOG', data);
});
