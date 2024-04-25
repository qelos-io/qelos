import Blueprint from '../models/blueprint';

export async function getAllBlueprints(req, res) {
  const list = await Blueprint.find({
    tenant: req.headers.tenant,
  })
    .lean()
    .exec()
}

export function getSingleBlueprint(req, res) {

}

export function createBlueprint(req, res) {

}

export function updateBlueprint(req, res) {

}

export function patchBlueprint(req, res) {

}

export function removeBlueprint(req, res) {

}
