import 'reflect-metadata'
import { ObjectType, Field, ID } from 'type-graphql'
import { User } from './User'

@ObjectType()
export class Profile {
    @Field((type) => ID)
    id: number;
    @Field((type) => User, { nullable: true })
    user: User | null;
    @Field((type) => String, { nullable: true })
    bio: string | null;
}