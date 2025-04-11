{
  perSystem = {
    config,
    lib,
    pkgs,
    ...
  }: {
    devshells = {
      default = {
        commands =
          [
            {
              name = "dream2nix-lock";
              command = ''
                cd "$(git rev-parse --show-cdup)" || exit
                exec -a "$0" nix run "$@" '.#default.lock'
              '';
              help = "Lock dependencies in lock.json";
            }

            {
              name = "mkoptdocs";
              command = ''
                cd "$(git rev-parse --show-cdup)" || exit
                while read -r out_path; do
                  install -Dm0644 "$out_path" ./doc/nixos-modules.md
                done < <(nix build "$@" --no-link --print-out-paths '.#docs')
              '';
              help = "Build NixOS module options documentation";
            }

            {
              package = config.treefmt.build.wrapper;
            }

            {
              package = pkgs.act;
            }
          ]
          ++ lib.pipe config.packages [
            (lib.flip builtins.removeAttrs ["default"])
            (builtins.attrValues)
            (lib.filter (package: package ? meta.mainProgram))
            (map (package: {inherit package;}))
          ];
      };
    };
  };
}
