#!/bin/sh
curl -s -o /tmp/cur-forecast.json http://api.wunderground.com/api/f967d67694584476/forecast/q/pws:KNYCOLDS14.json
/usr/bin/curl -d \{\"line\"\:1,\"message\":\"\Today\ Hi:`cat /tmp/cur-forecast.json | /usr/local/bin/jq -r .forecast.simpleforecast.forecastday[0].high.fahrenheit`\ Lo:`cat /tmp/cur-forecast.json | /usr/local/bin/jq -r .forecast.simpleforecast.forecastday[0].low.fahrenheit`\ POP:`cat /tmp/cur-forecast.json | /usr/local/bin/jq -r .forecast.simpleforecast.forecastday[0].pop`\%\"\} http://tstat/tstat/uma

