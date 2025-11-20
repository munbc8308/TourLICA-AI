import { Kafka, type KafkaConfig } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const baseConfig: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID ?? 'tourlica-web',
  brokers
};

const kafka = new Kafka(baseConfig);
const producer = kafka.producer();
let isProducerConnected = false;

export async function getKafkaProducer() {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
  }
  return producer;
}

export function getKafkaConfig() {
  return baseConfig;
}
