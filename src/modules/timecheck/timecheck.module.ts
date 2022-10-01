import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemoteWorkingRepository } from '../request-management/remote-working/remote-working.repository';
import { UserRepository } from '../user-management/user/user.repository';
import { TimecheckController } from './timecheck.controller';
import { Timecheck } from './timecheck.entity';
import { TimecheckRepository } from './timecheck.repository';
import { TimecheckService } from './timecheck.service';

@Module({
  imports: [TypeOrmModule.forFeature([Timecheck])],
  controllers: [TimecheckController],
  providers: [
    TimecheckService,
    TimecheckRepository,
    UserRepository,
    RemoteWorkingRepository,
  ],
  exports: [],
})
export class TimecheckModule {}