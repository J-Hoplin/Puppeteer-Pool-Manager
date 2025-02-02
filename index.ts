import { ContextMode, EventTags, TaskDispatcher } from './src/pool';

async function index() {
  const dispatcher = new TaskDispatcher();
  await dispatcher.init(5, ContextMode.ISOLATED);
  const urls = [
    'https://www.google.com',
    'https://www.bing.com',
    'https://www.yahoo.com',
    'https://www.duckduckgo.com',
    'https://www.ask.com',
  ];
  for (const url of urls) {
    const { event, resultListener } = await dispatcher.dispatchTask(
      async (page) => {
        await page.goto(url);
        return page.title();
      },
    );
    console.log(await resultListener);
  }
  await dispatcher.close();
}

index();
