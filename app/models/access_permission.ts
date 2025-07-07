import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AccessPermissionCompartment from '#models/access_permission_compartment'
import User from '#models/user'

export default class AccessPermission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({columnName: 'has_fingerprint'})
  declare hasFingerprint: boolean;

  @column({columnName: 'user_id'})
  declare userId: number

  @column({columnName: 'locker_id'})
  declare lockerId: number

  @column({columnName: 'created_by'})
  declare createdBy: number

  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId',
  })
  declare locker: BelongsTo<typeof Locker>

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @hasMany(() => AccessPermissionCompartment)
  declare accessPermissionCompartments: HasMany<typeof AccessPermissionCompartment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
