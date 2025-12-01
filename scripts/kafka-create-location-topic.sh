#!/bin/bash

# Kafka 위치 추적 토픽 생성 스크립트
# Usage: ./scripts/kafka-create-location-topic.sh

TOPIC_NAME="${KAFKA_LOCATION_TOPIC:-interpreter-location-updates}"
PARTITIONS="${KAFKA_LOCATION_PARTITIONS:-3}"
REPLICATION="${KAFKA_LOCATION_REPLICATION:-1}"
BROKERS="${KAFKA_BROKERS:-localhost:19092}"

echo "🚀 Creating Kafka topic for location tracking..."
echo "  Topic: $TOPIC_NAME"
echo "  Partitions: $PARTITIONS"
echo "  Replication Factor: $REPLICATION"
echo "  Brokers: $BROKERS"
echo ""

# Redpanda 사용 시
if command -v rpk &> /dev/null; then
  echo "Using Redpanda CLI (rpk)..."
  rpk topic create "$TOPIC_NAME" \
    --partitions "$PARTITIONS" \
    --replicas "$REPLICATION" \
    --brokers "$BROKERS"

  echo ""
  echo "✅ Topic created successfully!"
  echo ""
  echo "📊 Topic details:"
  rpk topic describe "$TOPIC_NAME" --brokers "$BROKERS"

# kafka-topics.sh 사용 시
elif command -v kafka-topics.sh &> /dev/null; then
  echo "Using Kafka CLI (kafka-topics.sh)..."
  kafka-topics.sh --create \
    --topic "$TOPIC_NAME" \
    --partitions "$PARTITIONS" \
    --replication-factor "$REPLICATION" \
    --bootstrap-server "$BROKERS"

  echo ""
  echo "✅ Topic created successfully!"

else
  echo "❌ Error: Neither rpk nor kafka-topics.sh found"
  echo "Please install Redpanda CLI or Kafka CLI tools"
  exit 1
fi
