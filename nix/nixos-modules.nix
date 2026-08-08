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
      importModule = src: let
        mod = importApply src {inherit self moduleWithSystem;};
      in
        {
          key = mod._file;
        }
        // mod;
    in {
      default = self.nixosModules.moteino-gateway;
      mightyhat = importModule ./modules/nixos/mightyhat.nix;
      moteino-gateway = importModule ./modules/nixos/moteino-gateway.nix;
    };
  };
}
