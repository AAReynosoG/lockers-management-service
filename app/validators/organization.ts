import vine from '@vinejs/vine'

const areaSchema = vine.object({
  name: vine.string().trim().minLength(3).maxLength(50),
  description: vine.string().trim().minLength(3).maxLength(100),
})

export const createOrganization = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(80),
    description: vine.string().trim().minLength(3).maxLength(150),
    area: areaSchema,
    locker_serial_number: vine.string().trim().minLength(1).maxLength(100),
  })
)

export const updateOrganizationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(80).optional(),
    description: vine.string().trim().minLength(3).maxLength(150).optional(),
  })
)
