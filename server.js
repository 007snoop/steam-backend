const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const { resolveVanityUrl, getOwnedGames } = require("./service");

app.get("/games", async (req, res) => {
	const username = req.query.username;
	if (!username) return res.status(400).json({ error: "Missing username" });
	try {
		let steamid = username;
		if (!/^\d{17}$/.test(username)) {
			steamid = await resolveVanityUrl(username);
			
			if (!steamid)
				return res.status(404).json({ error: "Could not resolve user" });
		}
		

		

		const games = await getOwnedGames(steamid);

		if (!games || !Array.isArray(games)) {
			return res.status(500).json({ error: "Fetch failed" });
		}

		const formatted = games.map((game) => ({
			name: game.name,
			appid: game.appid,
			playtime: game.playtime_forever,
		}));

		res.json(formatted);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
