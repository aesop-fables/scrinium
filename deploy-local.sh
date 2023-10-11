#!/bin/bash

yarn && yarn build
yarn rimraf ../../guidedchoice/data-modules/node_modules/@aesop-fables/scrinium/lib
cp -R ./lib ../../guidedchoice/data-modules/node_modules/@aesop-fables/scrinium/lib
