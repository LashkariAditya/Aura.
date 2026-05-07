import axios from 'axios';

async function test() {
    try {
        const r = await axios.get('https://www.youtube.com/playlist?list=PLYr8DCKb5oPFleeU3FhLJ8wiLMwrPlRVS', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const matches = r.data.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/g);
        if (matches) {
            const ids = [...new Set(matches.map(m => m.split('":"')[1].replace('"', '')))];
            console.log('Found unique IDs:', ids.length);
        } else {
            console.log('No IDs found');
        }
    } catch (e) {
        console.error(e.message);
    }
}
test();
