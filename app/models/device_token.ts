import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DeviceToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({columnName: 'user_id'})
  declare userId: number

  @column({columnName: 'device_token'})
  declare deviceToken: string

  @column({columnName: 'device_type'})
  declare deviceType: 'mobile' | 'web' | 'desktop'

  @column()
  declare platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux'

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}