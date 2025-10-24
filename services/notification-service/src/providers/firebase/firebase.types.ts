export interface FirebaseConfig {
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
  providerCertUrl: string;
  clientCertUrl: string;
  serviceAccountPath?: string;
}

export interface FirebasePushNotificationOptions {
  token?: string;
  tokens?: string[];
  topic?: string;
  condition?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  icon?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  tag?: string;
  color?: string;
  priority?: 'normal' | 'high';
  timeToLive?: number;
  collapseKey?: string;
  restrictedPackageName?: string;
  dryRun?: boolean;
}

export interface FirebaseMulticastOptions {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: {
    priority?: 'normal' | 'high';
    collapseKey?: string;
    restrictedPackageName?: string;
    ttl?: number;
  };
  apns?: {
    priority?: number;
    expiry?: number;
    headers?: Record<string, string>;
    payload?: {
      aps?: {
        alert?: any;
        badge?: number;
        sound?: string;
        contentAvailable?: boolean;
        mutableContent?: boolean;
        category?: string;
        threadId?: string;
      };
    };
  };
  webpush?: {
    headers?: Record<string, string>;
    data?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      badge?: string;
      image?: string;
      tag?: string;
      requireInteraction?: boolean;
      silent?: boolean;
      timestamp?: number;
      vibrate?: number[];
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    };
  };
}

export interface FirebaseMessageResponse {
  messageId: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface FirebaseMulticastResponse {
  successCount: number;
  failureCount: number;
  responses: FirebaseMessageResponse[];
  failedTokens: string[];
}

export interface TopicSubscriptionResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    index: number;
    error: {
      code: string;
      message: string;
    };
  }>;
}
