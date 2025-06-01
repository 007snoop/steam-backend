const axios = require("axios");

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Retry util
async function Retry(fn, retries = 3, delay = 500) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (e) {
			const isLast = attempt === retries;
			const isRetryable =
				e.response?.status >= 500 || e.code === "CONNECTION ABORTED";

			if (isLast || !isRetryable) throw e;

			console.log(`Attempt ${attempt} Failed. Retrying in ${delay}ms...`);
			// Exponential backoff
			await new Promise((res) => setTimeout(res, delay * attempt));
			if (attempt <= 3) {
				console.log(`Retrying... Attempt ${attempt + 1}`);
			} else {
				console.log(`Max retries reached. Giving up.`);
			}
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
			}
		);

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
			}
		);
		return data.response.games || [];
	});
}

module.exports = {
	resolveVanityUrl,
	getOwnedGames,
};
