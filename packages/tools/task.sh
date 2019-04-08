#!/bin/bash

set -e

CMD=$1
shift

TEST_CI_COMMAND="test -f $(pwd)/jest.config.js && ./node_modules/.bin/jest --verbose --no-cache -c $(pwd)/jest.config.js --rootDir . || echo \"Skipping tests no test config found\""

build() {
    export NODE_ENV=$1
    echo "Building for env '${NODE_ENV}'. Running: $(pwd)/node_modules/.bin/webpack --display-reasons --display-error-details"
    echo "yarn version: $(yarn --version)"
    echo "npm version: $(yarn --version)"
    echo "jest version: $($(pwd)/node_modules/.bin/jest --version)"
    $(pwd)/node_modules/.bin/webpack --display-reasons --display-error-details --color
}

runTests() {
    if [ -f $(pwd)/jest.config.js ]
    then
        $(pwd)/node_modules/.bin/jest --verbose --color --no-cache -c $(pwd)/jest.config.js --rootDir . $1
    else
        echo "Skipping tests no test config found"
    fi
}

clean() {
    echo "Cleaning. Running:  rm -rf $(pwd)/.dist && rm -rf $(pwd)/.tsbuild"
    rm -rf $(pwd)/.dist
    rm -rf $(pwd)/.tsbuild
    find $(pwd) -name esp*.tgz -delete
}

case $CMD in
  clean)
    clean
    ;;

  build-dev)
    build dev
    runTests
    ;;

  build-prod)
    build prod
    runTests
    ;;

  test-ci)
    runTests
    ;;

  test)
    runTests --watchAll
    ;;

  pack)
    yarn pack
    ;;

  start)
    $(pwd)/node_modules/.bin/webpack-dev-server -d --inline --watch --progress --colors
    ;;

  *)
    if [[ -z "$CMD" ]]; then
      echo "USAGE: ./task (clean|build-dev|<node_modules_bin_command>) command_args"
      exit 0
    fi
    exe "../../node_modules/.bin/$CMD $@"
    ;;
esac