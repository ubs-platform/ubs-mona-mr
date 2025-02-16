import { IFileMetaDto } from './filemeta.dto';

export interface IUserMessageSearch {
  _id?: any;
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
  type?: string;
  phoneNumber?: string;
  summary?: string;
  creationDateLte?: Date;
  creationDateGte?: Date;
  status?: 'WAITING' | 'RESOLVED';
  relatedUrl?: string;
}
