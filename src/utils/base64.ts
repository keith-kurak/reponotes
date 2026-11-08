// UTF-8 safe base64 helpers.
// The global atob/btoa only handle Latin-1 "binary strings", so text with
// characters such as "é" or emoji must go through UTF-8 bytes first.

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];
    let code: number;
    let extra: number;
    if (byte < 0x80) {
      code = byte;
      extra = 0;
    } else if (byte >= 0xf0) {
      code = byte & 0x07;
      extra = 3;
    } else if (byte >= 0xe0) {
      code = byte & 0x0f;
      extra = 2;
    } else if (byte >= 0xc0) {
      code = byte & 0x1f;
      extra = 1;
    } else {
      // Unexpected continuation byte: emit the replacement character.
      result += "�";
      i += 1;
      continue;
    }
    if (i + extra >= bytes.length) {
      // Truncated multi-byte sequence at the end of the data.
      result += "�";
      break;
    }
    for (let j = 1; j <= extra; j++) {
      code = (code << 6) | (bytes[i + j] & 0x3f);
    }
    result += String.fromCodePoint(code);
    i += extra + 1;
  }
  return result;
}

export function encodeBase64Utf8(text: string): string {
  const bytes = utf8Encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes: number[] = new Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return utf8Decode(bytes);
}
