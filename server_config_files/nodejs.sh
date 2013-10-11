#!/bin/bash
### BEGIN INIT INFO
# Provides:          nodejs.sh
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Example initscript
# Description:       This file should be used to construct scripts to be
#                    placed in /etc/init.d.
### END INIT INFO


NODE=/opt/node/bin/node
SERVER_JS_FILE=/home/pi/moteino/gateway.js
USER=pi
OUT=/home/pi/moteino/gateway.log

case "$1" in

start)
	echo "starting node: $NODE $SERVER_JS_FILE"
	sudo -u $USER $NODE $SERVER_JS_FILE > $OUT 2>$OUT &
	;;

stop)
	killall $NODE
	;;

*)
	echo "usage: $0 (start|stop)"
esac

exit 0
