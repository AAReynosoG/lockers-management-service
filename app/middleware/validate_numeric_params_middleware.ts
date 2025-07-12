import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { sendErrorResponse } from '../helpers/response.js'

export default class ValidateNumericParamsMiddleware {
  async handle(ctx: HttpContext, next: NextFn, params: string[]) {

    const invalidParams: Record<string, string> = {}

    for (const param of params) {
      const value = Number(ctx.request.param(param))

      if(!value || isNaN(value) || value <= 0 || !Number.isInteger(value)) {
        invalidParams[param] = `${param} must be a positive number`
      }
    }

    if (Object.keys(invalidParams).length > 0) { 
      return sendErrorResponse(
          ctx.response,
          400,
          'Invalid route parameters',
          invalidParams
        )
    }
    
    await next()
  }
}