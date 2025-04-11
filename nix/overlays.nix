{
  flake = {
    overlays = {
      device-tree-apply-overlays-dtmerge = import ./overlays/device-tree-apply-overlays-dtmerge.nix;
      uboot-disable-console = import ./overlays/uboot-disable-console.nix;
    };
  };
}
