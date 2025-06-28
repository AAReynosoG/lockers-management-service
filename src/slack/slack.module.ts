import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SlackService],
})
export class SlackModule {}