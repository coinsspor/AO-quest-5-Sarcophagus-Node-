const { message, createDataItemSigner } = require('@permaweb/aoconnect');
const { readFileSync } = require('node:fs');

const wallet = JSON.parse(
  readFileSync('/root/.aos.json').toString(),
);

async function sendMessageToAOTerminal(action, data) {
  await message({
    process: '90O7RFBp7M2c9TkOot4Nb5r-rbN9QMUAmcxu0Hf3K6Q',
    tags: [
      { name: 'Action', value: action },
      { name: 'Data', value: data },
    ],
    signer: createDataItemSigner(wallet),
    data: data,
  })
  .then(console.log)
  .catch(console.error);
}

module.exports = {
  sendMessageToAOTerminal,
};
