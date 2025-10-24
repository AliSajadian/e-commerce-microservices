import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { 
  FirebaseConfig, 
  FirebasePushNotificationOptions, 
  FirebaseMulticastOptions, 
  FirebaseMessageResponse,
  FirebaseMulticastResponse,
  TopicSubscriptionResult 
} from './firebase.types';
import { PushProviderInterface } from '../interfaces';
import { ServiceAccount } from 'firebase-admin/lib/app/credential';

@Injectable()
export class FirebaseService implements PushProviderInterface {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly config: FirebaseConfig;
  private readonly app: admin.app.App;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      projectId: this.configService.get<string>('firebase.projectId'),
      privateKeyId: this.configService.get<string>('firebase.privateKeyId'),
      privateKey: this.configService.get<string>('firebase.privateKey'),
      clientEmail: this.configService.get<string>('firebase.clientEmail'),
      clientId: this.configService.get<string>('firebase.clientId'),
      authUri: this.configService.get<string>('firebase.authUri'),
      tokenUri: this.configService.get<string>('firebase.tokenUri'),
      providerCertUrl: this.configService.get<string>('firebase.providerCertUrl'), 
      clientCertUrl: this.configService.get<string>('firebase.clientCertUrl'),
    };

    this.app = this.initializeFirebase();
    this.logger.log('Firebase service initialized successfully');
  }

  private initializeFirebase(): admin.app.App {
    try {
      // Check if Firebase app is already initialized
      try {
        return admin.app('notification-service');
      } catch (error) {
        // App doesn't exist, initialize it
      }

      let credential: admin.credential.Credential;

      if (this.config.serviceAccountPath) {
        // Use service account file
        credential = admin.credential.cert(this.config.serviceAccountPath);
      } else if (this.config.privateKey && this.config.clientEmail) {
        // Use service account object
        credential = admin.credential.cert({
          projectId: this.config.projectId,
          privateKey: this.config.privateKey,
          clientEmail: this.config.clientEmail,
          clientId: this.config.clientId,
          authUri: this.config.authUri,
          tokenUri: this.config.tokenUri,
          authProviderX509CertUrl: this.config.providerCertUrl,
          clientX509CertUrl: this.config.clientCertUrl,
        } as ServiceAccount);
      } else {
        throw new Error('Firebase credentials not properly configured');
      }

      return admin.initializeApp({
        credential,
        projectId: this.config.projectId,
      }, 'notification-service');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }

  async sendPushNotification(options: FirebasePushNotificationOptions): Promise<FirebaseMessageResponse> {
    try {
      const message = this.buildMessage(options);
      
      let messageId: string;

      if (options.token) {
        // Send to single token
        messageId = await this.app.messaging().send({
          ...message,
          token: options.token,
        });
      } else if (options.tokens && options.tokens.length === 1) {
        // Send to single token from array
        messageId = await this.app.messaging().send({
          ...message,
          token: options.tokens[0],
        });
      } else if (options.topic) {
        // Send to topic
        messageId = await this.app.messaging().send({
          ...message,
          topic: options.topic,
        });
      } else if (options.condition) {
        // Send to condition
        messageId = await this.app.messaging().send({
          ...message,
          condition: options.condition,
        });
      } else {
        throw new BadRequestException('Either token, topic, or condition must be provided');
      }

      this.logger.log(`Push notification sent successfully. Message ID: ${messageId}`);
      
      return { messageId };
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
      
      if (error.code) {
        throw new BadRequestException(`Firebase Error ${error.code}: ${error.message}`);
      }
      
      throw new InternalServerErrorException('Failed to send push notification');
    }
  }

  async sendMulticastNotification(options: FirebaseMulticastOptions): Promise<FirebaseMulticastResponse> {
    try {
      if (!options.tokens || options.tokens.length === 0) {
        throw new BadRequestException('Tokens array cannot be empty');
      }

      const message = {
      notification: {
        title: options.title,
        body: options.body,
      },
      data: options.data || {},
      tokens: options.tokens,
      // Conditionally add platform-specific properties using the spread operator
      ...(options.android && { android: options.android }),
      // Check if `options.apns` exists AND has the required `payload.aps` property
      ...(options.apns?.payload?.aps && { apns: options.apns }),
      ...(options.webpush && { webpush: options.webpush }),
    };

    const response = await this.app.messaging().sendEachForMulticast(message as any); 

      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(options.tokens[idx]);
        }
      });

      this.logger.log(
        `Multicast notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map(resp => ({
          messageId: resp.messageId || '',
          error: resp.error ? {
            code: resp.error.code,
            message: resp.error.message,
          } : undefined,
        })),
        failedTokens,
      };
    } catch (error) {
      this.logger.error('Failed to send multicast notification:', error);
      
      if (error.code) {
        throw new BadRequestException(`Firebase Error ${error.code}: ${error.message}`);
      }
      
      throw new InternalServerErrorException('Failed to send multicast notification');
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<TopicSubscriptionResult> {
    try {
      const response = await this.app.messaging().subscribeToTopic(tokens, topic);
      
      this.logger.log(
        `Topic subscription completed. Success: ${response.successCount}, Failed: ${response.failureCount}`
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors.map(error => ({
          index: error.index,
          error: {
            code: error.error.code,
            message: error.error.message,
          },
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to subscribe tokens to topic ${topic}:`, error);
      throw new InternalServerErrorException('Failed to subscribe to topic');
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<TopicSubscriptionResult> {
    try {
      const response = await this.app.messaging().unsubscribeFromTopic(tokens, topic);
      
      this.logger.log(
        `Topic unsubscription completed. Success: ${response.successCount}, Failed: ${response.failureCount}`
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors.map(error => ({
          index: error.index,
          error: {
            code: error.error.code,
            message: error.error.message,
          },
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe tokens from topic ${topic}:`, error);
      throw new InternalServerErrorException('Failed to unsubscribe from topic');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Try to send a dry run message to validate token
      await this.app.messaging().send({
        token,
        notification: {
          title: 'Test',
          body: 'Test',
        },
      }, true); // dry run
      
      return true;
    } catch (error) {
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        return false;
      }
      throw error;
    }
  }
// Implementation of PushProviderInterface
  async send(tokens: string | string[], title: string, body: string, data?: Record<string, any>): Promise<any> {
    if (typeof tokens === 'string') {
      return this.sendPushNotification({
        token: tokens,
        title,
        body,
        data: data ? this.convertDataToStringRecord(data) : undefined,
      });
    } else {
      return this.sendMulticastNotification({
        tokens,
        title,
        body,
        data: data ? this.convertDataToStringRecord(data) : undefined,
      });
    }
  }

  async sendToTopic(topic: string, title: string, body: string, data?: Record<string, any>): Promise<any> {
    return this.sendPushNotification({
      topic,
      title,
      body,
      data: data ? this.convertDataToStringRecord(data) : undefined,
    });
  }

  private buildMessage(options: FirebasePushNotificationOptions): any {
    const message: any = {
      notification: {
        title: options.title,
        body: options.body,
      },
    };

    if (options.data) {
      message.data = options.data;
    }

    if (options.imageUrl) {
      message.notification.imageUrl = options.imageUrl;
    }

    // Android specific options
    if (options.priority || options.collapseKey || options.restrictedPackageName || options.timeToLive) {
      message.android = {
        priority: options.priority,
        collapseKey: options.collapseKey,
        restrictedPackageName: options.restrictedPackageName,
        ttl: options.timeToLive,
      };
    }

    // APNS specific options
    if (options.badge || options.sound || options.clickAction) {
      message.apns = {
        payload: {
          aps: {
            badge: options.badge,
            sound: options.sound,
            category: options.clickAction,
          },
        },
      };
    }

    // Web push specific options
    if (options.icon || options.tag || options.clickAction) {
      message.webpush = {
        notification: {
          icon: options.icon,
          tag: options.tag,
          click_action: options.clickAction,
        },
      };
    }

    return message;
  }

  private convertDataToStringRecord(data: Record<string, any>): Record<string, string> {
    const stringRecord: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringRecord[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringRecord;
  }
}

// var admin = require("firebase-admin");

// var serviceAccount = require("path/to/serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });


// import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
// import * as firebaseAdmin from 'firebase-admin';
// import { ConfigService } from '@nestjs/config';

// @Injectable()
// export class FirebaseService implements OnApplicationBootstrap {
//   private readonly logger = new Logger(FirebaseService.name);
//   private adminApp: firebaseAdmin.app.App;

//   constructor(private readonly configService: ConfigService) {}

//   onApplicationBootstrap() {
//     this.initializeFirebase();
//   }

//   private initializeFirebase() {
//     try {
//       // Corrected approach: Load the entire service account JSON file.
//       // This is less prone to errors with private keys from environment variables.
//       const serviceAccount = require(
//         '../../../config/service-account.json' // <-- Make sure this path is correct for your project
//       );

//       this.adminApp = firebaseAdmin.initializeApp({
//         credential: firebaseAdmin.credential.cert(serviceAccount),
//         databaseURL: this.configService.get('FIREBASE_DATABASE_URL'),
//       });

//       this.logger.log('Firebase initialized successfully');
//     } catch (error) {
//       this.logger.error('Failed to initialize Firebase:', error);
//       throw new Error(`Firebase initialization failed: ${error.message}`);
//     }
//   }

//   getAdminApp(): firebaseAdmin.app.App {
//     if (!this.adminApp) {
//       this.logger.error('Firebase has not been initialized yet.');
//       throw new Error('Firebase not initialized.');
//     }
//     return this.adminApp;
//   }
// }


