#!/bin/sh

NAME="streamsheets"

echo "--> Installing Streamsheets"

echo "--> Preparing docker-compose files"
mkdir -p "/streamsheets"
mkdir -p "/streamsheets/${NAME}"
chmod +x "/streamsheets/${NAME}"
cp -R scripts "/streamsheets/${NAME}"

echo "--> Successfully installed Streamsheets"
