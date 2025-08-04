import vine from '@vinejs/vine'

export const contactUsValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1).maxLength(100),
        email: vine.string().trim().email(),
        message: vine.string().trim().minLength(1).maxLength(250),
        captchaToken: vine.string().trim()
    })
)