import vine from '@vinejs/vine'

export const createAreaValidator = vine.compile(
    vine.object({
        name: vine.string().trim().maxLength(50).minLength(3),
        description: vine.string().trim().maxLength(100).minLength(3),
    })
)

export const updateAreaValidator = vine.compile(
    vine.object({
        name: vine.string().trim().maxLength(50).minLength(3).optional(),
        description: vine.string().trim().maxLength(100).minLength(3).optional(),
    })
)