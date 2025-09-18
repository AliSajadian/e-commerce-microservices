import { registerAs } from '@nestjs/config';

export default registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER, // Your purchased number
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER, // Your WhatsApp-enabled number
  // Optional: API Key (recommended)
  apiKey: process.env.TWILIO_API_KEY,
  apiSecret: process.env.TWILIO_API_SECRET,
}));