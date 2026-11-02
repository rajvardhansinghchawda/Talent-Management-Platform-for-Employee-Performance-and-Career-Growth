#!/bin/sh
set -e

if [ ! -f "node_modules/.bin/next" ]; then
  echo "Dependencies missing in node_modules volume. Installing..."
  npm install
fi

exec "$@"
