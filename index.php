<!DOCTYPE html>
<html lang="en">
<head>
  <title>Moteino automation</title>
  <link rel="icon" href="icon.ico" type="image/x-icon">
  <link rel="stylesheet" href="https://code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.min.css">
  <script src="http://code.jquery.com/jquery-1.11.1.js"></script>
  <script src="https://code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.min.js"></script>
  <script src="https://cdn.socket.io/socket.io-1.2.1.js"></script>
  <style type="text/css">
  .btn-text, #loadmsg {
      font-size: 32px;
  }
  #loadmsg {padding:15px;}
  
  textarea.ui-input-text {
    height:auto;
    font-size:15px;
    font-weight:bold;
    font-family:Courier New;
  }
  
  #wrap {
    padding: 12px;
  }
  </style>
</head>
<body>
  <div id="wrap">
    <div id="loadmsg">Loading socket ...</div>
    <div id="buttons" data-role="controlgroup" data-type="horizontal">
        <a id="statusbtn" href="#" data-role="button" data-icon="info"><span class="btn-text">Garage is ...</span></a>
        <a id="actionbtn" href="#" data-role="button" data-icon="alert"><span class="btn-text">OPN/CLS</span></a>
        <a id="clearbtn" href="#" data-role="button" data-icon="delete"><span class="btn-text">Clear Log</span></a>
    </div>
    <textarea id="log" rows="10"></textarea>
  </div>

  <script>
    $(function(){
      $('#buttons').hide();
      var socket = io.connect('<?php echo $_SERVER['HTTP_HOST']; ?>', {'connect timeout': 1000}); //limit chrome xhr-polling fall back delay
      var status = 'Unknown';

      socket.on('connect', function(){
        socket.emit('GRGSTS', 'got status?');
        $('#buttons').show();
        $('#loadmsg').hide();
      });
      
      socket.on('MOTEINO', function(data) {
        status = data;
        $('#statusbtn .btn-text').text('Garage is: ' + status);
        setActionButtonText();
      });
      
      socket.on('MOTEINOLOG', function(data) {
        $('#log').val(new Date().toLocaleTimeString() + ' : ' + data + '\n' + $('#log').val());
      });
      
      $("#statusbtn").click("tap", function(event) {
        $('#statusbtn .btn-text').text('Garage is: ...........');
        socket.emit('GRGSTS', 'got status?');
      });
      
      $("#actionbtn").click("tap", function(event) {
        if (status=="Unknown")
          socket.emit('GRGSTS', 'got status?');
        if (status=="Open")
          socket.emit('GRGCLS', 'close now!');
        if (status=="Closed")
          socket.emit('GRGOPN', 'open now!'); 
      });

      $("#clearbtn").click("tap", function(event) { $('#log').val(''); });
      
      function setActionButtonText() {
        var text = '<- refresh status';
        var icon = 'alert';
        if (status == 'Open') { text = 'Close it!'; icon = 'arrow-d'; }
        if (status == 'Closed') { text = 'Open it!'; icon = 'arrow-u'; }
        if (status == 'Opening' || status == 'Closing') text = ' .. wait .. ';
        $('#actionbtn .btn-text').text(text);
        $('#actionbtn').buttonMarkup({ icon: icon });
      }
    });
  </script>
</body>
</html>