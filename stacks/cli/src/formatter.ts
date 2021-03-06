import {Asset, Function, MetaData} from "./interface";

export function createFunctionAsset(spec: Function): Asset {
  let asset: Asset = {
    kind: "Function",
    metadata: {name: spec._id} as MetaData,
    spec: spec
  };
  delete asset.spec._id;
  return asset;
}

export function filterFunctionsOnAssets(assets: Asset[]): Asset[] {
  return assets.filter(asset => asset.kind == "Function");
}
