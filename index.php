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
    <div class="buttons" data-role="controlgroup" data-type="horizontal">
        <a id="statusbtn" href="#" data-role="button" data-icon="info"><span class="btn-text">Garage is ...</span></a>
        <a id="actionbtn" href="#" data-role="button" data-icon="alert"><span class="btn-text">OPN/CLS</span></a>
        <a id="clearbtn" href="#" data-role="button" data-icon="delete"><span class="btn-text">Clear Log</span></a>
    </div>
    <div class="buttons" data-role="controlgroup" data-type="horizontal">
        <a id="SMLABbtn" href="#" data-role="button" data-icon="delete" style="background:red; color:white"><span class="btn-text">LAB (OFF)</span></a>
        <a id="SMSTAIRSbtn" href="#" data-role="button" data-icon="delete" style="background:red; color:white"><span class="btn-text">STAIRS (OFF)</span></a>
        <a id="SMFRONTbtn" href="#" data-role="button" data-icon="delete" style="background:red; color:white"><span class="btn-text">FRONT (OFF)</span></a>
    </div>
    <div class="buttons" data-role="controlgroup" data-type="horizontal">
      <a id="SMGARAGEbtn" href="#" data-role="button" data-icon="delete" style="background:red; color:white"><span class="btn-text">GARAGE (OFF)</span></a>
      <a id="SMLOBBYbtn" href="#" data-role="button" data-icon="delete" style="background:red; color:white"><span class="btn-text">LOBBY (OFF)</span></a>
    </div>
    
    <textarea id="log" rows="10"></textarea>
  </div>

  <script>
    $(function(){
      $('.buttons').hide();
      var socket = io.connect('<?php echo $_SERVER['HTTP_HOST']; ?>', {'connect timeout': 1000}); //limit chrome xhr-polling fall back delay
      var status = 'Unknown';
      var lights = {SMLABbtn:"OFF", SMSTAIRSbtn:"OFF", SMFRONTbtn:"OFF", SMLOBBYbtn:"OFF"};

      socket.on('connect', function(){
        socket.emit('GRGSTS', 'got status?');
        $('.buttons').show();
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
      
      $("#SMLABbtn").click("tap", function(event) {
        if (lights["SMLABbtn"]=="OFF")
          socket.emit('message', '23:SSR:1');
        else socket.emit('message', '23:SSR:0');
        $('#SMLABbtn .btn-text').text('LAB (...)');
      });
      
      $("#SMSTAIRSbtn").click("tap", function(event) {
        if (lights["SMSTAIRSbtn"]=="OFF")
          socket.emit('message', '25:SSR:1');
        else socket.emit('message', '25:SSR:0');
        $('#SMSTAIRSbtn .btn-text').text('STAIRS (...)');
      });
      
      $("#SMFRONTbtn").click("tap", function(event) {
        if (lights["SMFRONTbtn"]=="OFF")
          socket.emit('message', '26:SSR:1');
        else socket.emit('message', '26:SSR:0');
        $('#SMFRONTbtn .btn-text').text('FRONT (...)');
      });
      
      $("#SMGARAGEbtn").click("tap", function(event) {
        if (lights["SMGARAGEbtn"]=="OFF")
          socket.emit('message', '21:SSR:1');
        else socket.emit('message', '21:SSR:0');
        $('#SMGARAGEbtn .btn-text').text('GARAGE (...)');
      });
      
      $("#SMLOBBYbtn").click("tap", function(event) {
        if (lights["SMLOBBYbtn"]=="OFF")
          socket.emit('message', '27:SSR:1');
        else socket.emit('message', '27:SSR:0');
        $('#SMLOBBYbtn .btn-text').text('LOBBY (...)');
      });

      socket.on('SM', function(data) {
        if (data == "23:SSR:0")
        {
          $('#SMLABbtn .btn-text').text('LAB (OFF)').parent().buttonMarkup({ icon: "delete" }).parent().css("background", "red");
          lights["SMLABbtn"] = "OFF";
        }
        if (data == "23:SSR:1")
        {
          $('#SMLABbtn .btn-text').text('LAB (ON)').parent().buttonMarkup({ icon: "check" }).parent().css("background", "green");
          
          lights["SMLABbtn"] = "ON";
        }
        
        if (data == "25:SSR:0")
        {
          $('#SMSTAIRSbtn .btn-text').text('STAIRS (OFF)').parent().buttonMarkup({ icon: "delete" }).parent().css("background", "red");
          lights["SMSTAIRSbtn"] = "OFF";
        }
        if (data == "25:SSR:1")
        {
          $('#SMSTAIRSbtn .btn-text').text('STAIRS (ON)').parent().buttonMarkup({ icon: "check" }).parent().css("background", "green");
          lights["SMSTAIRSbtn"] = "ON";
        }
        
        if (data == "26:SSR:0")
        {
          $('#SMFRONTbtn .btn-text').text('FRONT (OFF)').parent().buttonMarkup({ icon: "delete" }).parent().css("background", "red");
          lights["SMFRONTbtn"] = "OFF";
        }
        if (data == "26:SSR:1")
        {
          $('#SMFRONTbtn .btn-text').text('FRONT (ON)').parent().buttonMarkup({ icon: "check" }).parent().css("background", "green");
          lights["SMFRONTbtn"] = "ON";
        }
        
        if (data == "21:SSR:0")
        {
          $('#SMGARAGEbtn .btn-text').text('GARAGE (OFF)').parent().buttonMarkup({ icon: "delete" }).parent().css("background", "red");
          lights["SMGARAGEbtn"] = "OFF";
        }
        if (data == "21:SSR:1")
        {
          $('#SMGARAGEbtn .btn-text').text('GARAGE (ON)').parent().buttonMarkup({ icon: "check" }).parent().css("background", "green");
          lights["SMGARAGEbtn"] = "ON";
        }
        
        if (data == "27:SSR:0")
        {
          $('#SMLOBBYbtn .btn-text').text('LOBBY (OFF)').parent().buttonMarkup({ icon: "delete" }).parent().css("background", "red");
          lights["SMLOBBYbtn"] = "OFF";
        }
        if (data == "27:SSR:1")
        {
          $('#SMLOBBYbtn .btn-text').text('LOBBY (ON)').parent().buttonMarkup({ icon: "check" }).parent().css("background", "green");
          lights["SMLOBBYbtn"] = "ON";
        }
      });
      
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