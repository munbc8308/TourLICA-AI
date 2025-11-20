#!/usr/bin/env bash
set -euo pipefail

TOPIC_NAME="${1:-tourlica-events}"
CONTAINER_NAME="tourlica-redpanda"

docker exec "$CONTAINER_NAME" rpk topic create "$TOPIC_NAME" --if-not-exists

echo "Kafka 토픽이 준비되었습니다: $TOPIC_NAME"
