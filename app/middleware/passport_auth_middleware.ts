import type { HttpContext } from '@adonisjs/core/http'
import fs from 'fs'
import path from 'path'
import { jwtVerify } from 'jose'
import User from '#models/user'
import { fileURLToPath } from 'node:url'
import { createPublicKey } from 'crypto'
import { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import { sendErrorResponse } from '../helpers/response.js'
import { JWSSignatureVerificationFailed, JWTClaimValidationFailed, JWTExpired } from 'jose/errors'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PUBLIC_KEY_PATH = path.join(__dirname, '../../config/passport/oauth-public.key')
const PUBLIC_KEY = createPublicKey(fs.readFileSync(PUBLIC_KEY_PATH))

export default class PassportAuthMiddleware {
  public async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendErrorResponse(ctx.response, 401, 'Unauthorized')
    }

    const token = authHeader.split(' ')[1]

    try {
      const { payload } = await jwtVerify(token, PUBLIC_KEY, {
        algorithms: ['RS256'],
      })

      const tokenRecord = await db
        .from('oauth_access_tokens')
        .where('id', payload.jti!)
        .first()

      if(!tokenRecord || tokenRecord.revoked == 1) {
        return sendErrorResponse(ctx.response, 401, 'Unauthorized')
      }

      ctx.passportUser = await User.findByOrFail('id', payload.sub)

      await next()
    } catch (error) {
      if(error instanceof JWTExpired) {
        return sendErrorResponse(ctx.response, 401, 'Token expired')
      }

      if(error instanceof JWTClaimValidationFailed) {
        return sendErrorResponse(ctx.response, 401, 'Invalid token claims')
      }

      if(error instanceof JWSSignatureVerificationFailed) {
        return sendErrorResponse(ctx.response, 401, 'Invalid token signature')
      }

      throw error
    }
  }
}
