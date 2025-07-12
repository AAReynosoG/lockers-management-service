import { paginationValidator } from '#validators/pagination'
import { sendErrorResponse } from './response.js'
import type { HttpContext } from '@adonisjs/core/http'

export async function validatePagination(ctx: HttpContext): Promise<{ page: number; limit: number } | null> {
  try {
    const validated = await paginationValidator.validate({
      page: Number(ctx.request.input('page', 1)),
      limit: Number(ctx.request.input('limit', 10))
    })
    
    return {
      page: validated.page || 1,
      limit: validated.limit || 10
    }
  } catch (error) {
    const invalidQueryParams: Record<string, string> = {}
    if (error.messages) {
      for (const err of error.messages) {
        invalidQueryParams[err.field] = err.message
      }
    } else {
      invalidQueryParams['general'] = error.message || 'Invalid pagination parameters'
    }
    sendErrorResponse(ctx.response, 400, 'Invalid query params' ,invalidQueryParams)
    return null
  }
}