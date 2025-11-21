const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;

const TOPIC = process.env.CCLOUD_TOPIC || 'Matching';
const CONFIG_PATH = path.join(__dirname, 'client.properties');

function readConfig(fileName) {
  const data = fs.readFileSync(fileName, 'utf8').toString().split('\n');
  return data.reduce((config, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return config;
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) {
      config[key.trim()] = value.trim();
    }
    return config;
  }, {});
}

function createSamplePayload(targetRole) {
  return {
    type: 'match_request',
    requesterRole: 'tourist',
    requesterName: 'CLI Tourist',
    targetRole,
    radiusKm: 3,
    device: `node-cli/${process.version}`,
    location: {
      lat: 37.5665 + Math.random() * 0.05,
      lng: 126.978 + Math.random() * 0.05
    },
    ts: Date.now()
  };
}

async function publishMatchRequest(topic, config, targetRole) {
  const key = crypto.randomUUID();
  const payload = createSamplePayload(targetRole);
  const producer = new Kafka().producer(config);

  await producer.connect();
  const record = await producer.send({
    topic,
    messages: [{ key, value: JSON.stringify(payload) }]
  });
  console.log('\n--- Match Request Published ---');
  console.log(`Topic: ${topic}`);
  console.log(`Key: ${key}`);
  console.log('Payload:', payload);
  console.log('Broker Response:', record);
  console.log('--------------------------------\n');
  await producer.disconnect();
}

async function consumeMatchRequests(topic, config, serviceRole) {
  const consumerConfig = {
    ...config,
    'group.id': `tourlica-${serviceRole}-group`,
    'auto.offset.reset': 'earliest'
  };
  const consumer = new Kafka().consumer(consumerConfig);

  const disconnect = () => {
    consumer.commitOffsets().finally(() => consumer.disconnect());
  };

  process.on('SIGTERM', disconnect);
  process.on('SIGINT', disconnect);

  await consumer.connect();
  await consumer.subscribe({ topics: [topic] });

  console.log(`Listening for ${serviceRole} requests on topic ${topic}...`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString() ?? '{}';
      let payload;
      try {
        payload = JSON.parse(value);
      } catch (error) {
        console.warn('Failed to parse payload:', error);
        return;
      }

      if (payload.targetRole !== serviceRole) {
        return;
      }

      console.log('\n>>> Incoming Match Request <<<');
      console.log(`Topic ${topic} / Partition ${partition}`);
      console.log(`Key: ${message.key?.toString()}`);
      console.log(`Requested By: ${payload.requesterName || 'Unknown Tourist'}`);
      console.log(`Location: lat ${payload.location?.lat}, lng ${payload.location?.lng}`);
      console.log(`Radius: ${payload.radiusKm ?? 'N/A'} km`);
      console.log(`Device: ${payload.device}`);
      console.log('--------------------------------\n');
    }
  });
}

async function main() {
  const config = readConfig(CONFIG_PATH);
  const [mode = 'publish', roleArg = 'interpreter'] = process.argv.slice(2);
  const normalizedRole = roleArg === 'helper' ? 'helper' : 'interpreter';

  if (mode === 'consume') {
    await consumeMatchRequests(TOPIC, config, normalizedRole);
  } else {
    await publishMatchRequest(TOPIC, config, normalizedRole);
  }
}

main().catch((error) => {
  console.error('Client exited with error:', error);
  process.exit(1);
});
