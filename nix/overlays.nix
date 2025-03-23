{
  self,
  inputs,
  ...
}: {
  imports = [
    inputs.flake-parts.flakeModules.easyOverlay
  ];

  flake = {
    overlays = {
      device-tree-apply-overlays-dtmerge = import ./overlays/device-tree-apply-overlays-dtmerge.nix;
      uboot-disable-console = import ./overlays/uboot-disable-console.nix;
      raspberrypi-utils = final: prev: let
        applied = self.flake.overlays.default final prev;
      in {
        raspberrypi-userland = prev.libraspberrypi;
        libraspberrypi = applied.raspberrypi-utils;
      };
    };
  };

  perSystem = {config, ...}: {
    overlayAttrs = {
      inherit (config.packages) avrdude-rpi avrdude-rpi-autoreset raspberrypi-utils;
    };
  };
}
