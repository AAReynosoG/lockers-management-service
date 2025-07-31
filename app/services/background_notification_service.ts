import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SlackService } from '#services/slack_service'
import { createClient } from '@supabase/supabase-js'
import env from '#start/env'
import { Buffer } from 'buffer'

const supabaseUrl = env.get('SUPABASE_URL')!
const supabaseKey = env.get('SUPABASE_API_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class BackgroundNotificationService {
  private static isInitialized = false
  private static initializationPromise: Promise<void> | null = null
  
  constructor() {

  }

  private static async initializeFirebase() {
    if (this.isInitialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = (async () => {
      try {
        const serviceAccountPath = path.join(__dirname, '../../config/fcm/lockity-7d75a-firebase-adminsdk-fbsvc-e090882ea5.json')        
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })

        this.isInitialized = true
      } catch (error) {
        await new SlackService().sendExceptionMessage(error, 500)
      }
    })()

    return this.initializationPromise
  }

  private async uploadTemporaryImage(imageBase64: string, serialNumber: string): Promise<string | null> {
    try {
      const buffer = Buffer.from(imageBase64, 'base64')
      const fileName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
      const filePath = `temp-notifications/${serialNumber}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('lockity-images')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) {
        console.error('Error uploading temporary image:', error)
        return null
      }

      const { data: signedUrl } = await supabase.storage
        .from('lockity-images')
        .createSignedUrl(data.path, 600)

      this.scheduleImageDeletion(data.path, 15 * 60 * 1000)

      return signedUrl?.signedUrl || null
    } catch (error) {
      await new SlackService().sendExceptionMessage(error, 500)
      return null
    }
  }

  private scheduleImageDeletion(filePath: string, delayMs: number) {
    setTimeout(async () => {
      try {
        await supabase.storage
          .from('lockity-images')
          .remove([filePath])
      } catch (error) {
        await new SlackService().sendExceptionMessage(error, 500)
      }
    }, delayMs)
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    imageBase64?: string
  ) {

    await BackgroundNotificationService.initializeFirebase()

    if (deviceTokens.length === 0) {
      throw new Error('No device tokens provided')
    }

    let imageUrl: string | undefined

    if (imageBase64) {
      const serialNumber = data?.serialNumber || 'unknown'
      imageUrl = await this.uploadTemporaryImage(imageBase64, serialNumber) || undefined
    }

    const message: any = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl })
      },
      data: {
        ...data,
        ...(imageUrl && { image_url: imageUrl })
      },
      tokens: deviceTokens,
    }

    if (imageUrl) {
      message.android = {
        notification: {
          imageUrl: imageUrl
        }
      }
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
        imageUrl
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

    await BackgroundNotificationService.initializeFirebase()

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
    
    await BackgroundNotificationService.initializeFirebase()
    
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