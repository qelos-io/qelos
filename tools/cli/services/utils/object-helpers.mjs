/**
 * Removes the _id property from an object
 * @param {Object} obj - The object to remove _id from
 * @returns {Object} - The object without _id
 */
export function removeIdFromObject(obj) {
  const { _id, ...rest } = obj;
  return rest;
}
