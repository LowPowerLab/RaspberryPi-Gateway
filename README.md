RaspberryPi Gateway Web Interface for the Moteino IoT Framework
----------------
By Felix Rusu (lowpowerlab.com/contact)
<br/>

###Features:
- SSL Encrypted with self signed certificate
- auth_basic Authenticated
- realtime websocket driven using node.js and socket.io
- [neDB](https://github.com/louischatriot/nedb) storage of node data and logs
- [flot](http://flotcharts.org/) front end graphs
- [Font-awesome](http://htmlpreview.github.io/?https://github.com/dotcastle/jquery-mobile-font-awesome/blob/master/index.html) icons for jQuery-Mobile

###License
This source code is released under GPL 3.0 with the following ammendment:<br/>
You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
For more details see [license.txt](https://github.com/LowPowerLab/RaspberryPi-Gateway/blob/master/license.txt)

###Details & Setup Guide
http://lowpowerlab.com/gateway

###Quick reference:
- From the application directory run `npm install`.
- Adjust any email/password/SMS settings in settings.js
- Connect a Moteino to your Pi through the serial port or USB if you have a MoteinoUSB. It should be running [this gateway sketch](https://github.com/LowPowerLab/RFM69/tree/master/Examples/PiGateway). Verify the settings in the sketch to match the hardware and also the encryption key and network ID should be the same on all nodes.
- Iteractively start the application with `npm start` or
- Install systemd service file to enable boot time startup and process monitoring.
 - Modify `moteino-gateway.service` file for your needs.
 - Copy file to `/etc/systemd/system/` (ubuntu)
 - Run `systemctl daemon-reload` to register new service with systemd.
 - Start application with `systemctl start moteino-gateway`
 - Enable across reboots with `systemctl enable moteino-gateway`

###Video Overview & Demo
https://www.youtube.com/watch?v=F15dEqZ4pMM
