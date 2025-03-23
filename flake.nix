{
  description = "Description for the project";

  inputs = {
    avrdude-rpi.url = "github:LowPowerLab/avrdude-rpi";
    avrdude-rpi.flake = false;

    dream2nix.url = "github:nix-community/dream2nix";
    dream2nix.inputs.nixpkgs.follows = "nixpkgs";

    devshell.url = "github:numtide/devshell";
    devshell.inputs.nixpkgs.follows = "nixpkgs";

    flake-parts.url = "github:hercules-ci/flake-parts";

    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake {inherit inputs;} ({
        inputs,
        self,
        moduleWithSystem,
        ...
      } @ toplevel: {
        systems = [
          "aarch64-darwin"
          "aarch64-linux"
          "x86_64-darwin"
          "x86_64-linux"
        ];

        imports = [
          inputs.devshell.flakeModule
          inputs.treefmt-nix.flakeModule

          ./nix/checks.nix
          ./nix/devshells.nix
          ./nix/nixos-modules.nix
          ./nix/overlays.nix
          ./nix/packages.nix
        ];

        perSystem = {
          config,
          lib,
          ...
        }: {
          apps = lib.mapAttrs (lib.const (lib.getAttr "flakeApp")) config.devShells;

          treefmt = {
            flakeFormatter = true;
            projectRootFile = "flake.nix";
            programs.alejandra.enable = true;
            #programs.prettier.enable = true;
            #programs.shfmt.enable = true;
          };
        };

        flake = {
          nixosConfigurations = {
            default = inputs.nixpkgs.lib.nixosSystem {
              system = "x86_64-linux";
              modules = [
                self.nixosModules.mightyhat
                self.nixosModules.moteino-gateway
                ({pkgs, ...}: {
                  boot.isContainer = true;
                  services.moteino-gateway.enable = true;
                  system.stateVersion = "24.05";
                  environment.systemPackages = with pkgs; [curl];
                  fileSystems."/".fsType = "tmpfs";
                })
              ];
            };
          };
        };
      });
}
