let
  # https://raspberrypi.stackexchange.com/questions/116074/how-can-i-disable-the-serial-console-on-distributions-that-use-u-boot
  # https://github.com/u-boot/u-boot/blob/eac52e4be4e234d563d6911737ee7ccdc0ada1f1/doc/README.autoboot
  # https://github.com/u-boot/u-boot/blob/eac52e4be4e234d563d6911737ee7ccdc0ada1f1/doc/README.silent
  # > The config option CONFIG_SILENT_CONSOLE can be used to quiet messages
  # > on the console.  If the option has been enabled, the output can be
  # > silenced by setting the environment variable "silent".
  # >
  # > - CONFIG_SILENT_CONSOLE_UPDATE_ON_SET
  # > 	When the "silent" variable is changed with env set, the change
  # > 	will take effect immediately.
  # >
  # > - CONFIG_SILENT_CONSOLE_UPDATE_ON_RELOC
  # > 	Some environments are not available until relocation (e.g. NAND)
  # > 	so this will make the value in the flash env take effect at
  # > 	relocation.
  # >
  # > The following actions are taken if "silent" is set at boot time:
  # >
  # >  - Until the console devices have been initialized, output has to be
  # >    suppressed by testing for the flag "GD_FLG_SILENT" in "gd->flags".
  # >
  # >  - When the console devices have been initialized, "stdout" and
  # >    "stderr" are set to "nulldev", so subsequent messages are
  # >    suppressed automatically. Make sure to enable "nulldev" by
  # >    enabling CONFIG_SYS_DEVICE_NULLDEV in your board defconfig file.
  # >
  # >  - When booting a linux kernel, the "bootargs" are fixed up so that
  # >    the argument "console=" will be in the command line, no matter how
  # >    it was set in "bootargs" before. If you don't want the linux command
  # >    line to be affected, define CONFIG_SILENT_U_BOOT_ONLY in your board
  # >    config file as well, and this part of the feature will be disabled.
  enableConfigSilentConsole = p:
    p.overrideAttrs (oldAttrs: {
      extraConfig =
        (p.extraConfig or "")
        + ''
          CONFIG_BOOTDELAY=-2
          CONFIG_SILENT_CONSOLE=y
          CONFIG_SILENT_U_BOOT_ONLY=y
          CONFIG_SYS_DEVICE_NULLDEV=y
          CONFIG_SILENT_CONSOLE_UPDATE_ON_SET=y
        '';
    });
in
  final: prev:
    prev.lib.mapAttrs (prev.lib.const enableConfigSilentConsole) (prev.lib.getAttrs [
        "ubootRaspberryPi"
        "ubootRaspberryPi2"
        "ubootRaspberryPi3_32bit"
        "ubootRaspberryPi3_64bit"
        "ubootRaspberryPi4_32bit"
        "ubootRaspberryPi4_64bit"
        "ubootRaspberryPiZero"
      ]
      prev)
