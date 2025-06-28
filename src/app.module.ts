import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLockerModule } from './user-lockers/user-locker.module';
import { UserCompartmentModule } from './user-compartments/user-compartment.module';
import { ConfigModule } from '@nestjs/config';
import { SlackService } from './slack/slack.service';
import { SlackModule } from './slack/slack.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "mysql",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT!, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
    UserLockerModule,
    UserCompartmentModule,
    SlackModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
