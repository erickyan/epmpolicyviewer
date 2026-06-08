// CyberArk EPM exports are frequently generated on Windows and can be UTF-16
// (LE/BE) with a byte-order mark, or UTF-8 with a BOM. Blindly calling
// buffer.toString("utf-8") on those corrupts the content and makes the XML
// parser throw, so we detect the BOM and decode accordingly.
export const decodeXmlBuffer = (buffer: Buffer): string => {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le")
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    // UTF-16 BE: swap byte pairs into LE, then decode.
    const swapped = Buffer.from(buffer.subarray(2))
    swapped.swap16()
    return swapped.toString("utf16le")
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.subarray(3).toString("utf-8")
  }

  return buffer.toString("utf-8")
}
