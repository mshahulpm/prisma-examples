import { permissions } from './permissions'
import { jwt_secret, getUserId } from './utils'
import { compare, hash } from 'bcryptjs'
import { applyMiddleware } from 'graphql-middleware'
import { sign } from 'jsonwebtoken'

import {
  intArg,
  makeSchema,
  nonNull,
  objectType,
  stringArg,
  inputObjectType,
  arg,
  asNexusMethod,
  enumType,
} from 'nexus'
import { DateTimeResolver } from 'graphql-scalars'
import { Context } from './context'

export const DateTime = asNexusMethod(DateTimeResolver, 'date')

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('allUsers', {
      type: 'User',
      resolve: (_parent, _args, context: Context) => {
        console.log(_parent, _args)
        return context.prisma.user.findMany()
      },
    })

    t.nullable.field('me', {
      type: 'User',
      resolve: (parent, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.user.findUnique({
          where: {
            id: Number(userId),
          },
        })
      }
    })

    t.nullable.field('postById', {
      type: 'Post',
      args: {
        id: intArg(),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.post.findUnique({
          where: { id: args.id || undefined },
        })
      },
    })

    t.nonNull.list.nonNull.field('feed', {
      type: 'Post',
      args: {
        searchString: stringArg(),
        skip: intArg(),
        take: intArg(),
        orderBy: arg({
          type: 'PostOrderByUpdatedAtInput',
        }),
      },
      resolve: (_parent, args, context: Context) => {
        const or = args.searchString
          ? {
            OR: [
              { title: { contains: args.searchString } },
              { content: { contains: args.searchString } },
            ],
          }
          : {}

        return context.prisma.post.findMany({
          where: {
            published: true,
            ...or,
          },
          take: args.take || undefined,
          skip: args.skip || undefined,
          orderBy: args.orderBy || undefined,
        })
      },
    })

    t.list.field('draftsByUser', {
      type: 'Post',
      args: {
        userUniqueInput: nonNull(
          arg({
            type: 'UserUniqueInput',
          }),
        ),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: {
              id: args.userUniqueInput.id || undefined,
              email: args.userUniqueInput.email || undefined,
            },
          })
          .posts({
            where: {
              published: false,
            },
          })
      },
    })

    t.list.field('AllSample', {
      type: 'Sample',
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.sample.findMany()
      }
    })

    t.field('sampleById', {
      type: 'Sample',
      args: {
        id: nonNull(intArg())
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.sample.findUnique({
          where: { id: args.id }
        })
      }
    })

  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signup', {
      type: 'AuthPayload',
      args: {
        name: stringArg(),
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_, args, context: Context) => {

        const hashedPassword = await hash(args.password, 10)

        const user = await context.prisma.user.create({
          data: {
            name: args.name,
            email: args.email,
            password: hashedPassword,
          },
        })
        return {
          token: sign({ userId: user.id }, jwt_secret),
          user
        }
      },
    })

    t.field('login', {
      type: 'AuthPayload',
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg())
      },
      resolve: async (_parent, _args, context: Context) => {
        console.log(_args)
        const user = await context.prisma.user.findUnique({
          where: {
            email: _args.email
          }
        })
        console.log(user)
        if (!user) {
          throw new Error('No user found')
        }
        const passwordValid = await compare(_args.password, user.password)
        if (!passwordValid) {
          throw new Error('Invalid password')
        }
        return {
          token: sign({ userId: user.id }, jwt_secret),
          user
        }
      }
    })

    t.field('createDraft', {
      type: 'Post',
      args: {
        data: nonNull(
          arg({
            type: 'PostCreateInput',
          }),
        ),
        authorEmail: nonNull(stringArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.create({
          data: {
            title: args.data.title,
            content: args.data.content,
            author: {
              connect: { email: args.authorEmail },
            },
          },
        })
      },
    })

    t.field('togglePublishPost', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_, args, context: Context) => {
        try {
          const post = await context.prisma.post.findUnique({
            where: { id: args.id || undefined },
            select: {
              published: true,
            },
          })
          return context.prisma.post.update({
            where: { id: args.id || undefined },
            data: { published: !post?.published },
          })
        } catch (e) {
          throw new Error(
            `Post with ID ${args.id} does not exist in the database.`,
          )
        }
      },
    })

    t.field('incrementPostViewCount', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.update({
          where: { id: args.id || undefined },
          data: {
            viewCount: {
              increment: 1,
            },
          },
        })
      },
    })

    t.field('deletePost', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.delete({
          where: { id: args.id },
        })
      },
    })

    t.field('addProfileForUser', {
      type: 'Profile',
      args: {
        userUniqueInput: nonNull(
          arg({
            type: 'UserUniqueInput',
          }),
        ),
        bio: stringArg()
      },
      resolve: async (_, args, context) => {
        return context.prisma.profile.create({
          data: {
            bio: args.bio,
            user: {
              connect: {
                id: args.userUniqueInput.id || undefined,
                email: args.userUniqueInput.email || undefined,
              }
            }
          }
        })
      }
    })

    t.field('addNewSample', {
      type: 'Sample',
      args: {
        data: nonNull(arg({
          type: 'CreateSampleInput'
        }))
      },
      resolve: async (_, args, context) => {
        return await context.prisma.sample.create({
          data: args.data
        })
      }
    })

  },
})


const AuthPayload = objectType({
  name: 'AuthPayload',
  definition(t) {
    t.string('token')
    t.field('user', { type: 'User' })
  }
})

const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.string('name')
    t.nonNull.string('email')
    t.nonNull.list.nonNull.field('posts', {
      type: 'Post',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .posts()
      },
    }),
      t.field('profile', {
        type: 'Profile',
        resolve: (parent, _, context) => {
          return context.prisma.user.findUnique({
            where: { id: parent.id }
          }).profile()
        }
      })
  },
})

const Post = objectType({
  name: 'Post',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.string('title')
    t.string('content')
    t.nonNull.boolean('published')
    t.nonNull.int('viewCount')
    t.field('author', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.post
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .author()
      },
    })
  },
})

const SortOrder = enumType({
  name: 'SortOrder',
  members: ['asc', 'desc'],
})

const PostOrderByUpdatedAtInput = inputObjectType({
  name: 'PostOrderByUpdatedAtInput',
  definition(t) {
    t.nonNull.field('updatedAt', { type: 'SortOrder' })
  },
})

const UserUniqueInput = inputObjectType({
  name: 'UserUniqueInput',
  definition(t) {
    t.int('id')
    t.string('email')
  },
})

const CreateSampleInput = inputObjectType({
  name: 'CreateSampleInput',
  definition(t) {
    t.nonNull.string('name')
    t.nonNull.int('age')
  }
})

const PostCreateInput = inputObjectType({
  name: 'PostCreateInput',
  definition(t) {
    t.nonNull.string('title')
    t.string('content')
  },
})

const UserCreateInput = inputObjectType({
  name: 'UserCreateInput',
  definition(t) {
    t.nonNull.string('email')
    t.string('name')
    t.list.nonNull.field('posts', { type: 'PostCreateInput' })
  },
})

const Profile = objectType({
  name: 'Profile',
  definition(t) {
    t.nonNull.int('id')
    t.string('bio')
    t.field('user', {
      type: 'User',
      resolve: (parent, _, context) => {
        return context.prisma.profile
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .user()
      },
    })
  },
})

const Sample = objectType({
  name: 'Sample',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.int('age')
  }
})

const schemaWithoutPermissions = makeSchema({
  types: [
    Query,
    Mutation,
    Post,
    User,
    Profile,
    AuthPayload,
    Sample,
    UserUniqueInput,
    UserCreateInput,
    PostCreateInput,
    CreateSampleInput,
    SortOrder,
    PostOrderByUpdatedAtInput,
    DateTime,
  ],
  outputs: {
    schema: __dirname + '/../schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@prisma/client',
        alias: 'prisma',
      },
    ],
  },
})


export const schema = applyMiddleware(schemaWithoutPermissions, permissions)