#!/bin/sh
# usage: run.sh <binary> ; runs every *.expr in this directory
for f in *.expr; do echo "== $f"; "$1" < "$f" 2>&1 | grep -v '^>>> *$' | grep -v '^$'; done
