#!/bin/sh
NAME=SwitchServersByAPI
VERSION=$(cat package.json | jq -r ".version")
TEMP_DIR="releases/"$NAME"_"$VERSION
npm run build

rm -r $TEMP_DIR
mkdir -p $TEMP_DIR
rm -r build/src/__tests__
cp -r build/src/* $TEMP_DIR
cp LICENSE $TEMP_DIR
cp README.md $TEMP_DIR
rm -r build

cd releases
zip -r $NAME"_"$VERSION.zip $NAME"_"$VERSION
cd ..
rm -r $TEMP_DIR
echo Created $NAME"_"$VERSION.zip in $(pwd)/releases