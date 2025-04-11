{
  self,
  moduleWithSystem,
  ...
}:
moduleWithSystem (
  {config} @ perSystem: {
    config,
    options,
    lib,
    pkgs,
    utils,
    ...
  } @ nixos: let
    inherit (lib) mkOption types;
    cfg = config.profiles.mightyhat;
    description = "LowPowerLab Moteino Gateway Raspberry Pi profile";
  in {
    options.profiles.mightyhat = {
      enable = lib.mkEnableOption "the ${description}";

      apply-overlays-dtmerge = {
        enable = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Merge device tree overlays with {command}`dtmerge` from
            {package}`libraspberrypi`.

            Additionally, supports merging compiled overlays from
            {package}`device-tree_rpi`, even if they specify a `compatible`
            stanza that is different than that nominally required by the target
            device tree.
          '';
        };
      };

      uboot = {
        disableConsole = mkOption {
          type = types.bool;
          default = false;
          description = ''
            Apply an overlay that redefines the Raspberry-Pi-specific uboot
            packages in order to disable the serial console.

            ::: {.important}
            Enabling this option may prevent you from selecting a NixOS boot
            generation at the uboot loader screen!
            :::
          '';
        };
      };

      # TODO see if there is a way to work backward from
      # `hardware.deviceTree.kernelPackage` to the relevant device
      # tree/firmware source.
      deviceTree = lib.mkPackageOption pkgs "device-tree_rpi" {
        default = "device-tree_rpi";
        pkgsText = "pkgs.device-tree_rpi";
      };

      # Disable bluetooth per
      # https://lowpowerlab.com/guide/mightyhat/pi3-compatibility/, or
      # put it on the miniuart.
      bluetooth = {
        disable = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Apply the `disable-bt` device tree overlay from
            `raspberrypi/firmware`.
          '';
        };

        miniuart = mkOption {
          type = types.bool;
          default = false;
          description = ''
            Apply the `miniuart-bt` device tree overlay from
            `raspberrypi/firmware`.
          '';
        };
      };
    };

    config = lib.mkIf cfg.enable {
      environment.systemPackages = [
        perSystem.config.packages.avrdude-rpi
        perSystem.config.packages.ubootToolsWithEnvtools
      ];

      boot.blacklistedKernelModules = lib.optionals cfg.bluetooth.disable ["bluetooth" "btusb"];

      hardware.bluetooth.enable = !cfg.bluetooth.disable;

      hardware.deviceTree = {
        enable = true;

        dtbSource = cfg.deviceTree;

        # FIXME no bluetooth on RPi Zero
        filter = lib.mkDefault "*rpi*.dtb";

        overlays = let
          mkDtboFileOverlay = {name, ...} @ args:
            {
              dtboFile = "${cfg.deviceTree.overlays}/${name}.dtbo";
            }
            // args;
        in
          (lib.optional cfg.bluetooth.disable (mkDtboFileOverlay {name = "disable-bt";}))
          ++ (lib.optional cfg.bluetooth.miniuart (mkDtboFileOverlay {name = "miniuart-bt";}));
      };

      hardware.enableRedistributableFirmware = lib.mkDefault true;

      nixpkgs.overlays =
        (lib.optional cfg.apply-overlays-dtmerge.enable self.overlays.device-tree-apply-overlays-dtmerge)
        ++ (lib.optional cfg.uboot.disableConsole self.overlays.uboot-disable-console);

      warnings = lib.optional (!cfg.apply-overlays-dtmerge.enable) (lib.concatStringsSep " " [
        "it appears that this configuration is using the default implementation of `deviceTree.applyOverlays`."
        "This is problematic on Raspberry Pis."
        "Please consider setting `profiles.mighthat.apply-overlays-dtmerge = true` in your configuration."
        "Without this, Bluetooth is likely to remain enabled on the non-mini UART, and `/dev/ttyAMA0` will be unavailable."
      ]);
    };
  }
)
