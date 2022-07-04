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

echo "What branch should be used (beta or prod)?"
IFS= read -r branch

# set apiUrl
api_url="https://api.pennyvault.com/v1"
if [ $branch == "beta" ]; then
  api_url="https://api-beta.pennyvault.com/v1"
fi

# update package.json
package=$(cat $root_dir/package.json | jq ".version |= \"${version}\"")
package=$(echo $package | jq ".apiUrl |= \"${api_url}\"")
echo $package > $root_dir/tmp.json
cat $root_dir/tmp.json | jq > $root_dir/package.json
rm $root_dir/tmp.json

# build package
yarn install
quasar build

# commit to branch
git stash push
git checkout $branch
mv dist/spa /tmp/pv-frontend
rm -rf *
mv /tmp/pv-frontend/* .
rmdir /tmp/pv-frontend
git add .
git commit -m "release v${version}"
git push

git checkout v1
git stash pop
yarn install