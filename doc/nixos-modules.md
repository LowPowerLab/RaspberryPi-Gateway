## profiles\.mightyhat\.enable



Whether to enable the LowPowerLab Moteino Gateway Raspberry Pi profile\.



*Type:*
boolean



*Default:*
` false `



*Example:*
` true `

*Declared by:*
 - [flake\.nix](/flake.nix)



## profiles\.mightyhat\.apply-overlays-dtmerge\.enable

Merge device tree overlays with ` dtmerge ` from
` libraspberrypi `\.

Additionally, supports merging compiled overlays from
` device-tree_rpi `, even if they specify a ` compatible `
stanza that is different than that nominally required by the target
device tree\.



*Type:*
boolean



*Default:*
` true `

*Declared by:*
 - [flake\.nix](/flake.nix)



## profiles\.mightyhat\.bluetooth\.disable



Apply the ` disable-bt ` device tree overlay from
` raspberrypi/firmware `\.



*Type:*
boolean



*Default:*
` true `

*Declared by:*
 - [flake\.nix](/flake.nix)



## profiles\.mightyhat\.bluetooth\.miniuart



Apply the ` miniuart-bt ` device tree overlay from
` raspberrypi/firmware `\.



*Type:*
boolean



*Default:*
` false `

*Declared by:*
 - [flake\.nix](/flake.nix)



## profiles\.mightyhat\.deviceTree



The device-tree_rpi package to use\.



*Type:*
package



*Default:*
` pkgs.device-tree_rpi.device-tree_rpi `

*Declared by:*
 - [flake\.nix](/flake.nix)



## profiles\.mightyhat\.uboot\.disableConsole



Apply an overlay that redefines the Raspberry-Pi-specific uboot
packages in order to disable the serial console\.

**Important:** Enabling this option may prevent you from selecting a NixOS boot
generation at the uboot loader screen!



*Type:*
boolean



*Default:*
` false `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.enable



Whether to enable the LowPowerLab Moteino Gateway\.



*Type:*
boolean



*Default:*
` false `



*Example:*
` true `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.package



The package providing the LowPowerLab Moteino Gateway\.



*Type:*
package



*Default:*
` "perSystem.config.packages.default" `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.contentDir



Directory for holding static content\.  At present, used only for
uploaded node icon images\.

**Note:** Because the gateway systemd service uses ` DynamicUser=yes `, this
directory has to be outside of ` StateDirectory `, ` CacheDirectory `,
and so on, so that the nginx webserver can read its contents\.



*Type:*
absolute path



*Default:*
` "/srv/www/moteino-gateway" `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.metrics



JavaScript scripts for exporting node metrics data\.

See https://github\.com/LowPowerLab/RaspberryPi-Gateway/blob/master/metrics/examples/_example\.js
for an example metrics script definition\.



*Type:*
attribute set of (submodule)



*Default:*
` { } `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.metrics\.\<name>\.name



Name of the metrics script\.



*Type:*
string



*Default:*
` "‹name›" `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.metrics\.\<name>\.source



Path of the source file containing the metrics script\.



*Type:*
absolute path

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.metrics\.\<name>\.text



Text of the metrics script\.



*Type:*
null or strings concatenated with “\\n”



*Default:*
` null `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.nodejs



The nodejs package to use\.



*Type:*
package



*Default:*
` pkgs.nodejs.nodejs `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.persistLogs



Whether to persist gateway info and error logs to the systemd
service’s configured ` LogsDirectory ` (by default,
` /var/log/moteino-gateway `)\.



*Type:*
boolean



*Default:*
` false `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings



Settings for the LowPowerLab Moteino Gateway\.  Defaults are loaded from
` ${services.moteino-gateway.package}/lib/node_modules/RaspberryPi-Gateway/settings.json5 `\.



*Type:*
JSON value



*Default:*
` { } `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings\.general



General settings\.



*Type:*
JSON value



*Default:*
` { } `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings\.general\.port



Listening port for the web application of the
LowPowerLab Moteino Gateway\.



*Type:*
16 bit unsigned integer; between 0 and 65535 (both inclusive)



*Default:*
` 8081 `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings\.general\.socketPort



Listening port for the websocket of the LowPowerLab Moteino Gateway\.



*Type:*
16 bit unsigned integer; between 0 and 65535 (both inclusive)



*Default:*
` 8080 `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings\.serial



Serial port settings\.



*Type:*
JSON value



*Default:*
` { } `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings\.serial\.baud



Needs to match the serial baud speed in the sketch
running on the Moteino or MightyHat, if any, that is
attached to this machine\.



*Type:*
positive integer, meaning >0



*Default:*
` 115200 `

*Declared by:*
 - [flake\.nix](/flake.nix)



## services\.moteino-gateway\.settings\.serial\.port



Serial port for the LowPowerLab Moteino Gateway\.



*Type:*
absolute path



*Default:*
` "/dev/ttyAMA0" `

*Declared by:*
 - [flake\.nix](/flake.nix)


