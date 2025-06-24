import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLockerModule } from './user-lockers/user-locker.module';
import { UserCompartmentModule } from './user-compartments/user-compartment.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'token1234',
      database: 'lockity_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
    UserLockerModule,
    UserCompartmentModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
