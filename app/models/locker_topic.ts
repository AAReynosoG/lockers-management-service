import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class LockerTopic extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({columnName: 'locker_id'})
  declare lockerId: number

  @column()
  declare topic: string

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId',
  })
  declare locker: BelongsTo<typeof Locker>
}
