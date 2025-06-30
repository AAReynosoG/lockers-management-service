import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule {}
