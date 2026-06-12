import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IBaseEntity } from '@ubs-platform/users-entity-common';

@Entity('users')
export class UserEntity implements IBaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column({ nullable: true })
    passwordEncyripted: string;

    @Column()
    primaryEmail: string;

    @Column()
    name: string;

    @Column()
    surname: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    district: string;

    @Column({ nullable: true })
    gender: string;

    @Column({ nullable: true })
    pronounce: string;

    @Column('simple-array', { nullable: true })
    roles: string[];

    @Column('simple-array', { nullable: true })
    webSites: string[];

    @Column({ default: false })
    active: boolean;

    @Column({ default: false })
    suspended: boolean;

    @Column({ nullable: true })
    suspendReason: string;

    @Column({ nullable: true })
    activationKey?: string;

    @Column({ type: 'timestamp', nullable: true })
    activationExpireDate?: Date | null;

    @Column({ default: '' })
    localeCode: string;

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}
