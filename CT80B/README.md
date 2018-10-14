RadioThermostat CT80B 
----------------------
<br/>

RadioThermostat's CT80B has three areas where you can programmatically write status information.

PMA Area - A small area in the upper left, normally used for power company status messages. We can place the garage door status here.
UMA Area -  A two-line, full-width area at the bottom of the thermostat.
UMA0 - First line of UMA area.  We'll place the current weather observation here.
UMA1 - Second line of UMA area. We'll place the current forecast here.

###Dependencies
- These scripts rely on the jq utility to parse the json responses
-    cd /tmp
-    wget https://github.com/stedolan/jq/releases/download/jq-1.5/jq-1.5.tar.gz
-    tar xfvz jq-1.5.tar.gz
-    cd jq-1.5
-    ./configure && make && sudo make install

###How to use:
- Load your crontab... crontab -u pi tstat.crontab

