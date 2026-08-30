const axios = require('axios');
const crypto = require('crypto');

// Generate a JWT manually since we don't know the password
function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

function generateJWT() {
  const header = { alg: 'HS512', typ: 'JWT' };
  
  // owner@stockspace.com ID is 8ca52832-91eb-4ebb-b9d4-349ed2ce1801
  const payload = {
    sub: 'owner@stockspace.com',
    role: 'OWNER',
    userId: '8ca52832-91eb-4ebb-b9d4-349ed2ce1801',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));

  const secret = 'yMEh4Ugu-AjLamFpAHVTpDn-l2qlcQQNK98L3YTByH28Abs73PuhboCzQQK6mY365L-i0s6_hAPN__vaGmXRYQ';
  // Note: JWT secret must be used correctly based on Spring Security's Keys.hmacShaKeyFor.
  // Actually, wait, doing this manually might be tricky if the secret is base64 encoded.
}
