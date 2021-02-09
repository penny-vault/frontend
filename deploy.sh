#!/usr/bin/env sh

# abort on errors
set -e

# build
npm run build

# navigate into the build output directory
cd dist

cp -Rp ../src/assets/email img/

# if you are deploying to a custom domain
echo 'www.pennyvault.com' > CNAME
cd -

# Delete the old build
rm -rf docs
mv dist docs

# Publish it
git add docs
git commit -m "Publish website"
git push
