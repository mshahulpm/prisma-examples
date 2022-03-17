import 'reflect-metadata'
import { ObjectType, Field, ID } from 'type-graphql'
import { IsEmail } from 'class-validator'
import { Post } from './Post'
import { Profile } from './Profile'

@ObjectType()
export class User {
  @Field((type) => ID)
  id: number

  @Field()
  @IsEmail()
  email: string

  @Field((type) => String, { nullable: true })
  name?: string | null

  @Field((type) => [Post], { nullable: true })
  posts?: [Post] | null

  @Field((type) => Profile, { nullable: true })
  profile?: Profile | null
}
