import vine from '@vinejs/vine'

export const paginationValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional().transform((value) => {
      if (value && !Number.isInteger(value)) {
        throw new Error('page must be an integer')
      }
      return value ?? 1
    }),
    limit: vine.number().positive().max(100).optional().transform((value) => {
      if (value && !Number.isInteger(value)) {
        throw new Error('limit must be an integer')
      }
      return value ?? 10
    })
  })
)