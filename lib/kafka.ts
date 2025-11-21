import { Kafka, type KafkaConfig, type SASLOptions } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const baseConfig: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID ?? 'tourlica-web',
  brokers,
  ssl: parseKafkaSsl(),
  sasl: parseKafkaSasl()
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

function parseKafkaSsl(): boolean | undefined {
  if (!process.env.KAFKA_SSL) {
    return undefined;
  }
  const value = process.env.KAFKA_SSL.toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off';
}

function parseKafkaSasl(): SASLOptions | undefined {
  const mechanismInput = process.env.KAFKA_SASL_MECHANISM?.toLowerCase();
  const mechanism = parseMechanism(mechanismInput);
  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;

  if (!mechanism || !username || !password) {
    return undefined;
  }

  return {
    mechanism,
    username,
    password
  };
}

function parseMechanism(value?: string): SASLOptions['mechanism'] | undefined {
  if (!value) return undefined;
  if (value === 'plain' || value === 'scram-sha-256' || value === 'scram-sha-512' || value === 'aws' || value === 'oauthbearer') {
    return value;
  }
  return undefined;
}
