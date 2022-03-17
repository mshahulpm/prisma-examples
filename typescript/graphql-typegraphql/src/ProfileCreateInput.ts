import 'reflect-metadata'
import { ObjectType, ID, Field, InputType } from 'type-graphql'
import { User } from './User'

@InputType()
export class ProfileCreateInput {
    @Field((type) => String, { nullable: true })
    bio: string | null;
}