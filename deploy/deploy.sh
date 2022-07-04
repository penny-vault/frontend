#!/bin/sh
# get variables
script_path=$(readlink -f $0)
script_dir=$(dirname $script_path)
root_dir=$(dirname $script_dir)

# set meta-information
commit=$(git rev-parse --short HEAD)
echo "Current commit: ${commit}"
echo "Version number to use (major.minor.patch-dev+commit): "
IFS= read -r version

# update package.json
package=$(cat $root_dir/package.json | jq ".version |= \"${version}\"")
echo $package > $root_dir/tmp.json
cat $root_dir/tmp.json | jq > $root_dir/package.json
rm $root_dir/tmp.json

# build package
quasar build
