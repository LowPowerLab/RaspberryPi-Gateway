{
  lib,
  config,
  dream2nix,
  pkgs,
  ...
} @ args: let
  packageJSON = lib.importJSON ./package.json;
in {
  imports = [
    dream2nix.modules.dream2nix.nodejs-package-json-v3
    dream2nix.modules.dream2nix.nodejs-granular-v3
  ];

  inherit (packageJSON) name version;

  # Take advantage of a shell injection vector in dream2nix in order to apply a
  # workaround for an issue with `npm i` converting dependencies specified with
  # `git+https://` or `github:` to `git+ssh://`.
  # See:
  #   - https://github.com/npm/cli/issues/2610
  #   - https://github.com/npm/cli/issues/2631
  nodejs-package-json.npmArgs = lib.mkAfter [
    "--package-lock-only' ; ${lib.getExe pkgs.gnused} -i -e 's|git+ssh://|git+https://|g' ./package-lock.json #"
  ];

  mkDerivation = {
    src = lib.cleanSource ./.;
    doCheck = false;
    meta = {
      # XXX broken somehow? `lib.licenses.gpl3` works...
      #license = lib.licenses.cc-by-nc-40;
      homepage = "https://github.com/LowPowerLab/RaspberryPi-Gateway";
    };
  };
}
