import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import path from 'path'
import { SlackService } from '#services/slack_service'

export class BackgroundNotificationService {
  private static isInitialized = false

  constructor() {
    this.initializeFirebase()
  }

  private async initializeFirebase() {
    if (!BackgroundNotificationService.isInitialized) {
      try {
        const serviceAccountPath = path.resolve('../../config/fcm/lockity-7d75a-firebase-adminsdk-fbsvc-e090882ea5.json')
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })

        BackgroundNotificationService.isInitialized = true
      } catch (error) {
        await new SlackService().sendExceptionMessage(error, 500)
      }
    }
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    if (deviceTokens.length === 0) {
      throw new Error('No device tokens provided')
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: deviceTokens,
    }

    try {
      const response = await admin.messaging().sendEachForMulticast(message)
      
      const failedTokens: string[] = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${deviceTokens[idx]}:`, resp.error)
          failedTokens.push(deviceTokens[idx])
        }
      })

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      }
    } catch (error) {
      await new SlackService().sendExceptionMessage(error, 500)
    }
  }

  async sendToSingleDevice(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: deviceToken,
    }

    try {
      const response = await admin.messaging().send(message)
      return response
    } catch (error) {
      await new SlackService().sendExceptionMessage(error, 500)
    }
  }

  async sendToUserDevices(userId: number, title: string, body: string, data?: Record<string, string>) {
    const { default: DeviceToken } = await import('#models/device_token')
    
    const userTokens = await DeviceToken.query()
      .where('userId', userId)
      .select('deviceToken')

    if (userTokens.length === 0) {
      throw new Error('No device tokens found for user')
    }

    const tokens = userTokens.map(token => token.deviceToken)
    return this.sendToMultipleDevices(tokens, title, body, data)
  }
}