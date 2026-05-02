import * as line from '@line/bot-sdk'
import express from 'express'

// create LINE SDK config from env variables
const config = {
  channelSecret: "b6af05c16e146c4464736d13ffc81d3f",
};

// create LINE SDK client
const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: "e7/PSfogR8BY0uRLXMj4BQDK1eTNIC3dUnzdT9IdpTsRJn0wuFg46iN2/Ks0jdciuEfCxcYS5+/2u1HMkq4XvmkDaldmp9DrGUjd80YvtJ5zCpFaEG5ejzT9z9nbYd32HBcpvTm3A07nS+XijKVCcwdB04t89/1O/w1cDnyilFU=",
});

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
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

app.get('/callback', function (req, res) {
    res.send('Hello World!')
})
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
