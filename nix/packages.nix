{
  self,
  inputs,
  ...
}: {
  perSystem = {
    config,
    pkgs,
    system,
    ...
  }: {
    packages = {
      default = config.packages.raspberrypi-gateway;

      docs = pkgs.callPackage ({
        nixosOptionsDoc,
        lib,
        eval,
      }:
        (nixosOptionsDoc {
          options = {
            inherit (eval.options.profiles) mightyhat;
            inherit (eval.options.services) moteino-gateway;
          };

          # Default is currently "appendix".
          documentType = "none";

          warningsAreErrors = true;

          transformOptions = let
            ourPrefix = "${toString self}/";
            moduleSource = "flake.nix";
            link = {
              url = "/${moduleSource}";
              name = moduleSource;
            };
          in
            opt:
              opt
              // {
                visible = opt.visible && (lib.any (lib.hasPrefix ourPrefix) opt.declarations);
                declarations = map (decl:
                  if lib.hasPrefix ourPrefix decl
                  then link
                  else decl)
                opt.declarations;
              };
        })
        .optionsCommonMark) {
        eval = self.nixosConfigurations.default.extendModules {
          modules = [
            {
              nixpkgs.hostPlatform = system;
            }
          ];
        };
      };

      raspberrypi-gateway = inputs.dream2nix.lib.evalModules {
        packageSets.nixpkgs = pkgs;
        modules = let
          projectRoot = self;
          app = self + "/app.nix";
        in [
          app
          {
            paths = {
              inherit projectRoot;
              projectRootFile = "flake.nix";
              package = self;
            };
          }
        ];
      };

      avrdude-rpi-autoreset = pkgs.callPackage ({writers}:
        writers.makeScriptWriter {
          inherit (pkgs.python3.withPackages (p: [p.rpi-gpio])) interpreter;
        } "/bin/avrdude-rpi-autoreset" (builtins.readFile "${inputs.avrdude-rpi}/autoreset")) {};

      # Likely has to be run with `sudo` or another privilege-escalation
      # tool.
      avrdude-rpi = pkgs.callPackage ({
        avrdude,
        strace,
        avrdude-rpi-autoreset,
      }:
        pkgs.writers.writeDashBin "avrdude-rpi" ''
          exec ${strace}/bin/strace -o '| ${avrdude-rpi-autoreset}/bin/avrdude-rpi-autoreset' -eioctl ${avrdude}/bin/avrdude "$@"
        '') {
        inherit (config.packages) avrdude-rpi-autoreset;
      };

      ubootToolsWithEnvtools = pkgs.callPackage ({ubootTools}:
        ubootTools.override {
          extraMakeFlags = (ubootTools.extraMakeFlags or []) ++ ["envtools"];
          filesToInstall = (ubootTools.filesToInstall or []) ++ ["tools/env/fw_printenv"];
          postInstall =
            (ubootTools.postInstall or "")
            + ''
              ln -sfT $out/bin/fw_printenv $out/bin/fw_setenv
              install -D tools/env/fw_env.config $out/share/doc/uboot/tools/env/fw_env.config
            '';
        }) {};
    };
  };
}
