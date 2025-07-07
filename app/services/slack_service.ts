import axios from 'axios'
import env from '#start/env'

export class SlackService {
  private readonly webhookUrl: string;

  constructor() {
    this.webhookUrl = env.get('SLACK_WEBHOOK')!
  }

  async sendExceptionMessage(exception: any, status: number) {
    const errorMessage = typeof exception === 'string'
      ? exception
      : exception?.message || exception?.error || 'No such exception'

    const stack = exception?.stack ? exception.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace';

    const slackMessage = `*Exception triggered*
    *Status:* ${status}
    *Message:* ${errorMessage}
    *Stack:*\n\`\`\`${stack}\`\`\``;

    await axios.post(this.webhookUrl!, {text: slackMessage})
  }
}
