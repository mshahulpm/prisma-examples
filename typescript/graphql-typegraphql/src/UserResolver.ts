import 'reflect-metadata'
import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  FieldResolver,
  Root,
  Int,
  InputType,
  Field,
} from 'type-graphql'
import { Post } from './Post'
import { User } from './User'
import { Context } from './context'
import { PostCreateInput } from './PostResolver'
import { ProfileCreateInput } from './ProfileCreateInput'
import { Profile } from './Profile'
@InputType()
class UserUniqueInput {
  @Field({ nullable: true })
  id: number

  @Field({ nullable: true })
  email: string
}

@InputType()
class UserCreateInput {
  @Field()
  email: string

  @Field({ nullable: true })
  name: string

  @Field((type) => [PostCreateInput], { nullable: true })
  posts: [PostCreateInput]

  @Field((type) => ProfileCreateInput, { nullable: true })
  profile?: ProfileCreateInput | null;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver()
  async posts(@Root() user: User, @Ctx() ctx: Context): Promise<Post[]> {
    return ctx.prisma.user
      .findUnique({
        where: {
          id: user.id,
        },
      })
      .posts()
  }

  @FieldResolver()
  async profile(@Root() user: User, @Ctx() ctx: Context): Promise<Profile | null> {
    return (await ctx.prisma.user
      .findUnique({
        where: {
          id: user.id,
        }
      }).profile()) as Profile | null
  }

  @Mutation((returns) => User)
  async signupUser(
    @Arg('data') data: UserCreateInput,
    @Ctx() ctx: Context,
  ): Promise<User> {
    const postData = data.posts?.map((post) => {
      return { title: post.title, content: post.content || undefined }
    })

    return ctx.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        posts: {
          create: postData,
        },
        profile: {
          create: {
            bio: data.profile?.bio
          }
        }
      },
    })
  }

  @Query(() => [User])
  async allUsers(@Ctx() ctx: Context) {
    return ctx.prisma.user.findMany()
  }

  @Query((returns) => [Post], { nullable: true })
  async draftsByUser(
    @Arg('userUniqueInput') userUniqueInput: UserUniqueInput,
    @Ctx() ctx: Context,
  ) {
    return ctx.prisma.user
      .findUnique({
        where: {
          id: userUniqueInput.id || undefined,
          email: userUniqueInput.email || undefined,
        },
      })
      .posts({
        where: {
          published: false,
        },
      })
  }

  @Query((returns) => User, { nullable: true })
  async getOneUser(
    @Arg('email') email: string,
    @Ctx() ctx: Context,
  ) {
    return ctx.prisma.user.findUnique({
      where: {
        email
      },
    })
  }


}
