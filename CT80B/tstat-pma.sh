#!/bin/sh
grep \"_id\":2 /home/pi/gateway/data/db/gateway.db | /usr/bin/tail -1 > /tmp/cur-garage.json
/usr/bin/curl -d \{\"line\"\:0,\"message\":\"Garage\"\} http://tstat/tstat/pma
/usr/bin/curl -d \{\"line\"\:1,\"message\":\"`cat /tmp/cur-garage.json | /usr/local/bin/jq -r .metrics.Status.value`\"\} http://tstat/tstat/pma

