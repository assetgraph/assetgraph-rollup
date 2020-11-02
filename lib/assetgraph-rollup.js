module.exports = async function bundleRollup(assetGraph, htmlAsset) {
  let rollup;
  try {
    rollup = require('rollup');
  } catch (e) {
    throw new Error('Could not find rollup. Please install it in your project');
  }
  for (const htmlScript of htmlAsset.outgoingRelations.filter(
    (relation) =>
      relation.type === 'HtmlScript' &&
      /^module$/i.test(relation.node.getAttribute('type'))
  )) {
    const entryPointAsset = htmlScript.to;

    const bundle = await rollup.rollup({
      input: entryPointAsset.url,
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
    for (const chunk of output) {
      const url = assetGraph.resolveUrl(
        entryPointAsset.nonInlineAncestor.url,
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

      if (chunk.fileName === entryPointAsset.fileName) {
        const relation = htmlAsset.addRelation(
          { type: 'HtmlScript', to: asset },
          'before',
          htmlScript
        );
        relation.node.setAttribute('type', 'module');
        htmlAsset.markDirty();
      }
    }
    htmlScript.detach();
  }
};
