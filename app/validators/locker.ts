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

export const getAuthUserLockers = vine.compile(
  vine.object({
    showSchedules: vine.boolean().optional(),
  })
)
