import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import LockerUserRole from '#models/locker_user_role'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import AccessPermission from '#models/access_permission'
import Organization from '#models/organization'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string;

  @column()
  declare lastName: string;

  @column()
  declare secondLastName: string;

  @column()
  declare email: string;

  @hasMany(() => LockerUserRole)
  declare lockerUserRoles: HasMany<typeof LockerUserRole>;

  @hasMany(() => AccessPermission)
  declare accessPermissions: HasMany<typeof AccessPermission>;

  @hasMany(() => Organization)
  declare organizations: HasMany<typeof Organization>;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
