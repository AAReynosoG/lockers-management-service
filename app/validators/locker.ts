import vine from '@vinejs/vine'
import { baseScheduleSchema } from '#validators/schedule'

export const createLockerValidator = vine.compile(
  vine.object({
    serial_number: vine.string().trim().maxLength(100),
    number_of_compartments: vine.number().positive().max(3).min(1),
  })
)


export const moveLockerToAreaValidator = vine.compile(
  vine.object({
    organization_id: vine.number().positive(),
    area_id: vine.number().positive(),
    serial_number: vine.string().trim().minLength(1).maxLength(100),
    new_schedule: vine.array(baseScheduleSchema).optional(),
  })
)
