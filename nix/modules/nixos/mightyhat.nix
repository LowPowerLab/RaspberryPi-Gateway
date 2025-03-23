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
    mgCfg = config.services.moteino-gateway;
  in {
    imports = [
      # In order to access the configured serial device so that we can
      # determine whether we should set pins 14 and 15 to their `ALT0`
      # functions.
      self.nixosModules.moteino-gateway
    ];

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

      dtboSources = mkOption {
        type = types.nonEmptyListOf types.path;
        defaultText = lib.literalExpression ''
          ["/some/directory/or/other"]
        '';
        description = ''
          List of directories containing compiled device tree overlays
          (`.dtbo`s) **in descending order of priority**.  That is, this module
          will prefer to use `.dtbo`s from earlier entries in this list over
          homonymous `.dtbo`s from entries later in the list.
        '';
      };

      resolveDTBO = mkOption {
        type = types.functionTo types.path;
        readOnly = true;
        default = let
          sources = lib.unique cfg.dtboSources;
          ext = ".dtbo";
        in
          lib.flip lib.pipe [
            (name: "${name}${lib.optionalString (!(lib.hasSuffix ext name)) ext}")
            (baseName: map (source: "${source}/${baseName}") sources)
            (lib.filter builtins.pathExists)
            lib.head
          ];
        defaultText = lib.literalExpression ''
          resolve "disable-bt"
          => "/some/directory/or/other/disable-bt.dtbo"
        '';
        description = ''
          Function from a device tree overlay name to a compiled device tree
          overlay (`.dtbo`).
        '';
      };

      overlays = mkOption {
        type = types.path;
        default = cfg.deviceTreePackage.overlays;
        description = ''
          Path containing compiled device tree overlay files.
        '';
      };

      dtbo = mkOption {
        type = types.attrsOf (types.submodule ({
          config,
          name,
          ...
        }: {
          options = {
            name = mkOption {
              type = types.str;
              default = name;
              description = ''
                Name of this DTBO.  Used as the default basename (minus
                extension) of {option}`file`.
              '';
            };

            file = mkOption {
              type = types.path;
              default = cfg.resolveDTBO config.name;
              defaultText = lib.literalExpression ''
                config.profiles.mightyhat.resolveDTBO ${config.name}
              '';
              description = ''
                Path of the DTBO file.
              '';
            };

            enable = mkOption {
              type = types.bool;
              default = true;
              description = ''
                Apply this DTBO to the device tree.
              '';
            };

            filter = mkOption {
              type = types.nullOr types.str;
              default = null;
              description = ''
                Filter to pass through to the generated
                {option}`hardware.deviceTree.overlays` entry.
              '';
            };
          };
        }));
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

    config = lib.mkIf cfg.enable (lib.mkMerge [
      {
        environment.systemPackages = [
          perSystem.config.packages.avrdude-rpi
          perSystem.config.packages.ubootToolsWithEnvtools
        ];

        boot.blacklistedKernelModules = lib.optionals cfg.bluetooth.disable [
          "bluetooth"
          "btusb"
          "btsdio"
        ];

        hardware.bluetooth.enable = !cfg.bluetooth.disable;

        hardware.deviceTree = {
          enable = true;

          overlays = lib.pipe cfg.dtbo [
            builtins.attrValues
            (lib.filter (dtbo: dtbo.enable))
            (map (dtbo: {
              inherit (dtbo) name filter;
              dtboFile = dtbo.file;
            }))
          ];
        };

        hardware.enableRedistributableFirmware = lib.mkDefault true;

        profiles.mightyhat = {
          dtboSources = let
            inherit (config.hardware.deviceTree) dtbSource;
          in
            (lib.toList (dtbSource.overlays or []))
            ++ [
              "${dtbSource}/overlays"
              pkgs.device-tree_rpi.overlays
              "${pkgs.raspberrypifw}/share/raspberrypi/boot/overlays"
            ];

          dtbo = {
            # FIXME no bluetooth on RPi Zero; add a filter to the `disable-bt`
            # dtbo.
            disable-bt.enable = cfg.bluetooth.disable;
            miniuart-bt.enable = cfg.bluetooth.miniuart;
          };
        };

        nixpkgs.overlays =
          (lib.optional cfg.apply-overlays-dtmerge.enable self.overlays.device-tree-apply-overlays-dtmerge)
          ++ (lib.optional cfg.uboot.disableConsole self.overlays.uboot-disable-console);

        warnings = lib.optional (!cfg.apply-overlays-dtmerge.enable) (lib.concatStringsSep " " [
          "it appears that this configuration is using the default implementation of `deviceTree.applyOverlays`."
          "This is problematic on Raspberry Pis."
          "Please consider setting `profiles.mightyhat.apply-overlays-dtmerge = true` in your configuration."
          "Without this, Bluetooth is likely to remain enabled on the non-mini UART, and `/dev/ttyAMA0` will be unavailable."
        ]);
      }

    ]);
  }
)
