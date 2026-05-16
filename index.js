import * as line from '@line/bot-sdk';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// 1. ตั้งค่า Config และ Client ต่างๆ
const config = {
  channelSecret: process.env.CHANNEL_SECRET || 'your_channel_secret',
};

const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'your_channel_access_token',
});

// สร้าง Blob Client สำหรับดึงข้อมูลรูปภาพจาก LINE (สำหรับ SDK v9+)
const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'your_channel_access_token'
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const app = express();
app.use(express.json());

// 2. Routes
app.get('/', function (req, res) {
    res.send('Hello World!, Thitiwath Changcheen');
});

app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 3. ฟังก์ชันช่วยดาวน์โหลดรูปภาพจาก LINE
const downloadLineContent = async (messageId) => {
  const stream = await lineBlobClient.getMessageContent(messageId);
  const chunks = [];
 
  if (stream.arrayBuffer) {
    const arrayBuffer = await stream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: stream.type || 'image/jpeg'
      },
      buffer: buffer
    };
  } else {
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'image/jpeg'
      },
      buffer: buffer
    };
  }
};

// 4. ฟังก์ชันหลักในการแยกแยะ Event
async function handleEvent(event) {
  // บังคับว่าต้องเป็น Message Event เท่านั้น
  if (event.type !== "message") {
    return Promise.resolve(null);
  }

  const userId = event.source.userId || 'unknown';
  const replyToken = event.replyToken || '';
  const messageId = event.message.id;
  const messageType = event.message.type;

  // กรณีที่ 1: ผู้ใช้ส่ง "รูปภาพ" เข้ามา
  if (messageType === "image") {
    return handleImage(messageId, replyToken, userId);
  }

  // กรณีที่ 2: ผู้ใช้ส่ง "ข้อความตัวอักษร" เข้ามา
  if (messageType === "text") {
    const content = event.message.text || '';
    let botReplyText = '';

    try {
      // ให้ Gemini ตอบกลับข้อความตัวอักษร
      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: content,
      });

      botReplyText = geminiResponse.text?.trim() || 'ขออภัยครับ ระบบไม่สามารถสร้างคำตอบได้';

      // บันทึกลง Supabase Messages Table
      await saveMessageToSupabase(userId, messageId, messageType, content, replyToken, botReplyText);

      // ตอบกลับไปยัง LINE
      return await client.replyMessage({
        replyToken: replyToken,
        messages: [{ type: 'text', text: botReplyText }],
      });

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในระบบข้อความ:', error);
      return await client.replyMessage({
        replyToken: replyToken,
        messages: [{ type: 'text', text: 'ขออภัยครับ เกิดข้อผิดพลาดระหว่างเรียกใช้ Gemini' }],
      });
    }
  }

  return Promise.resolve(null);
}

// 5. ฟังก์ชันจัดการเมื่อได้รับรูปภาพ (ดาวน์โหลด -> ขึ้น Supabase -> ส่งให้ Gemini -> ตอบกลับ LINE)
async function handleImage(messageId, replyToken, userId) {
  try {
    // ดึงไฟล์รูปภาพในรูปแบบ Base64 และ Buffer
    const imageContent = await downloadLineContent(messageId);
    const fileName = `${messageId}.jpg`;

    // อัปโหลดเข้า Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('uploads')
      .upload(`bot-uploads/${fileName}`, imageContent.buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError.message);
    }

    // เรียกใช้งาน Gemini SDK ประมวลผลรูปภาพร่วมกับ Prompt ทายชื่อสัตว์
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        imageContent.inlineData, // ส่งตัวแปรที่เป็น base64 object เข้าไป
        'สิ่งนี้คือสัตว์ชนิดใด? โปรดระบุชื่อสัตว์สั้นๆ และอธิบายจุดเด่นของมันไม่เกิน 1 ประโยค'
      ],
    });

    const botReplyText = geminiResponse.text || 'ไม่สามารถวิเคราะห์รูปภาพสัตว์ชนิดนี้ได้';

    // บันทึกประวัติลงฐานข้อมูล Supabase
    const mockContent = `[Received image message, saved as bot-uploads/${fileName}]`;
    await saveMessageToSupabase(userId, messageId, 'image', mockContent, replyToken, botReplyText);

    // ส่งข้อความผลลัพธ์กลับไปหาผู้ใช้ใน LINE
    return await client.replyMessage({
      replyToken: replyToken,
      messages: [{ type: 'text', text: botReplyText }],
    });

  } catch (error) {
    console.error('Error ในการจัดการรูปภาพ:', error);
    // แจ้งเตือนผู้ใช้กรณีระบบส่วนใดส่วนหนึ่งขัดข้อง
    return await client.replyMessage({
      replyToken: replyToken,
      messages: [{ type: 'text', text: 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพของคุณ' }],
    });
  }
}

// ฟังก์ชันช่วยบันทึกข้อมูลลง Supabase (ลดความซ้ำซ้อนของโค้ด)
async function saveMessageToSupabase(userId, messageId, type, content, replyToken, replyContent) {
  const { error } = await supabase
    .from('messages')
    .insert([
      {
        user_id: userId,
        message_id: messageId,
        type: type,
        content: content,
        reply_token: replyToken,
        reply_content: replyContent
      }
    ]);
  if (error) console.error('Supabase Insert Error:', error.message);
}

// 6. Run Server
const port = process.env.PORT || 3016;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});