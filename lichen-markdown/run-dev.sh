#! /bin/bash

docker build -t lichen-markdown:latest ./docker/
docker run -d -p 8000:80 -v $(pwd)/src:/var/www/html lichen-markdown:latest
