import LockerUserRole from '#models/locker_user_role'

export class IsAdminService {
  public static async isAdmin(lockerId: number, userId: number, roles: string[]) {
    const actingRole = await LockerUserRole.findBy({
      lockerId: lockerId,
      userId: userId,
    })

    return actingRole && roles.includes(actingRole.role)
  }
}
