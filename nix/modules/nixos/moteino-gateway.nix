{moduleWithSystem, ...}:
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

    cfg = config.services.moteino-gateway;
    opts = options.services.moteino-gateway;

    jsonFmt = pkgs.formats.json {};

    description = "LowPowerLab Moteino Gateway";
  in {
    options.services.moteino-gateway = {
      enable = lib.mkEnableOption "the ${description}";

      package = mkOption {
        type = types.package;
        default = perSystem.config.packages.default;
        defaultText = "perSystem.config.packages.default";
        description = ''
          The package providing the ${description}.
        '';
      };

      nodejs = lib.mkPackageOption pkgs "nodejs" {
        default = "nodejs";
        pkgsText = "pkgs.nodejs";
      };

      contentDir = mkOption {
        type = types.path;
        default = "/srv/www/moteino-gateway";
        description = ''
          Directory for holding static content.  At present, used only for
          uploaded node icon images.

          ::: {.note}
          Because the gateway systemd service uses `DynamicUser=yes`, this
          directory has to be outside of `StateDirectory`, `CacheDirectory`,
          and so on, so that the nginx webserver can read its contents.
          :::
        '';
      };

      persistLogs = mkOption {
        type = types.bool;
        default = false;
        description = ''
          Whether to persist gateway info and error logs to the systemd
          service's configured `LogsDirectory` (by default,
          `/var/log/moteino-gateway`).
        '';
      };

      metrics = mkOption {
        default = {};
        description = ''
          JavaScript scripts for exporting node metrics data.

          See https://github.com/LowPowerLab/RaspberryPi-Gateway/blob/master/metrics/examples/_example.js
          for an example metrics script definition.
        '';
        type = types.attrsOf (types.submodule ({
          name,
          config,
          options,
          ...
        }: {
          options = {
            name = mkOption {
              # FIXME remove "/" characters and ensure that the name has
              # the extension `.js`.
              type = types.str;
              default = name;
              description = ''
                Name of the metrics script.
              '';
            };

            basename = mkOption {
              type = types.strMatching "^[^/]+\\.js$";
              internal = true;
              readOnly = true;
              defaultText = "${name}.js";
            };

            text = mkOption {
              type = types.nullOr types.lines;
              default = null;
              description = ''
                Text of the metrics script.
              '';
            };

            source = mkOption {
              type = types.path;
              description = ''
                Path of the source file containing the metrics script.
              '';
            };
          };

          config = {
            basename = let
              noSlashes = lib.replaceStrings ["/"] ["__"] config.name;
            in
              if lib.hasSuffix ".js" noSlashes
              then noSlashes
              else "${noSlashes}.js";

            source = lib.mkIf (config.text != null) (lib.mkDerivedConfig options.text (pkgs.writeTextDir "metrics/${config.basename}"));
          };
        }));
      };

      settings = mkOption {
        default = {};
        description = ''
          Settings for the ${description}.  Defaults are loaded from
          {option}`''${services.moteino-gateway.package}/lib/node_modules/RaspberryPi-Gateway/settings.json5`.
        '';
        type = types.submodule {
          freeformType = jsonFmt.type;
          options = {
            general = mkOption {
              description = "General settings.";
              default = {};
              type = types.submodule {
                freeformType = jsonFmt.type;
                options = {
                  port = mkOption {
                    type = types.port;
                    default = 8081;
                    description = ''
                      Listening port for the web application of the
                      ${description}.
                    '';
                  };

                  socketPort = mkOption {
                    type = types.port;
                    default = 8080;
                    description = ''
                      Listening port for the websocket of the ${description}.
                    '';
                  };
                };
              };
            };

            serial = mkOption {
              description = "Serial port settings.";
              default = {};
              type = types.submodule {
                freeformType = jsonFmt.type;
                options = {
                  port = mkOption {
                    type = types.path;
                    default =
                      if config.profiles.mightyhat.bluetooth.disable
                      then "/dev/ttyAMA0"
                      else "/dev/ttyS0";
                    defaultText = lib.literalExpression ''
                      if config.profiles.mightyhat.bluetooth.disable then "/dev/ttyAMA0" else "/dev/ttyS0"
                    '';
                    description = ''
                      Serial port for the ${description}.
                    '';
                  };

                  baud = mkOption {
                    type = types.ints.positive;
                    default = 115200;
                    description = ''
                      Needs to match the serial baud speed in the sketch
                      running on the Moteino or MightyHat, if any, that is
                      attached to this machine.
                    '';
                  };
                };
              };
            };
          };
        };
      };
    };

    config = lib.mkIf cfg.enable {
      services.nginx = {
        enable = lib.mkDefault true;

        virtualHosts.moteino-gateway = {name, ...}: let
          unit = nixos.config.systemd.services.${name};
          root = "${cfg.package}/lib/node_modules/RaspberryPi-Gateway/www";
        in {
          inherit root;

          extraConfig = ''
            index index.html index.htm;
            error_page 500 502 503 504 /50x.html;
          '';

          locations = {
            "/images/" = {
              root = cfg.contentDir;
              extraConfig = ''
                try_files $uri @fallback;
              '';
            };

            "/socket.io/" = {
              proxyWebsockets = true;
              recommendedProxySettings = true;
              proxyPass = "http://localhost:${toString cfg.settings.general.socketPort}";
            };

            "/httpendpoint/" = {
              proxyWebsockets = true;
              recommendedProxySettings = true;
              proxyPass = "http://localhost:${toString cfg.settings.general.port}";
            };

            "/50x.html" = {
              extraConfig = ''
                root html;
              '';
            };

            "@fallback" = {
              inherit root;
            };
          };
        };
      };

      services.logrotate = lib.mkIf cfg.persistLogs {
        enable = lib.mkDefault true;
        settings = {
          moteino-gateway = {name, ...}: let
            unit = nixos.config.systemd.services.${name};
            logsDirectories = lib.toList (unit.serviceConfig.LogsDirectory or ["moteino-gateway"]);
            logsDirectory = lib.head logsDirectories;
          in {
            files = [
              "/var/log/${logsDirectory}/*.log"
              "/var/log/${logsDirectory}/*.err"
            ];
            size = "20M";
            missingok = true;
            rotate = 20;
            dateext = true;
            dateformat = "-%Y-%m-%d";
            compress = true;
            notifempty = true;
            nocreate = true;
            copytruncate = true;
          };
        };
      };

      systemd.services.moteino-gateway = {name, ...}: let
        app = "${cfg.package}/lib/node_modules/RaspberryPi-Gateway";
        metrics = pkgs.buildEnv {
          name = "${name}-metrics";
          paths = lib.mapAttrsToList (_: metric: "${metric.source}") cfg.metrics;
          pathsToLink = ["/metrics"];
        };
      in {
        inherit description;
        script = let
          secretSnippet = lib.pipe cfg.settings [
            (lib.mapAttrsRecursive (_: value: {inherit value;}))
            (settings: {inherit settings;})
            (lib.flip utils.genJqSecretsReplacementSnippet "settings.json")
          ];
        in ''
          export MOTEINO_GATEWAY_STATE_DIRECTORY="''${STATE_DIRECTORY%%:*}"
          (cd "$MOTEINO_GATEWAY_STATE_DIRECTORY" && ${secretSnippet})
          ${lib.optionalString cfg.persistLogs ''
            logsdir="''${LOGS_DIRECTORY%%:*}"
            exec 1>>"''${logsdir}/info.log"
            exec 2> >(exec ${pkgs.coreutils}/bin/tee -a "''${logsdir}/error.log" 1>&2)
          ''}
          exec ${cfg.nodejs}/bin/node ${app}/gateway.js
        '';
        after = ["network.target"];
        wantedBy = ["multi-user.target"];
        environment = {
          NODE_ENV = "production";
          MOTEINO_GATEWAY_CONTENT_DIRECTORY = cfg.contentDir;

          # For email and SMS integrations, among other things.
          NODE_EXTRA_CA_CERTS = config.security.pki.caBundle;
        };
        serviceConfig = {
          DynamicUser = true;

          SupplementaryGroups = [
            "dialout" # for serial port access
            config.services.nginx.group # for static files
          ];

          Restart = "always";
          RestartSec = 3;

          ExecReload = "${pkgs.coreutils}/bin/kill -HUP $MAINPID";

          CacheDirectory = name;
          LogsDirectory = lib.mkIf cfg.persistLogs name;
          RuntimeDirectory = name;
          StateDirectory = name;

          StateDirectoryMode = "0750";

          RootDirectory = "%t/${name}";
          WorkingDirectory = app; # to load files relative to `__dirname`

          MountAPIVFS = true;

          # This service uses its own mount namespace (via `RootDirectory`),
          # and we need to bind-mount certain files in order to facilitate
          # essential functionality.
          BindPaths = [
            # So that the gateway can read the specified serial port.
            "-${cfg.settings.serial.port}"

            # The icon upload path.
            cfg.contentDir
          ];

          BindReadOnlyPaths = [
            # Stores the gateway application's runtime dependencies.
            builtins.storeDir

            # Mount the metrics directory into the expected location.
            "${metrics}/metrics:%S/${name}/metrics"

            # Permits loggint to the system journal.
            "/dev/log"
            "/run/systemd/journal/socket"
            "/run/systemd/journal/stdout"

            # Helps ensure that name resolution works.
            "-/etc/hosts"
            "-/etc/nsswitch.conf"
            "-/etc/resolv.conf"

            # So that the gateway knows the correct local time zone.
            "-/etc/localtime"
          ];

          # Uploaded image files need to be readable to nginx, so
          # no `0027` here.
          UMask = "0022";

          # Security settings.
          CapabilityBoundingSet = [""];
          DeviceAllow = [cfg.settings.serial.port];
          DevicePolicy = "closed";
          LockPersonality = true;
          #MemoryDenyWriteExecute = true; # evidently enabling this breaks NodeJS
          NoNewPrivileges = true;
          PrivateDevices = true;
          PrivateIPC = true;
          PrivateTmp = true;
          ProcSubset = "pid";
          ProtectClock = true;
          ProtectControlGroups = true;
          ProtectHome = true;
          ProtectHostname = true;
          ProtectKernelLogs = true;
          ProtectKernelModules = true;
          ProtectKernelTunables = true;
          ProtectProc = "invisible";
          ProtectSystem = "strict";
          RemoveIPC = true;
          RestrictAddressFamilies = [
            "AF_INET"
            "AF_INET6"
            "AF_NETLINK"
            "AF_UNIX"
          ];
          RestrictNamespaces = true;
          RestrictRealtime = true;
          RestrictSUIDSGID = true;
          SystemCallArchitectures = "native";
          # `@pkey` needed; NodeJS calls `pkey_alloc`.
          SystemCallFilter = [
            "@system-service @resources @pkey"
            "~@privileged"
          ];
        };
      };

      systemd.tmpfiles.rules = [
        "d ${cfg.contentDir} 0770 ${config.services.nginx.user} ${config.services.nginx.group} - -"
        "d ${cfg.contentDir}/images 0770 ${config.services.nginx.user} ${config.services.nginx.group} - -"
      ];
    };
  }
)
