import { parseSingleLine } from './nginx-access-log-regex';

describe('parseSingleLine', () => {
  it('parses rest-style nginx access line', () => {
    const line =
      '1.2.3.4 - - [27/Feb/2026:10:00:00 +0000] "GET /wp-login.php HTTP/1.1" 404 162 "-" "curl/8.6.0"';

    const parsed = parseSingleLine(line);

    expect(parsed).toBeDefined();
    expect(parsed?.ip).toBe('1.2.3.4');
    expect(parsed?.isRest).toBe(true);
    expect(parsed?.url).toBe('/wp-login.php');
    expect(parsed?.request).toBe('/wp-login.php');
  });

  it('parses non-rest nginx access line', () => {
    const line =
      '5.6.7.8 - - [27/Feb/2026:10:01:00 +0000] "HEALTHCHECK /" 200 10 "-" "k8s-probe"';

    const parsed = parseSingleLine(line);

    expect(parsed).toBeDefined();
    expect(parsed?.ip).toBe('5.6.7.8');
    expect(parsed?.isRest).toBe(false);
    expect(parsed?.request).toBe('HEALTHCHECK /');
  });

  it('returns undefined for invalid line', () => {
    const parsed = parseSingleLine('invalid log line');
    expect(parsed).toBeUndefined();
  });
});
