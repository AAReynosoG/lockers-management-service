import LockerUserRole from '#models/locker_user_role'

export class IsAdminService {
  public static async isAdmin(lockerId: number, userId: number) {
    const actingRole = await LockerUserRole.findBy({
      lockerId: lockerId,
      userId: userId,
    })

    return actingRole && ['admin', 'super_admin'].includes(actingRole.role)
  }
}
