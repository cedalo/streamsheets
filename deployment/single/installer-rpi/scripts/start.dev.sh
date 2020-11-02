#!/usr/bin/env bash

CMD="${@:-up}"

docker network ls --format={{.Name}} | grep '^streamsheets$' > /dev/null || docker network create streamsheets

docker-compose \
	-f ./docker-compose/docker-compose.dev.yml \
	$CMD