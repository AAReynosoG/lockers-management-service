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
    async storeLog({request, response}: HttpContext) {
            
        const params = await request.validateUsing(storeLogValidator)
        const { image_base_64, file_name, serial_number, user_id, compartment_number, action, source } = params

        let path = ''
        if(image_base_64 && file_name) {   
            try {
                const base64Data = image_base_64.replace(/^data:image\/\w+;base64,/, '')
                const buffer = Buffer.from(base64Data, 'base64')
                    
                const { data } = await supabase.storage
                .from('lockity-images')
                .upload(`lockers/${serial_number}/${file_name}`, buffer, {
                    contentType: 'image/png',
                    upsert: true
                })
                    
                path = data!.path
            } catch (error) { 
                console.error(error)
                return sendErrorResponse(response, 500, 'Error uploading image', error)
            }
         }       

        let performedBy: Record<string, any> = {}
        let locker: Record<string, any> = {}
                
        const lockerQuery = await Locker.query()
        .where('serial_number', serial_number)
        .preload('area', (areaQuery) => {
            areaQuery.preload('organization')
        })
        .first()

        if (lockerQuery) {
            locker = {
                lockerSerialNumber: lockerQuery.serialNumber,
                manipulatedCompartment: compartment_number,
                numberInArea: lockerQuery.lockerNumber,
                areaName: lockerQuery.area.name,
                organizationName: lockerQuery.area.organization.name
            }

            const lurQuery = await LockerUserRole.query()
            .where('locker_id', lockerQuery.id)
            .preload('user', (uQuery) => {
                uQuery.where('id', user_id)
            })
            .first()
                    
            if (lurQuery) {
                performedBy = {
                    fullName: `${lurQuery.user.name} ${lurQuery.user.lastName} ${lurQuery.user.secondLastName}`,
                    email: lurQuery.user.email,
                    role: lurQuery.role
                }
            }
        }

        console.log('performed_by', performedBy)
        console.log('locker', locker)
        console.log('photo_path', path)
        console.log('action', action)
        console.log('source', source)
        return sendSuccessResponse(response, 201, 'Log stored successfully', {path})                       
    }
}