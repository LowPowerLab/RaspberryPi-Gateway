exports.credentials = {
  emailservice : 'gmail',                  //default is gmail, see nodemailer reference for other clients - https://github.com/andris9/Nodemailer
  email : '_________@gmail.com',           //put your gmail address here
  emailpass : '_____________',             //put your gmail password or app access code here
  emailAlertsTo : '__________@gmail.com',  //put your alert/notification email here (can be the same as above)
  smsAlertsTo : '__________@txt.att.net',  //if you want SMS notifications, fill this in with your phone number (it's your cell#, domain differs for each carrier, ex: 5551234567@vtext.com for verizon)
};

exports.serial = {
  port : '/dev/ttyAMA0', //replace this with whatever serial port you have on your Pi/gateway (ttyAMA0 is the default GPIO serial port)
                         //if you use a MoteinoUSB then your Pi will emulate a serial port like /dev/ttyUSB0
  baud : 115200,
};

exports.database = {
  name : 'gateway.db',
  nonMatchesName : 'gateway_nonmatches.db',
};

exports.general = {
  consoleLogDateFormat : 'mm-dd-yy_HH:MM:ss.l',
  socketPort : 8080,
};

exports.radiothermostat = {
  ip : '192.168.0.100',
};