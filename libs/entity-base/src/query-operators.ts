export interface QueryOperator {
  __op: 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'between';
  val: any;
}

export const QueryOperators = {
  In: (val: any[]): QueryOperator => ({ __op: 'in', val }),
  GreaterThan: (val: any): QueryOperator => ({ __op: 'gt', val }),
  GreaterThanOrEqual: (val: any): QueryOperator => ({ __op: 'gte', val }),
  LessThan: (val: any): QueryOperator => ({ __op: 'lt', val }),
  LessThanOrEqual: (val: any): QueryOperator => ({ __op: 'lte', val }),
  Like: (val: string): QueryOperator => ({ __op: 'like', val }),
  Between: (from: any, to: any): QueryOperator => ({ __op: 'between', val: [from, to] }),
};

export function isQueryOperator(val: any): val is QueryOperator {
  return val && typeof val === 'object' && '__op' in val;
}

export function parseMongoQuery(query: any): any {
  if (!query || typeof query !== 'object') return query;
  if (Array.isArray(query)) {
    return query.map(parseMongoQuery);
  }
  const result: any = {};
  for (const key of Object.keys(query)) {
    const val = query[key];
    if (isQueryOperator(val)) {
      switch (val.__op) {
        case 'in':
          result[key] = { $in: val.val };
          break;
        case 'gt':
          result[key] = { $gt: val.val };
          break;
        case 'gte':
          result[key] = { $gte: val.val };
          break;
        case 'lt':
          result[key] = { $lt: val.val };
          break;
        case 'lte':
          result[key] = { $lte: val.val };
          break;
        case 'like':
          result[key] = { $regex: new RegExp(val.val, 'i') };
          break;
        case 'between':
          result[key] = { $gte: val.val[0], $lte: val.val[1] };
          break;
        default:
          result[key] = val;
      }
    } else if (val && typeof val === 'object' && !(val instanceof Date) && !(val instanceof RegExp)) {
      result[key] = parseMongoQuery(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function parseSqlQuery(query: any, typeormOperators: any): any {
  if (!query || typeof query !== 'object') return query;
  if (Array.isArray(query)) {
    return query.map(q => parseSqlQuery(q, typeormOperators));
  }
  const result: any = {};
  for (const key of Object.keys(query)) {
    const val = query[key];
    if (isQueryOperator(val)) {
      switch (val.__op) {
        case 'in':
          result[key] = typeormOperators.In(val.val);
          break;
        case 'gt':
          result[key] = typeormOperators.MoreThan(val.val);
          break;
        case 'gte':
          result[key] = typeormOperators.MoreThanOrEqual(val.val);
          break;
        case 'lt':
          result[key] = typeormOperators.LessThan(val.val);
          break;
        case 'lte':
          result[key] = typeormOperators.LessThanOrEqual(val.val);
          break;
        case 'like':
          result[key] = typeormOperators.Like(val.val);
          break;
        case 'between':
          result[key] = typeormOperators.Between(val.val[0], val.val[1]);
          break;
        default:
          result[key] = val;
      }
    } else if (val && typeof val === 'object' && !(val instanceof Date) && !(val instanceof RegExp)) {
      result[key] = parseSqlQuery(val, typeormOperators);
    } else {
      result[key] = val;
    }
  }
  return result;
}
