import 'server-only';
import { Kafka, type KafkaConfig, type SASLOptions } from 'kafkajs';
import { ensureEnvLoaded } from './load-env';

ensureEnvLoaded();

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

  return buildSaslOptions(mechanism, username, password);
}

type SupportedMechanism = 'plain' | 'scram-sha-256' | 'scram-sha-512';

function parseMechanism(value?: string): SupportedMechanism | undefined {
  if (!value) return undefined;
  if (value === 'plain' || value === 'scram-sha-256' || value === 'scram-sha-512') {
    return value;
  }
  return undefined;
}

function buildSaslOptions(mechanism: SupportedMechanism, username: string, password: string): SASLOptions {
  switch (mechanism) {
    case 'plain':
      return { mechanism: 'plain', username, password };
    case 'scram-sha-256':
      return { mechanism: 'scram-sha-256', username, password };
    case 'scram-sha-512':
      return { mechanism: 'scram-sha-512', username, password };
    default:
      return { mechanism: 'plain', username, password };
  }
}
