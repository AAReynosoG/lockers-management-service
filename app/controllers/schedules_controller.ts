import type { HttpContext } from '@adonisjs/core/http'
import { createScheduleValidator, updateScheduleValidator } from '#validators/schedule'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import ScheduleService from '#services/schedule_service'
import { IsAdminService } from '#services/is_admin_service'
import Schedule from '#models/schedule'
import { validatePagination } from '../helpers/validate_query_params.js'

export default class SchedulesController {

  async createSchedule({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(createScheduleValidator)
    const lockerId = Number(request.param('lockerId'))

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
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
    const lockerId = Number(request.param('lockerId'))
    const scheduleId = Number(request.param('scheduleId'))

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    try {
      await ScheduleService.validateAndUpdate(scheduleId, payload, lockerId)

      return sendSuccessResponse(response, 201, 'Operation completed successfully')
    } catch (error) {
      return sendErrorResponse(response, error.statusCode, error.message)
    }

  }

  async getLockerSchedules(ctx: HttpContext) {
    const { request, response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit } = pagination
    const lockerId = Number(request.param('lockerId'))

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    const schedulesQuery = await Schedule
      .query()
      .where('lockerId', lockerId)
      .orderBy('id', 'asc')
      .paginate(page, limit)

    const queryResults = schedulesQuery.toJSON()

    const items = queryResults.data.map((schedule) => ({
      id: schedule.id,
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      repeat_schedule: schedule.repeatSchedule,
      schedule_date: schedule.scheduleDate,
    }))

    return sendSuccessResponse(
      response,
      200,
      'Schedules retrieved successfully',
      {
        items: items,
        total: schedulesQuery.total,
        page: page,
        limit: limit,
        has_next_page: schedulesQuery.currentPage < schedulesQuery.lastPage,
        has_previous_page: schedulesQuery.currentPage > 1,
      }
    )
  }
}
