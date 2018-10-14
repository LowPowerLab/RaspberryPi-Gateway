#!/bin/sh
/usr/bin/curl -s -o /tmp/cur-conditions.json https://api.wunderground.com/api/f967d67694584476/conditions/q/pws:KNYCOLDS14.json
/usr/bin/curl -d \{\"line\"\:0,\"message\":\"\Outdoor\ Temp:\ `cat /tmp/cur-conditions.json | /usr/local/bin/jq -r .current_observation.temp_f`\ RH:\ `cat /tmp/cur-conditions.json | /usr/local/bin/jq -r .current_observation.relative_humidity`\"\} http://tstat/tstat/uma

