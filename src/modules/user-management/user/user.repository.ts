import { Injectable } from '@nestjs/common';
import { get, omit, pick } from 'lodash';
import { TypeORMRepository } from 'src/database/typeorm.repository';
import { hashPassword } from 'src/helpers/encrypt.helper';
import { LeaveBenefit } from 'src/modules/benefit-management/leave-benefit/leave-benefit.entity';
import { Department } from 'src/modules/department/department.entity';
import { FilterTimecheckDto } from 'src/modules/timecheck/dto';
import { Timecheck } from 'src/modules/timecheck/timecheck.entity';
import { GeneralWorktimeSetting } from 'src/modules/worktime-management/general-worktime-setting/general-worktime-setting.entity';
import { GeneralWorktime } from 'src/modules/worktime-management/general-worktime/general-worktime.entity';
import { EntityManager } from 'typeorm';
import { Role } from '../role/role.entity';
import { UserRole } from '../user-role/user-role.entity';
import { FilterUsersDto } from './dto';
import { User } from './user.entity';

@Injectable()
export class UserRepository extends TypeORMRepository<User> {
  constructor(manager: EntityManager) {
    super(User, manager);
  }

  async getAll(filterUsersDto: FilterUsersDto) {
    const { page, limit, email } = filterUsersDto;
    const query = this.createQueryBuilder('user')
      .leftJoinAndMapMany(
        'user.roles',
        UserRole,
        'role',
        'user.code = role.userCode',
      )
      .leftJoinAndMapOne(
        'role.roleInfo',
        Role,
        'roleInfo',
        'role.roleCode = roleInfo.code',
      );

    query.select([
      'user.id',
      'user.email',
      'user.phone',
      'user.createdAt',
      'user.updatedAt',
      'role.id',
      'role.roleCode',
      'roleInfo.id',
      'roleInfo.name',
    ]);

    if (email) {
      query.andWhere('user.email = :email', { email });
    }

    const [items, totalItems] = await query.getManyAndCount();

    return {
      items,
      pagination: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: +limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: +page,
      },
    };
  }

  async signUp(signUpDto: any) {
    signUpDto.password = await hashPassword(signUpDto.password);
    return await User.save(signUpDto);
  }

  async findOneByConditions(conditions: any): Promise<User> {
    return await User.findOne(conditions);
  }

  async update(data: any) {
    return await User.save(data);
  }

  async findOneWithRoles(conditions: any): Promise<User> {
    const query = User.createQueryBuilder('user')
      .leftJoinAndMapMany(
        'user.roles',
        UserRole,
        'roles',
        'user.code = roles.userCode',
      )
      .select([
        'user.id',
        'user.code',
        'user.department',
        'user.managerCode',
        'user.name',
        'roles.id',
        'roles.roleCode',
      ])
      .where(conditions);

    const user = await query.getOne();

    user['roles'] = user['roles'].map((item) => {
      return get(item, 'roleCode');
    });

    return user;
  }

  async getTimechecks(
    filterTimecheckDto: FilterTimecheckDto,
    conditions?: any,
  ) {
    const { page, limit, startDate, endDate, getAll } = filterTimecheckDto;
    const offset = (page - 1) * limit;

    const query = this.createQueryBuilder('user')
      .leftJoinAndMapMany(
        'user.timechecks',
        Timecheck,
        'timecheck',
        'user.code = timecheck.userCode AND timecheck.checkDate >= :startDate AND timecheck.checkDate <= :endDate',
        {
          startDate,
          endDate,
        },
      )
      .select([
        'user.id',
        'user.code',
        'user.name',
        'timecheck.id',
        'timecheck.checkDate',
        'timecheck.checkInTime',
        'timecheck.checkOutTime',
        'timecheck.missCheckInMin',
        'timecheck.missCheckOutMin',
        'timecheck.missCheckIn',
        'timecheck.missCheckOut',
        'timecheck.isLeaveBenefit',
        'timecheck.leaveHour',
        'timecheck.workHour',
        'timecheck.timezone',
        'timecheck.isDayOff',
      ])
      .where({ isActive: true })
      .orderBy('timecheck.checkDate', 'ASC');

    if (!getAll) {
      query.take(limit).skip(offset);
    }

    if (conditions) {
      query.andWhere(conditions);
    }

    const [items, totalItems] = await query.getManyAndCount();
    return {
      items,
      pagination: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: +limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: +page,
      },
    };
  }

  async getUserWorktime(userCode: string, checkDate: Date) {
    const query = this.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.worktimeStg',
        GeneralWorktimeSetting,
        'worktimeStg',
        'user.worktimeCode = worktimeStg.code',
      )
      .leftJoinAndMapOne(
        'worktimeStg.worktime',
        GeneralWorktime,
        'worktime',
        'worktimeStg.code = worktime.worktimeCode AND worktime.dayOfWeek = :dayOfWeek',
        {
          dayOfWeek: checkDate.getUTCDay(),
        },
      )
      .where({ code: userCode });

    return await query.getOne();
  }

  async getOwnersInfo(code: string) {
    const query = this.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.department',
        Department,
        'department',
        'user.department = department.code',
      )
      .leftJoinAndMapOne(
        'user.manager',
        User,
        'manager',
        'user.managerCode = manager.code',
      )
      .leftJoinAndMapMany(
        'user.worktimes',
        GeneralWorktime,
        'worktime',
        'user.worktimeCode = worktime.worktimeCode',
      )
      .leftJoinAndMapOne(
        'user.leaveBenefit',
        LeaveBenefit,
        'leaveBenefit',
        'user.leaveBenefitCode = leaveBenefit.code',
      )
      .orderBy('worktime.dayOfWeek', 'ASC')
      .where({ code });

    const data = await query.getOne();

    const omitManager = pick(get(data, 'manager', null), [
      'id',
      'code',
      'name',
    ]);

    const omitLeaveBenefit = pick(get(data, 'leaveBenefit', null), [
      'id',
      'code',
      'name',
    ]);

    const omitDepartment = pick(get(data, 'department', null), [
      'id',
      'code',
      'name',
    ]);

    const omitWorktime = get(data, 'worktimes', []).map((worktime) =>
      omit(worktime, ['createdAt', 'updatedAt']),
    );

    return {
      ...omit(data, ['password', 'manager', 'leaveBenefit', 'worktimes']),
      manager: omitManager,
      leaveBenefit: omitLeaveBenefit,
      department: omitDepartment,
      worktimes: omitWorktime,
    };
  }
}
