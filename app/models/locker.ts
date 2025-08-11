import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Compartment from '#models/compartment'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import LockerUserRole from '#models/locker_user_role'
import AccessPermission from '#models/access_permission'
import Area from '#models/area'
import LockerTopic from '#models/locker_topic'
import Schedule from '#models/schedule'
import LockerComponent from './locker_component.js'

export default class Locker extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare lockerNumber: number;

  @column()
  declare serialNumber: string;

  @column({ columnName: 'area_id' })
  declare areaId: number

  @belongsTo(() => Area, {
    foreignKey: 'areaId',
  })
  declare area: BelongsTo<typeof Area>;

  @hasMany(() => Compartment)
  declare lockerCompartments: HasMany<typeof Compartment>;

  @hasMany(() => LockerUserRole)
  declare lockerUserRoles: HasMany<typeof LockerUserRole>;

  @hasMany(() => AccessPermission)
  declare accessPermissions: HasMany<typeof AccessPermission>;

  @hasMany(() => LockerTopic)
  declare lockerTopics: HasMany<typeof LockerTopic>

  @hasMany(() => Schedule)
  declare schedules: HasMany<typeof Schedule>

  @hasMany(() => LockerComponent)
  declare components: HasMany<typeof LockerComponent>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
