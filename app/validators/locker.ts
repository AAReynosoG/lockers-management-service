import vine from '@vinejs/vine'
import { baseScheduleSchema } from '#validators/schedule'

export const lockerParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
  })
)

export const assignUserToCompartmentParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
    compartmentNumber: vine.number().positive(),
  })
)

export const getUsersWithLockersParamsValidator = vine.compile(
  vine.object({
    organizationId: vine.number().positive(),
  })
)

export const lockerIdParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
  })
)

export const createLockerTopicsValidator = vine.compile(
  vine.object({
    topic: vine.string().trim(),
  })
)

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
