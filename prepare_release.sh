#!/bin/sh
NAME=SwitchServersByAPI
VERSION=$(cat package.json | jq -r ".version")
TEMP_DIR="releases/"$NAME"_"$VERSION
npm run build

rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR
rm -f $TEMP_DIR.zip

cp -r build/* $TEMP_DIR

rm -r dist
rm -r build

cd releases
zip -r $NAME"_"$VERSION.zip $NAME"_"$VERSION
cd ..
echo Created $NAME"_"$VERSION.zip in $(pwd)/releases