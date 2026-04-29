const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

// ตั้งค่าจาก LINE Developers Console
const config = {
  channelAccessToken: 'EQv3qOTOqCtVj0M+cvOhMQZJacduUBUtObYE0gfAhtxxdAgCR9j7zjw8k5erzYWIuEfCxcYS5+/2u1HMkq4XvmkDaldmp9DrGUjd80YvtJ5g48FIzK5DZcyrCaSBY3O0N6Ugh7sZALRwfeDFKjJ2NgdB04t89/1O/w1cDnyilFU=',
  channelSecret: '5e3c2db944de70126eac6d678157826d'
};

app.use('/webhook', line.middleware(config));

// รับ webhook
app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

// ตอบกลับข้อความ
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `คุณพิมพ์ว่า: ${event.message.text}`
  });
}

const client = new line.Client(config);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
