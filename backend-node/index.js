const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse incoming JSON bodies

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

/**
 * Retrieves a temporary Access Token from Spotify API.
 * This token is required to make any search requests.
 */
async function getSpotifyToken() {
    try {
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials', 
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching Spotify token:", error.message);
        throw new Error("Failed to authenticate with Spotify");
    }
}

/**
 * Searches Spotify for a specific track and artist, returning its metadata.
 */
async function searchSpotifyTrack(title, artist, token) {
    try {
        // Encode the query to handle spaces and special characters safely
        const query = encodeURIComponent(`track:${title} artist:${artist}`);
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const tracks = response.data.tracks.items;
        
        // If Spotify found the song, extract the useful data
        if (tracks.length > 0) {
            const track = tracks[0];
            return {
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                spotify_uri: track.uri,
                cover_url: track.album.images[0]?.url || null,
                preview_url: track.preview_url // 30-second audio preview (can be null for some tracks)
            };
        }

        // Fallback if the song was not found on Spotify
        return {
            title: title,
            artist: artist,
            spotify_uri: null,
            cover_url: null,
            preview_url: null,
            note: "Track not found on Spotify"
        };

    } catch (error) {
        console.error(`Error searching for ${title} by ${artist}:`, error.message);
        return null;
    }
}

/**
 * Utility function to create a delay
 * @param {number} ms - Milliseconds to wait
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * MAIN ENDPOINT: Receives the AI-generated setlist and enriches it sequentially to avoid rate limits.
 */
app.post('/api/enrich-setlist', async (req, res) => {
    try {
        const { vibe_name, dj_intro, songs, dj_outro } = req.body;

        // Basic validation
        if (!songs || !Array.isArray(songs)) {
            return res.status(400).json({ error: "Invalid payload: 'songs' array is required." });
        }

        console.log(`Enriching setlist: "${vibe_name}" with ${songs.length} tracks...`);

        // 1. Get the Spotify Auth Token
        const token = await getSpotifyToken();

        // 2. Process songs sequentially to prevent 429 Too Many Requests errors
        const enrichedSongs = [];
        
        for (const song of songs) {
            console.log(`Searching for: ${song.title} by ${song.artist}`);
            
            const trackData = await searchSpotifyTrack(song.title, song.artist, token);
            enrichedSongs.push(trackData);
            
            // Wait 300ms before making the next request to Spotify
            await delay(300); 
        }

        // 3. Construct the final JSON
        const finalSetlist = {
            vibe_name,
            dj_intro,
            songs: enrichedSongs,
            dj_outro
        };

        res.json({
            status: "success",
            data: finalSetlist
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error during enrichment process." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🎵 Node.js Music Integrator running on http://localhost:${PORT}`);
});