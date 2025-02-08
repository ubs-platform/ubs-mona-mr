import { JwtConstants } from '@mona/users/consts';
import { hash, cipher, decipher } from 'crypto-promise';

export class CryptoOp {
    public static async encrypt(passwd: string): Promise<string> {
        return (
            await cipher('aes256', JwtConstants.SECRET_PW)(passwd)
        ).toString('hex');
    }
}
