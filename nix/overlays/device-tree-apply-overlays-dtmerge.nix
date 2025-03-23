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
      applyOverlays = base: overlays':
        final.stdenvNoCC.mkDerivation {
          name = "device-tree-overlays";
          nativeBuildInputs = with final; [dtc libraspberrypi];
          buildCommand = let
            overlays = final.lib.toList overlays';
          in ''
            mkdir -p $out
            cd "${base}"
            find . -type f -name '*.dtb' -print0 \
              | xargs -0 cp -v --no-preserve=mode --target-directory "$out" --parents

            for dtb in $(find "$out" -type f -name '*.dtb'); do
              dtbCompat=$(fdtget -t s "$dtb" / compatible 2>/dev/null || true)
              # skip files without `compatible` string
              test -z "$dtbCompat" && continue

              ${final.lib.concatMapStringsSep "\n" (o: ''
                overlayCompat="$(fdtget -t s "${o.dtboFile}" / compatible)"

                # skip incompatible and non-matching overlays
                if ! { [[ "$dtbCompat" =~ "$overlayCompat" ]] || [[ "$overlayCompat" = brcm,bcm2835 ]]; }; then
                  echo "Skipping overlay ${o.name}: incompatible with $(basename "$dtb")"
                elif ${
                  if ((o.filter or null) == null)
                  then "false"
                  else ''
                    [[ "''${dtb//${o.filter}/}" ==  "$dtb" ]]
                  ''
                }
                then
                  echo "Skipping overlay ${o.name}: filter does not match $(basename "$dtb")"
                else
                  echo -n "Applying overlay ${o.name} to $(basename "$dtb")... "
                  mv "$dtb"{,.in}

                  # dtmerge requires a .dtbo ext for dtbo files, otherwise it adds it to the given file implicitly
                  dtboWithExt="$TMPDIR/$(basename "${o.dtboFile}").dtbo"
                  cp -r ${o.dtboFile} "$dtboWithExt"

                  dtmerge "$dtb.in" "$dtb" "$dtboWithExt"

                  echo "ok"
                  rm "$dtb.in" "$dtboWithExt"
                fi
              '')
              overlays}

            done'';
        };
    };
}
