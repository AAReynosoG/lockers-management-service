import type { HttpContext } from '@adonisjs/core/http'
import { createScheduleValidator, updateScheduleParamsValidator, updateScheduleValidator } from '#validators/schedule'
import { lockerIdParamsValidator } from '#validators/locker'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import ScheduleService from '#services/schedule_service'
import { IsAdminService } from '#services/is_admin_service'

export default class SchedulesController {

  async createSchedule({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(createScheduleValidator)
    const { lockerId } = await lockerIdParamsValidator.validate(request.params())

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id)
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    try {
      await ScheduleService.validateAndCreate(payload, lockerId, passportUser.id)

      return sendSuccessResponse(response, 201, 'Operation completed successfully')
    } catch (error) {
      return sendErrorResponse(response, error.statusCode, error.message)
    }
  }

  async updateSchedule({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(updateScheduleValidator)
    const { lockerId, scheduleId } = await updateScheduleParamsValidator.validate(request.params())

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id)
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    try {
      await ScheduleService.validateAndUpdate(scheduleId, payload, lockerId)

      return sendSuccessResponse(response, 201, 'Operation completed successfully')
    } catch (error) {
      return sendErrorResponse(response, error.statusCode, error.message)
    }

  }
}
