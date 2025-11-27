#!/bin/sh
set -e
# Build and run frontend container
cd $(dirname $0)
docker build -t whatsapp-frontend .
docker run -d --name whatsapp-frontend -p 80:80 whatsapp-frontend