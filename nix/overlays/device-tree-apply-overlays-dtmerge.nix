# Modification of nixpkgs deviceTree.applyOverlays to resolve https://github.com/NixOS/nixpkgs/issues/125354.
#
# Derived from https://github.com/NixOS/nixpkgs/blob/916ca8f2b0c208def051f8ea9760c534a40309db/pkgs/os-specific/linux/device-tree/default.nix.
#
# This replaces the default device tree overlay application process
# to use `dtmerge` from `libraspberrypi`.  The default overlay
# application process can be problematic on Raspberry Pis due to
# (among other things) issues like this:
#
#   https://github.com/raspberrypi/firmware/issues/1718
#
# and `fdtget`-based compatibility checks, which yield false
# negatives (overlay is compatible, but the check says it is not):
#
#   $ dtbCompat="$(fdtget -t s ./boot/bcm2710-rpi-3-b-plus.dtb / compatible | tee /dev/stderr)"
#   raspberrypi,3-model-b-plus brcm,bcm2837
#   $ overlayCompat="$(fdtget -t s ./boot/overlays/disable-bt.dtbo / compatible | tee /dev/stderr)"
#   brcm,bcm2835
#   $ [[ "$dtbCompat" =~ "$overlayCompat" ]] ; echo "$?"
#   1
#
# The upstream/default merging logic is here:
#
# https://github.com/NixOS/nixpkgs/blob/c999f2e369508fca13646ca5a0fb926b3ce0063e/pkgs/os-specific/linux/device-tree/default.nix#L27-L65
#
# The `nixos-hardware` override is here:
#
# https://github.com/NixOS/nixos-hardware/blob/33a97b5814d36ddd65ad678ad07ce43b1a67f159/raspberry-pi/4/pkgs-overlays.nix#L5
final: prev: {
  deviceTree =
    prev.deviceTree
    // {
      applyOverlays = final.callPackage ({
          lib,
          stdenvNoCC,
          dtc,
          libraspberrypi,
          ...
        } @ ctx: base: overlays':
          stdenvNoCC.mkDerivation {
            name = "device-tree-overlays";
            nativeBuildInputs = [dtc libraspberrypi];
            buildCommand = let
              overlays = lib.toList overlays';
            in ''
              mkdir -p "$out"
              cd ${lib.escapeShellArg base}
              find . -type f -name '*.dtb' -exec cp -v --no-preserve=mode --target-directory "$out" --parents '{}' '+'

              while read -d $'\0' dtb; do
                dtbName="$(basename "$dtb")"
                dtbCompat=$(fdtget -t s "$dtb" / compatible 2>/dev/null || true)

                # skip files without `compatible` string
                if [[ -z "$dtbCompat" ]]; then
                  echo "Cannot apply overlays to ''${dtbName} since it lacks a `compatible` string"
                  continue
                fi

                ${lib.concatMapStringsSep "\n" (o: ''
                  name=${lib.escapeShellArg o.name}
                  dtboFile=${lib.escapeShellArg o.dtboFile}
                  filter=${lib.escapeShellArg o.filter}

                  overlayCompat="$(fdtget -t s "$dtboFile" / compatible)"

                  # skip incompatible and non-matching overlays
                  if ! { [[ "$dtbCompat" =~ "$overlayCompat" ]] || [[ "$overlayCompat" = brcm,bcm2835 ]]; }; then
                    echo "Skipping overlay ''${name}: incompatible with ''${dtbName}: wanted ''${dtbCompat} or generic brcm,bcm2835, got ''${overlayCompat}"
                  elif [[ -n "$filter" ]] && [[ "''${dtb//''${filter}/}" = "$dtb" ]]; then
                    echo "Skipping overlay ''${name}: filter does not match ''${dtbName}"
                  else
                    echo -n "Applying overlay ''${name} to ''${dtbName}... "
                    dtbIn="''${dtb}.in"
                    mv -f "$dtb" "$dtbIn"

                    # dtmerge requires a .dtbo ext for dtbo files, otherwise it adds it to the given file implicitly
                    dtboWithExt="''${TMPDIR}/$(basename "$dtboFile}")"
                    dtboWithExt="''${dtboWithExt%.dtbo}.dtbo"
                    cp -r "$dtboFile" "$dtboWithExt"

                    dtmerge "$dtbIn" "$dtb" "$dtboWithExt"

                    echo "ok"
                    rm -f "$dtbIn" "$dtboWithExt"
                  fi
                '')
                overlays}
              done < <(find "$out" -type f -name '*.dtb' -print0)
            '';
          }) {};
    };
}
