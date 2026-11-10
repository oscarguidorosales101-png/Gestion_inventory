import { pbkdf2Sync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const PENDING_MARKER = 'PENDIENTE_INICIALIZACION_SEGURA';

/**
 * Genera un hash seguro utilizando PBKDF2-SHA512 con 100.000 iteraciones y sal criptografica de 32 bytes.
 * Formato resultante: pbkdf2_sha512$iteraciones$salt_hex$hash_hex
 */
export function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length < 8) {
    throw new Error('La contrasena debe tener al menos 8 caracteres.');
  }
  const salt = randomBytes(32).toString('hex');
  const derivedKey = pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2_sha512$${PBKDF2_ITERATIONS}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Comprueba una contrasena contra un hash almacenado.
 * Retorna false de forma segura si el hash es el marcador de pendiente o si esta malformado.
 */
export function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || storedHash === PENDING_MARKER || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha512') {
    return false;
  }
  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const expectedHash = parts[3];

  if (!iterations || !salt || !expectedHash) return false;

  const derivedKey = pbkdf2Sync(plainPassword, salt, iterations, Buffer.from(expectedHash, 'hex').length, PBKDF2_DIGEST);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (derivedKey.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derivedKey, expectedBuffer);
}

/**
 * Comprueba si un hash almacenado indica cuenta pendiente de inicializacion.
 */
export function isPendingInitialization(storedHash) {
  return storedHash === PENDING_MARKER;
}

/**
 * Genera un token JWT simple firmado con HMAC-SHA256 usando el secreto del entorno.
 */
export function createToken(payload, secret, expiresInSeconds = 8 * 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };
  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');

  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Verifica y decodifica un token JWT. Retorna el payload o null si es invalido o expiro.
 */
export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payloadEncoded, signature] = parts;
  const expectedSignature = createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Comparacion en tiempo constante para cadenas (ej. X-Integration-Key).
 */
export function safeEqual(strA, strB) {
  if (typeof strA !== 'string' || typeof strB !== 'string') return false;
  const bufA = Buffer.from(strA);
  const bufB = Buffer.from(strB);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

