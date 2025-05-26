const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Retry util
async function Retry(fn, retries = 3, delay = 500) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (e) {
			const isLast = attempt === retries;
			const isRetryable = e.response?.status >= 500 || e.code === "CONNECTION ABORTED";

			if (isLast || !isRetryable) throw e;
			
			
			console.log(`Attempt ${attempt} Failed. Retrying in ${delay}ms...`);
			await new Promise(res => setTimeout(res, delay));
		}
	}
}

async function resolveVanityUrl(vanityName) {
	return Retry(async () => {
		const { data } = await axios.get(
				`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/`,
				{
					params: {
						key: STEAM_API_KEY,
						vanityurl: vanityName,
					},
				});

				if (data.response.success !== 1) return null;
			return data.response.steamid;
	});
}

async function getOwnedGames(steamid) {
	return Retry(async () => {
		const { data } = await axios.get(
			`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/`,
			{
				params: {
					key: STEAM_API_KEY,
					steamid,
					include_appinfo: true,
					include_played_free_games: true,
				},
			});
			return data.response.games || [];
	});
}

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
