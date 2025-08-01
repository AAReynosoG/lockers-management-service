import { storeMongoLogs } from '#services/mongo_service'
import { SlackService } from './slack_service.js'

class BackgroundLogger {
  private static queue: Array<{ data: any[], timestamp: Date }> = []
  private static isProcessing = false
  private static collectionName = ''
  private static insertMany = true

  static async addLogs(data: any, collectionName: string, insertMany: boolean = true) {
    this.queue.push({
      data: data,
      timestamp: new Date()
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
      } catch (error) {
        await new SlackService().sendExceptionMessage(error, 500)
      }
    }

    this.isProcessing = false
  }

  static getQueueStats() {
    return {
      pending: this.queue.length,
      processing: this.isProcessing
    }
  }
}

export default BackgroundLogger