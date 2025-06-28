import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SlackService {
  private readonly webhookUrl = process.env.SLACK_WEBHOOK!;

  async sendExceptionMessage(payload: {
    exception: any;
    status: number;
  }): Promise<void> {
    const { exception, status} = payload;

    const errorMessage = typeof exception === 'string'
      ? exception
      : exception?.message || exception?.error || 'No error message';

    const stack = exception?.stack ? exception.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace';

    const slackMessage = `*Exception triggered*  
    *Status:* ${status}  
    *Message:* ${errorMessage}  
    *Stack:*\n\`\`\`${stack}\`\`\``;

    await axios.post(this.webhookUrl, { text: slackMessage });
  }

}