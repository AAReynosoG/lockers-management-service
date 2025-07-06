import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class ResendService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private compileTemplate(templateName: string, context: object) {
    const filePath = path.join(__dirname, `../../resources/views/email/${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf8')
    const template = Handlebars.compile(source)
    return template(context);
  }

  async sendEmail(to: string, subject: string, templateName: string, context: object) {
    const html = this.compileTemplate(templateName, context)

    return await this.resend.emails.send({
      from: process.env.RESEND_FROM!,
      to,
      subject,
      html
    });
  }
}
