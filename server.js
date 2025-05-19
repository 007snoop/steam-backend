const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.STEAM_API_KEY;

app.get('/games', async (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: "Missing username" });

    try {
        // 1. Resolve vanity URL
        const resolveResp = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/`, {
            params: {
                key: API_KEY,
                vanityurl: username
            }
        });

        const steamid = resolveResp.data.response.steamid;
        if (!steamid) return res.status(404).json({ error: "Could not resolve user" });

        // 2. Get owned games
        const gamesResp = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/`, {
            params: {
                key: API_KEY,
                steamid,
                include_appinfo: true,
                include_played_free_games: true
            }
        });

        const games = gamesResp.data.response.games || [];
        const formatted = games.map(game => ({
            name: game.name,
            appid: game.appid,
            playtime: game.playtime_forever
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
