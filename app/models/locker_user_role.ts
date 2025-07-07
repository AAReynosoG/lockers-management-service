import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class LockerUserRole extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare role: 'super_admin' | 'admin' | 'user'

  @column({columnName: 'user_id'})
  declare userId: number

  @column({columnName: 'locker_id'})
  declare lockerId: number

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId',
  })
  declare locker: BelongsTo<typeof Locker>

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
