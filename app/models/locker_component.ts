import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import LockerComponentPin from '#models/locker_components_pin'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class LockerComponent extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'locker_id' })
  declare lockerId: number

  @column()
  declare type: string

  @column()
  declare model: string

  @column()
  declare status: 'active' | 'inactive' | 'replaced'

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId',
  })
  declare locker: BelongsTo<typeof Locker>

  @hasMany(() => LockerComponentPin, {
    foreignKey: 'componentId',
  })
  declare pins: HasMany<typeof LockerComponentPin>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}