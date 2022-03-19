import { verify } from 'jsonwebtoken'
import { Context } from './context'

export const jwt_secret = 'appsecret321akiak82727'

interface Token {
    userId: string
}

export function getUserId(context: Context) {
    const authHeader = context.req.get('Authorization')
    if (authHeader) {
        const token = authHeader.split(' ')[1]
        const verifiedToken = verify(token, jwt_secret) as Token
        return verifiedToken && Number(verifiedToken.userId)
    }
}

