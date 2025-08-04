import { contactUsValidator } from '#validators/contact_us'
import type { HttpContext } from '@adonisjs/core/http'
import { ResendService } from '#services/resend_service'
import env from '#start/env'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import axios from 'axios'

export default class ContactUsController {
    async contactUsEmail({request, response}: HttpContext) {
        const payload = await request.validateUsing(contactUsValidator)

        const SECRET_KEY = env.get('TURNSTILE_SECRER_KEY')!
        const token = payload.captchaToken
        const ip = request.ip()

        let formData = new FormData()
        formData.append("secret", SECRET_KEY);
        formData.append("response", token);
        formData.append("remoteip", ip);

        const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        const cloudflareResult = await axios.post(url, formData, {
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        })

        if (!cloudflareResult.data.success) {
            return sendErrorResponse(response, 400, 'Captcha verification failed. Please try again.', cloudflareResult.data)
        }


        const text = `
            From: ${payload.name} (${payload.email})
            Message: ${payload.message}
        `

        const emailResult = await new ResendService().sendContactUsEmail(env.get("CONTACT_US_EMAIL")!, 'Custom Support', text)

        if (emailResult && emailResult.error) {
            return sendErrorResponse(response, 500, 'There was an error while sending contact email. Please try again later!')
        }

        return sendSuccessResponse(response, 200, 'Contact message submitted successfully')
    }
}