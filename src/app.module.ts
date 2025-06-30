import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLockerModule } from './user-lockers/user-locker.module';
import { UserCompartmentModule } from './user-compartments/user-compartment.module';
import { ConfigModule } from '@nestjs/config';
import { SlackModule } from './communication/slack/slack.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organizations/organization.module';

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
    SlackModule,
    AuthModule,
    OrganizationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
