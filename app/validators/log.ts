import vine from '@vinejs/vine'

const storeLogSchema = vine.object({
        image_base_64: vine.string().trim().nullable(),
        file_name: vine.string().trim().regex(/\.(jpg|jpeg|png)$/i).nullable(),
        serial_number: vine.string().trim().minLength(1).maxLength(100),
        user_id: vine.number().positive().optional(),
        compartment_number: vine.number().positive().optional(),
        action: vine.enum(['opening', 'closing', 'failed_attempt']),
        source: vine.enum(['mobile', 'desktop', 'physical']),
    })


export const storeLogValidator = vine.compile(
    vine.object({
        logs: vine.array(storeLogSchema).minLength(1)
    })
)