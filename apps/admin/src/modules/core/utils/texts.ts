
export function getKeyFromName(newName: string) {
  return newName
    .replace(/ /g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
}