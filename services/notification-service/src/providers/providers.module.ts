// src/providers/providers.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Twilio Provider
import { TwilioService } from './twilio/twilio.service';
import { TwilioController } from './twilio/twilio.controller';
import twilioConfig from './twilio/twilio.config';

// Firebase Provider
import { FirebaseService } from './firebase/firebase.service';
import { FirebaseController } from './firebase/firebase.controller';
import firebaseConfig from './firebase/firebase.config';

// Mailtrap Provider (if you have it)
import { MailtrapService } from './mailtrap/mailtrap.service';
import { MailtrapController } from './mailtrap/mailtrap.controller';
import mailtrapConfig from './mailtrap/mailtrap.config';

@Global() // Makes services available globally without importing
@Module({
  imports: [
    ConfigModule.forFeature(twilioConfig),
    ConfigModule.forFeature(firebaseConfig),
    ConfigModule.forFeature(mailtrapConfig), // Uncomment if using Mailtrap
  ],
  controllers: [
    TwilioController,
    FirebaseController,
    MailtrapController, // Uncomment if using Mailtrap
  ],
  providers: [
    TwilioService,
    FirebaseService,
    MailtrapService, // Uncomment if using Mailtrap
    
    // Provider factory tokens for dependency injection
    {
      provide: 'SMS_PROVIDER',
      useExisting: TwilioService,
    },
    {
      provide: 'PUSH_PROVIDER',
      useExisting: FirebaseService,
    },
    {
      provide: 'EMAIL_PROVIDER',
      useExisting: MailtrapService,
    },
  ],
  exports: [
    TwilioService,
    FirebaseService,
    MailtrapService,
    'SMS_PROVIDER',
    'PUSH_PROVIDER',
    'EMAIL_PROVIDER',
  ],
})
export class ProvidersModule {}