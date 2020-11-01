const pathModule = require('path');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-assetgraph'));
const AssetGraph = require('assetgraph');
const assetgraphRollup = require('../lib/assetgraph-rollup');

describe('assetgraph-rollup', function () {
  it('should bundle a "trivial site"', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'airquote-trivial-site',
        'gridfinder'
      ),
    });

    const [htmlAsset] = await assetGraph.loadAssets('/src/index.html');

    await assetGraph.populate({ followRelations: { crossorigin: false } });

    await assetgraphRollup(assetGraph, htmlAsset);
  });

  it('should bundle assets that are not found on disc', async function () {
    const assetGraph = new AssetGraph();

    assetGraph.addAsset({
      type: 'JavaScript',
      url: 'https://example.com/imported.js',
      text: 'export function foo (){console.log("Hello")}',
    });

    assetGraph.addAsset({
      type: 'JavaScript',
      url: 'https://example.com/entrypoint.js',
      text: 'import { foo } from "./imported.js"; foo();',
    });

    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/index.html',
      text:
        '<!DOCTYPE html><script type="module" src="entrypoint.js"></script>',
    });

    await assetgraphRollup(assetGraph, htmlAsset);

    const bundleJavaScript = htmlAsset.outgoingRelations[0].to;
    expect(bundleJavaScript.text, 'to contain', 'Hello');
  });
});
