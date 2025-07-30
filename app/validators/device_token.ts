import vine from '@vinejs/vine'

export const deviceTokenValidator = vine.compile(
    vine.object({
        device_token: vine.string().trim(),
    })
)