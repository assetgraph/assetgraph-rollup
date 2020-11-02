import * as assetgraphIpfs from "assetgraph-ipfs";
import AssetGraph from "assetgraph";

async function main() {
	let g = new AssetGraph({
		root: "src"
	});
	g.javaScriptSerializationOptions = {
		compact: true,
		comment: false,
	};

	await g.loadAssets("*")
		.populate({followRelations: {crossorigin: false}})
	
	await Promise.all([
		g.compressJavaScript(null, "terser", {
			module: true,
			mangleOptions: {
				toplevel: true,
			}
		}),
		...g.findAssets({type: "Css"}).map(a => a.minify()),
		...g.findAssets({type: "Html"}).map(a => {
			a.htmlMinifierOptions = {
				collapseWhitespace: false,
			};
			a.minify();
		}),
	]);

	g.findRelations({to: {protocol: "file:", query: {inline: ""}}})
		.forEach(r => r.inline());

	await assetgraphIpfs.useGateway(g.findAssets({
			protocol: "file:",
			url: { $where: p => !p.startsWith(g.root) }
		}));

	await g.writeAssetsToDisc({url: { $regex: /^file:/ }},  "dist/")
		.writeStatsToStderr();
}

main().catch(console.error);
