export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber?: string;
}

export interface TwilioSmsOptions {
  to: string;
  from?: string;
  body: string;
  mediaUrl?: string[];
  statusCallback?: string;
  maxPrice?: string;
  provideFeedback?: boolean;
}

export interface TwilioCallOptions {
  to: string;
  from?: string;
  url: string;
  method?: 'GET' | 'POST';
  statusCallback?: string;
  timeout?: number;
}

export interface TwilioWhatsAppOptions {
  to: string;
  from?: string;
  body: string;
  mediaUrl?: string[];
  statusCallback?: string;
}

export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  errorCode?: number;
  errorMessage?: string;
  dateCreated: Date;
  dateSent?: Date;
  dateUpdated: Date;
  price?: string;
  priceUnit?: string;
}