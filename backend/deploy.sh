#!/bin/sh
set -e
# Build and run backend container
cd $(dirname $0)
docker build -t whatsapp-backend .
docker run -d --name whatsapp-backend -p 4000:4000 whatsapp-backend