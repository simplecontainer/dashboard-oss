export function convertToShortGitIdFromArray(hashArray) {
    const hexString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hexString.substring(0, 7);
  }