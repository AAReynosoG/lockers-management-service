// En app/services/locker_numbering_service.ts
import Locker from '#models/locker'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export class LockerNumberingService {
  
  static async assignNextNumber(
    lockerId: number, 
    areaId: number, 
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = Locker.query()
      .where('area_id', areaId)
      .where('id', '!=', lockerId)
      .orderBy('locker_number', 'asc')

    if (trx) {
      query.useTransaction(trx)
    }

    const existingNumbers = (await query.select('locker_number')).map(l => l.lockerNumber)

    let nextNumber = 1
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++
      } else {
        break 
      }
    }

    return nextNumber
  }

  static async assignFirstNumber(areaId: number, trx?: TransactionClientContract): Promise<number> {
    const query = Locker.query()
      .where('area_id', areaId)
      .orderBy('locker_number', 'asc')

    if (trx) {
      query.useTransaction(trx)
    }

    const existingNumbers = (await query.select('locker_number')).map(l => l.lockerNumber)

    let nextNumber = 1
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++
      } else {
        break
      }
    }

    return nextNumber
  }
}