require('dotenv').config();
import * as line from '@line/bot-sdk'
import express from 'express'
import * as dotenv from 'dotenv';
dotenv.config();

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || ""
};


// create Express app
// about Express itself: https://expressjs.com/
const app = express();

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
    return Promise.resolve(null);
  }

  const replyMessage = {
    type: 'text',
    text: `คุณพูดว่า "${event.message.text}"`
  };

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [replyMessage],
  });
}
// listen on port
const PORT = process.env.PORT || 3016;
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('hello world, Thitiwath');
});

// Respond to POST request on the root route (/), the application’s home page:
app.post('/callback', function (req, res) {
    res.send('Got a POST request')
})
// Respond to a PUT request to the /user route:
app.put('/user', function (req, res) {
    res.send('Got a PUT request at /user')
})
// Respond to a DELETE request to the /user route:
app.delete('/user', function (req, res) {
    res.send('Got a DELETE request at /user')
})
