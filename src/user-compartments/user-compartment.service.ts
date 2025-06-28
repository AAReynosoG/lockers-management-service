import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Locker } from '../entities/locker.entity';
import { Compartment } from '../entities/compartment.entity';
import { User } from '../entities/user.entity';
import { LockerUserRole } from '../entities/locker-user-role.entity';
import { AccessPermission } from '../entities/access_permission.entity';
import { AccessPermissionCompartment } from '../entities/access_permission_compartment.entity';
import { LockerUserRoleEnum } from '../commons/enums/locker-user-role.enum';
import { ResendService } from '../communication/resend/resend.service';

@Injectable()
export class UserCompartmentService {
  constructor(
    private resendService: ResendService,
    @InjectRepository(Locker)
    private readonly lockerRepository: Repository<Locker>,
    @InjectRepository(Compartment)
    private readonly compartmentRepository: Repository<Compartment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LockerUserRole)
    private readonly lockerUserRoleRepository: Repository<LockerUserRole>,
    @InjectRepository(AccessPermission)
    private readonly accessPermissionRepository: Repository<AccessPermission>,
    @InjectRepository(AccessPermissionCompartment)
    private readonly accessPermissionCompartmentRepository: Repository<AccessPermissionCompartment>,
  ) {}

  async assignUserToLockerCompartment(
    lockerId: number,
    compartmentNumber: number,
    userEmail: string,
    role: LockerUserRoleEnum,
  ) {
    const locker = await this.lockerRepository.findOne({ where: { id: lockerId } });

    if (!locker) {
      return {
        success: false,
        message: `Locker doesn't exist`,
      }
    }

    const compartment = await this.compartmentRepository.findOne({
      where: {
        locker: { id: lockerId },
        compartment_number: compartmentNumber,
      },
    });

    if (!compartment) {
      return {
        success: false,
        message: `Compartment doesn't exist`,
      }
    }

    const user = await this.userRepository.findOne({ where: { email: userEmail } });

    if (!user) {
      await this.resendService.sendEmail(userEmail, 'Lockity - Invitation', 'invitation-view', {
        email: userEmail
      });

      return {
        success: false,
        message: `User doesn't exist. An invitation email has been sent to their email!`,
      }
    }

    let lockerUserRole = await this.lockerUserRoleRepository.findOne({
      where: { locker: { id: locker.id }, user: { id: user.id } },
    });

    if (!lockerUserRole) {
      lockerUserRole = this.lockerUserRoleRepository.create({
        locker,
        user,
        role: role,
      });
    } else {
      lockerUserRole.role = role;
    }

    await this.lockerUserRoleRepository.save(lockerUserRole);

    let accessPermission = await this.accessPermissionRepository.findOne({
      where: { locker: { id: locker.id }, user: { id: user.id } },
    });

    if (!accessPermission) {
      accessPermission = this.accessPermissionRepository.create({
        locker,
        user,
        has_fingerprint: false,
      });

      await this.accessPermissionRepository.save(accessPermission);
    }

    const existingAccess = await this.accessPermissionCompartmentRepository.findOne({
      where: {
        accessPermission: { id: accessPermission.id },
        compartment: { id: compartment.id },
      },
    });

    if (!existingAccess) {
      const accessPermissionCompartment = this.accessPermissionCompartmentRepository.create({
        accessPermission,
        compartment,
      });

      await this.accessPermissionCompartmentRepository.save(accessPermissionCompartment);
    }

    return {
      success: true,
      message: `Operation completed successfully`,
    }
  }
}
