const urlTools = require('urltools');

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
      input: urlTools.fileUrlToFsPath(entryPointAsset.url),
    });

    const { output } = await bundle.generate({});
    for (const chunk of output) {
      const url = assetGraph.resolveUrl(
        entryPointAsset.nonInlineAncestor.url,
        chunk.fileName
      );

      const asset = assetGraph.addAsset({
        type: 'JavaScript',
        text: chunk.code,
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
