import { Response } from '@adonisjs/core/http'

export function sendErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  errors: any = null
) {
  return res.status(statusCode).send({
    success: false,
    message,
    errors,
  })
}

export function sendSuccessResponse(
  res: Response,
  statusCode: number = 200,
  message: string,
  data: any = null
) {
  return res.status(statusCode).send({
    success: true,
    message,
    data,
  })
}
