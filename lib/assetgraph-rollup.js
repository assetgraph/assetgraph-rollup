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
    input: entryPointAssets.map((entryPointAsset) => entryPointAsset.url),
    plugins: [
      {
        name: 'rollup-plugin-assetgraph', // this name will show up in warnings and errors
        resolveId(source, from) {
          const url = from ? assetGraph.resolveUrl(from, source) : source;
          if (assetGraph.findAssets({ url }).length === 1) {
            return url;
          }
          return null; // other ids should be handled as usually
        },
        load(id) {
          const asset = assetGraph.findAssets({ url: id })[0];
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
      if (chunk.fileName === entryPointAsset.fileName) {
        const relation = htmlScript.from.addRelation(
          { type: 'HtmlScript', to: asset },
          'before',
          htmlScript
        );
        relation.node.setAttribute('type', 'module');
        htmlScript.from.markDirty();
      }
      htmlScript.detach();
    }
  }
};
