import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}