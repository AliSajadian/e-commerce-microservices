import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
// import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getLivenessStatus();
  }

  // @Get('ready')
  // async getReadiness(@Res() res: Response) {
  //   const readiness = await this.appService.getReadinessStatus();
  //   if (readiness.status === 'up') {
  //     res.status(HttpStatus.OK).json(readiness);
  //   } else {
  //     res.status(HttpStatus.SERVICE_UNAVAILABLE).json(readiness);
  //   }
  // }
}