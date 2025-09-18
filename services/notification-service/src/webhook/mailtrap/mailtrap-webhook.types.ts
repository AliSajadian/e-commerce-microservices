export enum MailtrapEventType {
  DELIVERY = 'delivery',
  BOUNCE = 'bounce',
  OPEN = 'open',
  CLICK = 'click',
  UNSUBSCRIBE = 'unsubscribe',
  COMPLAINT = 'complaint',
  REJECTION = 'rejection',
  SOFT_BOUNCE = 'soft_bounce',
}

export interface MailtrapWebhookEvent {
  event_id: string;
  type: MailtrapEventType;
  email: string;
  message_id: string;
  timestamp: string;
  category?: string;
  custom_variables?: Record<string, any>;
  
  // Delivery specific
  delivery_delay?: number;
  smtp_response?: string;
  
  // Bounce specific
  bounce_type?: 'hard' | 'soft';
  bounce_sub_type?: string;
  reason?: string;
  
  // Open specific
  user_agent?: string;
  ip?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  
  // Click specific
  url?: string;
  
  // Unsubscribe specific
  unsubscribe_type?: 'manual' | 'automatic';
  
  // Complaint specific
  complaint_type?: 'abuse' | 'fraud' | 'virus';
  
  // Additional metadata
  response?: string;
  response_code?: number;
}

export interface MailtrapWebhookPayload {
  events: MailtrapWebhookEvent[];
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
}

// DTOs for webhook processing
export interface DeliveryEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  status: string;
  deliveryDelay?: number;
  smtpResponse?: string;
}

export interface BounceEventData {
  email: string;
  messageId: string;
  bounceType?: 'hard' | 'soft';
  bounceSubType?: string;
  timestamp: Date;
  reason?: string;
}

export interface ComplaintEventData {
  email: string;
  messageId: string;
  complaintType?: string;
  timestamp: Date;
  userAgent?: string;
}

export interface EmailOpenEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  userAgent?: string;
  ip?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface EmailClickEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

export interface UnsubscribeEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  unsubscribeType?: 'manual' | 'automatic';
}
