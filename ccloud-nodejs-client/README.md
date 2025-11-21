# Node.js Client

This project contains a Node.js application that subscribes to a topic on a Confluent Cloud Kafka cluster and sends a sample message, then consumes it and prints the consumed record to the console.

## Prerequisites

Any supported version of Node.js (The two LTS versions, 18 and 20, and the latest versions, 21 and 22).

## Installation

Install the dependencies of this application:

```shell
npm install @confluentinc/kafka-javascript
```

## Usage

You can publish or consume match requests against your Confluent Cloud topic using the CLI below. The script reads credentials from `client.properties`.

```shell
# 관광객이 통역사 호출
node index.js publish interpreter

# 관광객이 도우미 호출
node index.js publish helper

# 통역사 클라이언트가 매칭 대기열을 구독
node index.js consume interpreter

# 도우미 클라이언트가 매칭 대기열을 구독
node index.js consume helper
```

`publish` 모드는 예시 매칭 요청 이벤트(JSON)를 작성해 지정된 토픽으로 전송하며, `consume` 모드는 해당 역할에게 온 요청만 필터링하여 출력합니다. 중단하려면 `Ctrl+C`로 종료하면 됩니다.

## Learn more

- For the Node.js client API, check out the [confluent-kafka-javascript documentation](https://github.com/confluentinc/confluent-kafka-javascript#readme)
- Check out the full [getting started tutorial](https://developer.confluent.io/get-started/nodejs/)
