import { storeMongoLogs } from '#services/mongo_service'
import { SlackService } from './slack_service.js'
import { BackgroundNotificationService } from '#services/background_notification_service'
import { createClient } from '@supabase/supabase-js'
import env from '#start/env'

const supabaseUrl = env.get('SUPABASE_URL')!
const supabaseKey = env.get('SUPABASE_API_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

interface LogWithNotification {
  data: any[]
  timestamp: Date
  shouldSendNotifications?: boolean
  serialNumber?: string
}

export default class UnifiedBackgroundProcessor {
  private static queue: Array<LogWithNotification> = []
  private static isProcessing = false
  private static collectionName = ''
  private static insertMany = true

  static async addLogs(
    data: any, 
    collectionName: string, 
    insertMany: boolean = true, 
    shouldSendNotifications: boolean = false,
    serialNumber?: string
  ) {
    this.queue.push({
      data: data,
      timestamp: new Date(),
      shouldSendNotifications,
      serialNumber
    })

    if (!this.isProcessing) {
        this.insertMany = insertMany
        this.collectionName = collectionName
        setImmediate(() => this.processQueue())
    }
  }

  private static async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0) {
      const logBatch = this.queue.shift()!
      
      try {
        await storeMongoLogs(this.insertMany, this.collectionName, logBatch.data)
        
        if (logBatch.shouldSendNotifications && logBatch.serialNumber) {
          await this.processNotifications(logBatch.data, logBatch.serialNumber)
        }
      } catch (error) {
        await new SlackService().sendExceptionMessage(error, 500)
      }
    }

    this.isProcessing = false
  }

  private static async processNotifications(logs: any[], serialNumber: string) {
    try {
      const { default: Locker } = await import('#models/locker')
      
      const locker = await Locker.query()
        .where('serial_number', serialNumber)
        .preload('accessPermissions', (apQuery) => {
          apQuery.preload('user', (userQuery) => {
            userQuery.preload('deviceTokens')
          })
        })
        .first()

      if (!locker) return

      const allDeviceTokens: string[] = []
      locker.accessPermissions.forEach(permission => {
        permission.user.deviceTokens.forEach(deviceToken => {
          allDeviceTokens.push(deviceToken.deviceToken)
        })
      })

      if (allDeviceTokens.length === 0) return

      const notificationService = new BackgroundNotificationService()

      for (const log of logs) {
        await this.sendNotificationForLog(log, locker, allDeviceTokens, notificationService)
      }
    } catch (error) {
      await new SlackService().sendExceptionMessage(error, 500)
    }
  }

  private static async sendNotificationForLog(
    log: any, 
    locker: any, 
    deviceTokens: string[], 
    notificationService: BackgroundNotificationService
  ) {
    try {
      const { action, locker: logLocker, photo_path } = log
      const compartmentNumber = logLocker?.manipulated_compartment

      const actionMessages = {
        opening: 'was opened',
        closing: 'was closed',
        failed_attempt: 'had a failed opening attempt'
      }

      const message = actionMessages[action as keyof typeof actionMessages]
      if (!message) return

      const title = 'Locker Activity Alert'
      const body = `Hey! Compartment ${compartmentNumber} of locker ${locker.serialNumber} ${message}`
      
      const notificationData = {
        lockerId: locker.id.toString(),
        serialNumber: locker.serialNumber,
        compartmentNumber: compartmentNumber?.toString() || '',
        action: action,
        type: 'compartment_activity'
      }

      let imageBase64: string | undefined
      if (photo_path) {
        imageBase64 = await this.getImageAsBase64(photo_path)
      }

      await notificationService.sendToMultipleDevices(
        deviceTokens,
        title,
        body,
        notificationData,
        imageBase64
      )
    } catch (error) {
      await new SlackService().sendExceptionMessage(error, 500)
    }
  }

  private static async getImageAsBase64(photoPath: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase.storage
        .from('lockity-images')
        .download(photoPath)

      if (error || !data) return undefined

      const arrayBuffer = await data.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      return buffer.toString('base64')
    } catch (error) {
      await new SlackService().sendExceptionMessage(error, 500)
      return undefined
    }
  }

  static getQueueStats() {
    return {
      pending: this.queue.length,
      processing: this.isProcessing
    }
  }
}