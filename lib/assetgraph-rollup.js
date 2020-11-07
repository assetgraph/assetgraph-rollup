// Helper for creating a url for an entry point asset that lives in the AssetGraph
// instance. If the entry point is an inline asset, we use the url of the containing
// asset and add #inlinePath=1.2.3... so that we can find the exact asset again
// in the load hook of our rollup plugin:
function createUrl(asset) {
  if (asset.isInline) {
    const inlinePath = [];
    let cursor = asset;
    do {
      const parentAsset = cursor.incomingRelations[0].from;
      inlinePath.push(
        parentAsset.outgoingRelations.findIndex(
          (relation) => relation.to === cursor
        )
      );
      cursor = parentAsset;
    } while (cursor.isInline);
    return `${cursor.url}#inlinePath=${inlinePath.join('.')}`;
  } else {
    return asset.url;
  }
}

module.exports = async function bundleRollup(assetGraph, startAssets) {
  let rollup;
  try {
    rollup = require('rollup');
  } catch (e) {
    throw new Error('Could not find rollup. Please install it in your project');
  }
  if (!Array.isArray(startAssets)) {
    startAssets = [startAssets];
  }

  const incomingRelationsByEntryPointAsset = new Map();
  for (const startAsset of startAssets) {
    if (startAsset.type === 'Html') {
      for (const htmlScript of startAsset.outgoingRelations.filter(
        (relation) =>
          relation.type === 'HtmlScript' &&
          /^module$/i.test(relation.node.getAttribute('type')) &&
          relation.to.isLoaded
      )) {
        const entryPointAsset = htmlScript.to;
        const incomingRelations = incomingRelationsByEntryPointAsset.get(
          entryPointAsset
        );
        if (incomingRelations) {
          incomingRelations.push(htmlScript);
        } else {
          incomingRelationsByEntryPointAsset.set(entryPointAsset, [htmlScript]);
        }
      }
    } else if (startAsset.type === 'JavaScript') {
      incomingRelationsByEntryPointAsset.set(startAsset, []);
    } else {
      throw new Error(`Unsupported start asset type: ${startAsset.type}`);
    }
  }

  const entryPointAssets = [...incomingRelationsByEntryPointAsset.keys()];
  const bundle = await rollup.rollup({
    input: entryPointAssets.map(createUrl),
    plugins: [
      {
        name: 'rollup-plugin-assetgraph', // this name will show up in warnings and errors
        resolveId(id, from) {
          const url = from ? assetGraph.resolveUrl(from, id) : id;
          if (
            assetGraph.findAssets({
              url: url.replace(/#inlinePath=([\d.]*)$/, ''),
            }).length === 1
          ) {
            return url;
          }
          return null; // other ids should be handled as usually
        },
        load(id) {
          const matchInlinePath = id.match(/^(.*)#inlinePath=([\d.]*)$/);
          if (matchInlinePath) {
            id = matchInlinePath[1];
          }
          let asset = assetGraph.findAssets({ url: id })[0];
          if (matchInlinePath) {
            const inlinePath = matchInlinePath[2]
              .split('.')
              .map((fragmentStr) => parseInt(fragmentStr));
            for (const fragment of inlinePath) {
              asset = asset.outgoingRelations[fragment].to;
            }
          }
          const map = asset.sourceMap;
          if (map && map.sources) {
            // rollup messes up urls:
            map.sources = map.sources.map((url) =>
              url.startsWith(assetGraph.root)
                ? url.replace(assetGraph.root, '')
                : url
            );
          }
          if (asset) {
            return {
              code: asset.text,
              map,
            };
          } else {
            return null; // other ids should be handled as usually
          }
        },
      },
    ],
  });

  const { output } = await bundle.generate({
    sourcemap: true,
  });
  for (const [i, chunk] of output.entries()) {
    const entryPointAsset = entryPointAssets[i];
    const url = assetGraph.resolveUrl(
      entryPointAsset ? entryPointAsset.nonInlineAncestor.url : assetGraph.root,
      chunk.fileName
    );

    // rollup rewrites file:/// to file:/ for some reason:
    chunk.map.sources = chunk.map.sources.map((source) =>
      source.replace(/^file:\/{1,3}/, 'file:///')
    );
    const asset = assetGraph.addAsset({
      type: 'JavaScript',
      text: chunk.code,
      sourceMap: chunk.map,
      url,
    });

    const incomingRelations =
      incomingRelationsByEntryPointAsset.get(entryPointAsset) || [];
    for (const htmlScript of incomingRelations) {
      const relation = htmlScript.from.addRelation(
        { type: 'HtmlScript', to: asset, hrefType: htmlScript.hrefType },
        'before',
        htmlScript
      );
      relation.node.setAttribute('type', 'module');
      htmlScript.from.markDirty();
      htmlScript.detach();
    }
  }
};
