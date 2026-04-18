const NginxRestRegex =
  /^(?<ip>[\d.]+) - - \[(?<date>[^\]]+)] "(?<method>\w+) (?<url>[^\s]+) (?<protocol>[^"]+)" (?<status>\d{3}) (?<size>\d+) "(?<referrer>[^"]*)" "(?<userAgent>[^"]*)"$/gm;

const NginxNonRestRegex =
  /^(?<ip>[\d.]+) - - \[(?<date>[^\]]+)] "(?<request>[^"]*)" (?<status>\d{3}) (?<size>\d+) "(?<referrer>[^"]*)" "(?<userAgent>[^"]*)"/;

export interface NginxRequestInfo {
  ip: string;
  date: string;
  method?: string;
  request: string;
  url?: string;
  protocol?: string;
  status: string;
  size: string;
  referrer: string;
  userAgent: string;
  isRest: boolean;
}

export const parseSingleLine = (line: string): NginxRequestInfo | undefined => {
  const restTry = new RegExp(NginxRestRegex).exec(line)?.groups;
  if (restTry) {
    return {
      ...restTry,
      request: restTry.url,
      isRest: true,
    } as NginxRequestInfo;
  }

  const nonRestTry = new RegExp(NginxNonRestRegex).exec(line)?.groups;
  if (nonRestTry) {
    return {
      ...nonRestTry,
      isRest: false,
    } as NginxRequestInfo;
  }

  return undefined;
};
