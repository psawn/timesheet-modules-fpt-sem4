import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveBenefitRepository } from 'src/modules/benefit-management/leave-benefit/leave-benefit.repository';
import { UserLeaveBenefitRepository } from 'src/modules/benefit-management/user-leave-benefit/user-leave-benefit.repository';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    UserRepository,
    UserService,
    LeaveBenefitRepository,
    UserLeaveBenefitRepository,
  ],
  exports: [],
})
export class UserModule {}
