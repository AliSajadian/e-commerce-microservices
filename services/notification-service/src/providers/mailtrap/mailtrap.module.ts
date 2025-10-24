import { Module } from '@nestjs/common';
import { MailtrapController } from './mailtrap.controller';
import { MailtrapService } from './mailtrap.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // Import the ConfigModule to make ConfigService available
  controllers: [MailtrapController],
  providers: [MailtrapService],
  exports: [MailtrapService], // Optional: Export the service if other modules need to use it
})
export class MailtrapModule {}


//======================================================================
// // src/mailtrap/mailtrap.module.ts
// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';

// // Import controllers
// import { MailtrapController } from './mailtrap.controller';

// // Import services
// import { MailtrapService } from './mailtrap.service';
// import { MailtrapConfigService } from './mailtrap.config';

// // Import entities
// import { Notification } from '../../notification/entities';

// @Module({
//   imports: [
//     ConfigModule,
//     TypeOrmModule.forFeature([Notification]),
//   ],
//   controllers: [MailtrapController],
//   providers: [
//     MailtrapService,
//     MailtrapConfigService, // Add the config service
//   ],
//   exports: [
//     MailtrapService,
//     MailtrapConfigService, // Export so other modules can use it
//   ],
// })
// export class MailtrapModule {}