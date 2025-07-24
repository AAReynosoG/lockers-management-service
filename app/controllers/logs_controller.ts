import type { HttpContext } from '@adonisjs/core/http'
import { Buffer } from 'buffer'
import { createClient } from '@supabase/supabase-js'
import env from '#start/env'
import { storeLogValidator } from '#validators/log'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import Locker from '#models/locker'
import LockerUserRole from '#models/locker_user_role'

const supabaseUrl = env.get('SUPABASE_URL')!
const supabaseKey = env.get('SUPABASE_API_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)
export default class LogsController {
    async storeLogs({request, response}: HttpContext) {
        const params = await request.validateUsing(storeLogValidator)
        const { logs } = params

        try {
            const serialNumbers = [...new Set(logs.map(log => log.serial_number))]
            const userIds = [...new Set(logs.map(log => log.user_id))]

            const lockersData = await Locker.query()
                .whereIn('serial_number', serialNumbers)
                .preload('area', (areaQuery) => {
                    areaQuery.preload('organization')
            })

            const userRolesData = await LockerUserRole.query()
            .whereIn('locker_id', lockersData.map(l => l.id))
            .whereIn('user_id', userIds)
            .preload('user')

            const lockerMap = new Map(lockersData.map(l => [l.serialNumber, l]))
                const userRoleMap = new Map(
                userRolesData.map(ur => [`${ur.lockerId}-${ur.userId}`, ur])
            )

            const results = await Promise.allSettled(
                logs.map(async (log, index) => {
                    const { image_base_64, file_name, serial_number, user_id, compartment_number, action, source } = log

                    const imageUploadPromise = (image_base_64 && file_name) 
                    ? this.uploadImage(image_base_64, file_name, serial_number)
                    : Promise.resolve('')

                    const locker = lockerMap.get(serial_number)
                    const userRole = locker ? userRoleMap.get(`${locker.id}-${user_id}`) : null

                    const [path] = await Promise.all([imageUploadPromise])

                    return {
                    index,
                    performedBy: userRole ? {
                        fullName: `${userRole.user.name} ${userRole.user.lastName} ${userRole.user.secondLastName}`,
                        email: userRole.user.email,
                        role: userRole.role
                    } : {},
                    locker: locker ? {
                        lockerSerialNumber: locker.serialNumber,
                        manipulatedCompartment: compartment_number,
                        numberInArea: locker.lockerNumber,
                        areaName: locker.area.name,
                        organizationName: locker.area.organization.name
                    } : {},
                    photo_path: path,
                    action,
                    source
                    }
                })
            )

            const successful = results
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<any>).value)

            this.printLogs(successful)

            return sendSuccessResponse(response, 201, 'Logs processed', {
                total: logs.length,
                successful: successful.length,
                failed: results.length - successful.length,
                results: successful
            })

        } catch (error) {
            return sendErrorResponse(response, 500, 'Error processing logs', error)
        }
    }

    private async uploadImage(image_base_64: string, file_name: string, serial_number: string): Promise<string> {
        try {
            const base64Data = image_base_64.replace(/^data:image\/\w+;base64,/, '')
            const buffer = Buffer.from(base64Data, 'base64')
            
            const { data } = await supabase.storage
            .from('lockity-images')
            .upload(`lockers/${serial_number}/${file_name}`, buffer, {
                contentType: 'image/png',
                upsert: true
            })
            
            return data!.path
        } catch (error) {
            console.error(`Error uploading image for ${serial_number}:`, error)
            return ''
        }
    }

    private printLogs(logs: any[]) {
        console.log('=== LOGS PROCESSED ===')
        logs.forEach((log, index) => {
            console.log(`\n--- Log ${index + 1} ---`)
            console.log('performed_by:', log.performedBy)
            console.log('locker:', log.locker)
            console.log('photo_path:', log.photo_path)
            console.log('action:', log.action)
            console.log('source:', log.source)
        })
    }
}