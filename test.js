const { bootPoolManager, SessionCallbackException } = require('./dist');

async function main() {
  await bootPoolManager();
}

main();
