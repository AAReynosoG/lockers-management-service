import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './commons/filters/http-exception.filter';
import { SlackService } from './communication/slack/slack.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formattedErrors = {};
        errors.forEach((err) => {
          if (err.constraints)
            formattedErrors[err.property] = Object.values(err.constraints);
        });

        return new BadRequestException({
          success: false,
          message: 'Invalid parameters',
          errors: formattedErrors,
        });
      },
    }),
  );

  const slackService = app.get(SlackService);
  app.useGlobalFilters(new HttpExceptionFilter(slackService));

  await app.listen(process.env.PORT ?? 8001);
}
bootstrap();
