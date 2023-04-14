/**
 * Creates a HTML compatible UUID.
 *
 * @returns a UUID as string prefixed with "id-"
 */
export function htmlRandomUUID(): string {
    // prefix required since the string returned by randomUUID()
    // can start with digits which are not allowed for HTML IDs.
    // see: https://www.w3.org/TR/html4/types.html#type-id
    const safePrefix = "id-";

    return safePrefix + randomUUID();
}

//==============================================================================

/**
 * Create a UUID.
 *
 * It tries to use crypto.randomUUID() and if that's not available falls back
 * to a naive Math.random() based implementation.
 *
 * @returns a UUID as string
 */
export function randomUUID(): string {
    // only available in secure context
    // see: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
    if (typeof crypto?.randomUUID !== "undefined") {
        return crypto.randomUUID();
    }

    return naiveRandomUUID();
}

//==============================================================================

/**
 * Creates simple Math.random() based UUIDs (containing only a-z,A-Z,0-9).
 * (It might be not suitable for security related issues.)
 *
 * @param segments - number of segments
 * @param segmentLength - number of characters per segment
 *
 * @returns string made out N segments of the given lenght concatenated by '-'
 */
function naiveRandomUUID(segments = 4, segmentLength = 6): string {
    const uuids: string[] = [];
    for (let i = 0; i < segments; i++) {
        uuids.push(randomSimpleString(segmentLength));
    }

    return uuids.join("-");
}

/**
 * Creates Math.random() based strings (containing only a-z,A-Z,0-9).
 *
 * @param length - of string to be created
 * @returns string of given length containing only the characters a-z,A-Z,0-9
 */
function randomSimpleString(length: number): string {
    const allowedChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "abcdefghijklmnopqrstuvwxyz" +
        "01234567890";

    let result = "";
    for (let i = 0; i < length; i++) {
        const randomInt = randomUnsignedInt();
        const index = randomInt % allowedChars.length;
        result += allowedChars[index];
    }

    return result;
}

/**
 * Creates a random unsigned integer between 0 and Number.MAX_SAFE_INTEGER using Math.random().
 *
 * @returns random unsigned integer between 0 and Number.MAX_SAFE_INTEGER
 */
function randomUnsignedInt(): number {
    const randomUnsignedInt = Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER);

    return randomUnsignedInt;
}

//==============================================================================
