import vine from '@vinejs/vine'

export const assignUserToCompartment = vine.compile(
  vine.object({
    user_email: vine.string().trim().email().minLength(5).maxLength(100),
    role: vine.enum(['user'])
  })
)
