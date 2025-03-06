
export function getKeyFromName(newName: string) {
  return newName
    .replace(/ /g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
}

export function getPlural(word: string) {
  const lastChar = word[word.length - 1].toLowerCase();
  if (['x', 'h', 's'].includes(lastChar)) {
    return word + 'es';
  }
  if (lastChar === 'y') {
    return word.substring(0, word.length - 1) + 'ies';
  }
  return word + 's';
}