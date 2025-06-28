import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class ResendService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private compileTemplate(templateName: string, context: object) {
    const isDev = process.env.NODE_ENV !== 'production';

    const templatesBasePath = isDev
      ? path.join(process.cwd(), 'src', 'communication', 'email-templates')
      : path.join(__dirname, '..', 'email-templates');

    const filePath = path.join(templatesBasePath, `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf8');
    const template = Handlebars.compile(source);
    return template(context);
  }

  async sendEmail(to: string, subject: string, templateName: string, context: object){
    const html = this.compileTemplate(templateName, context)

    return await this.resend.emails.send({
      from: process.env.RESEND_FROM!,
      to,
      subject,
      html
    });
  }
}