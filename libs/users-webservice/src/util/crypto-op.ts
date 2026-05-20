import { JwtConstants } from '@ubs-platform/users-consts';
import { hash, cipher, decipher } from 'crypto-promise';
import * as Bcrypt from 'bcrypt';

export class CryptoOp {
    public static async encryptPassword(passwd: string): Promise<string> {
        const saltRounds = 10;
        return await Bcrypt.hash(passwd, saltRounds);
        // return (
        //     await cipher('aes256', JwtConstants.SECRET_PW)(passwd)
        // ).toString('hex');
    }

    public static async checkPassword(
        passwd: string,
        hash: string,
    ): Promise<boolean> {
        return await Bcrypt.compare(passwd, hash);
        // return (
        //     await cipher('aes256', JwtConstants.SECRET_PW)(passwd)
        // ).toString('hex');
    }
}
