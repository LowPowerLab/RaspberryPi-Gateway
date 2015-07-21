exports.credentials = {
  emailservice : 'gmail',                  //default is gmail, see nodemailer reference for other clients
  email : '_________@gmail.com',           //put your gmail address here
  emailpass : '_____________',             //put your gmail password or app access code here
  emailAlertsTo : '__________@gmail.com',  //put your alert/notification email here (can be the same as above)
  smsAlertsTo : '__________@txt.att.net',  //if you want SMS notifications, fill this in with your phone number (it's your cell#, domain differs for each carrier, ex: 5551234567@vtext.com for verizon)
};

exports.general = {
  compactDBInterval : 86400000,
};