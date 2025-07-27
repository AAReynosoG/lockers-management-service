import type { HttpContext } from '@adonisjs/core/http'
import { getDb } from '#services/mongo_service'

export default class MongosController {
    async insertTestData({ response }: HttpContext) {

      const dataToInsert = { 
            performedBy: {
                fullName: 'John Doe',
                email: 'mzprah@gmail.com',
                role: 'admin',
            },

            locker: {
                lockerSerialNumber: "SN_LOCKER",
                manipulatedCompartment: 1,
                numberInArea: 1,
                area: "Area 1",
                organizationName: "Organization 1",
            },

            photo_path: "/example.com/photo.png",
            action: "closing",
            source: "physical",
            timestamp: new Date(),
        }

        const db = await getDb('lockity_db')
        const collection = db.collection('lockers_logs')

        collection.insertOne(dataToInsert)

        console.log('Test data inserted:', dataToInsert)

        return response.json({
            message: 'Test data inserted successfully',
            data: dataToInsert
        })
    
  }
}