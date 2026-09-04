import { Module } from '@nestjs/common';
import { AppreciationsService } from './appreciations.service';
import { AppreciationsController } from './appreciations.controller';

@Module({
  controllers: [AppreciationsController],
  providers: [AppreciationsService],
  exports: [AppreciationsService],
})
export class AppreciationsModule {}
