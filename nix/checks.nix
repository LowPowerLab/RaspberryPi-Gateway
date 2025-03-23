{self, ...}: {
  perSystem = {
    lib,
    pkgs,
    ...
  }: {
    checks = {
      default = pkgs.nixosTest {
        name = "moteino-gateway";
        nodes.default = {
          lib,
          pkgs,
          ...
        }: {
          imports = [
            self.nixosModules.default
          ];

          services.moteino-gateway.enable = true;
        };
        testScript = ''
          start_all()
          default.wait_for_unit("moteino-gateway.service")
          default.wait_for_open_port(8080)
          default.wait_until_succeeds("${lib.getExe pkgs.curl} --resolve moteino-gateway:80:127.0.0.1 -fLI http://moteino-gateway/ 1>&2")
        '';
      };
    };
  };
}
