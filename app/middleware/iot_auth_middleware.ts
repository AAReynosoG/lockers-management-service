import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { sendErrorResponse } from '../helpers/response.js'
import env from '#start/env'

export default class IotAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {

    const key = ctx.request.header('x-iot-key')
    const validKey = env.get('IOT_SECRET_KEY')

    if(!key || key !== validKey) {
      return sendErrorResponse(ctx.response, 401, 'Unauthorized')
    }

    await next()
  }
}
