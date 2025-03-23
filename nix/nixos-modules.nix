{
  self,
  flake-parts-lib,
  lib,
  moduleWithSystem,
  ...
}: {
  flake = {
    nixosModules = let
      importApply = lib.importApply or flake-parts-lib.importApply;
      importModule = lib.flip importApply {inherit self moduleWithSystem;};
    in {
      default = self.nixosModules.moteino-gateway;
      mightyhat = importModule ./modules/nixos/mightyhat.nix;
      moteino-gateway = importModule ./modules/nixos/moteino-gateway.nix;
    };
  };
}
