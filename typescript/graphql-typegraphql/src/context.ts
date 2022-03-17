import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
}

export const context: Context = {
  prisma: prisma,
}

// prisma.post.create({
//   data: {
//     title: 'Hello World 2',
//     content: 'This is my first post',
//     author: {
//       connect: {
//         email: "shahul@ahah.com"
//       }
//     }
//   }
// })
//   .then(console.log)
//   .catch(console.error)