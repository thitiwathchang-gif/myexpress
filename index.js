import * as line from '@line/bot-sdk'
import express from 'express'
import dotenv from 'dotenv'
dotenv.config();

// create LINE SDK config from env variables
const config = {
  channelSecret: process.env.CHANNEL_SECRET || 'your_channel_secret',
};

// create LINE SDK client
const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'your_channel_access_token',
});

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// setup a route for basic check
app.get('/', function (req, res) {
    res.send('Hello World!, Thitiwath Changcheen')
});

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create an echoing text message
  const echo = { type: 'text', text: `คุณพิมว่า: ${event.message.text}` };

  // use reply API
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
}

// listen on port
const port = process.env.PORT || 3016;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});