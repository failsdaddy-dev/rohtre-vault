// Cloudinary API signing, as pure functions (Web Crypto only), so the unit
// tests can check them against Cloudinary's own worked examples.
//
// API (upload, destroy) signature:
//   sort the signed params by name, join as "k=v&k=v", append the API secret,
//   SHA-1, hex. Every param is signed except file, cloud_name, resource_type,
//   api_key. Valid for one hour from `timestamp`.
//   verified: https://cloudinary.com/documentation/authentication_signatures

const enc = new TextEncoder();

async function sha1(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-1", enc.encode(text)));
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export type Params = Record<string, string | number | boolean>;

export function stringToSign(params: Params): string {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "" && !["file", "cloud_name", "resource_type", "api_key"].includes(k))
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export async function apiSignature(params: Params, secret: string): Promise<string> {
  return hex(await sha1(stringToSign(params) + secret));
}
