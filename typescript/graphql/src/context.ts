import { PrismaClient } from '@prisma/client'

export interface Context {
  prisma: PrismaClient,
  req: any
}

const prisma = new PrismaClient()

export function createContext(req: any) {
  return {
    ...req,
    prisma
  }
}