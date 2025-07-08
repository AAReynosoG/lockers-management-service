import vine from '@vinejs/vine'

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

export const getLockerConfigParamsValidator = vine.compile(
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

export const getAuthUserLockers = vine.compile(
  vine.object({
    showSchedules: vine.boolean().optional(),
  })
)
