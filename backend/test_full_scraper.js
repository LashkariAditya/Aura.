import axios from 'axios';

async function getPlaylistVideos(listId) {
    const url = `https://www.youtube.com/playlist?list=${listId}`;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    const response = await axios.get(url, { headers: { 'User-Agent': userAgent } });
    const html = response.data;

    // 1. Get initial data and API Key
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const clientNameMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_NAME":(\d+)/);
    const clientVersionMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/);
    const initialDataMatch = html.match(/var ytInitialData = ({.*?});/s);

    if (!apiKeyMatch || !initialDataMatch) {
        throw new Error('Could not extract YouTube metadata');
    }

    const apiKey = apiKeyMatch[1];
    const clientName = clientNameMatch ? clientNameMatch[1] : '1';
    const clientVersion = clientVersionMatch ? clientVersionMatch[1] : '2.20240101.01.00';
    let data = JSON.parse(initialDataMatch[1]);

    let allVideos = [];
    
    // Extract videos from initial data
    const parseVideos = (contents) => {
        return contents
            .filter(item => item.playlistVideoRenderer)
            .map(item => {
                const v = item.playlistVideoRenderer;
                return {
                    videoId: v.videoId,
                    title: v.title?.runs?.[0]?.text || 'Unknown',
                    author: v.shortBylineText?.runs?.[0]?.text || 'Unknown',
                    lengthSeconds: parseInt(v.lengthSeconds || '0'),
                    thumbnail: v.thumbnail?.thumbnails?.[0]?.url || ''
                };
            });
    };

    const findContinuation = (contents) => {
        const last = contents[contents.length - 1];
        if (last && last.continuationItemRenderer) {
            let token = last.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
            if (!token) {
                token = last.continuationItemRenderer.continuationEndpoint?.commandExecutorCommand?.commands?.find(c => c.continuationCommand)?.continuationCommand?.token;
            }
            return token;
        }
        return null;
    };

    // Find the video list in initial data
    let listContents;
    try {
        listContents = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
    } catch (e) {
        try {
            listContents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
        } catch (e2) {
             console.error('Could not find videos in first page');
             return [];
        }
    }

    allVideos = parseVideos(listContents);
    let continuationToken = findContinuation(listContents);

    const title = data.metadata?.playlistMetadataRenderer?.title || 'YouTube Playlist';

    // 2. Loop through continuations
    while (continuationToken && allVideos.length < 1000) { // Limit to 1000 for sanity
        console.log(`Fetching next 100 videos (Total: ${allVideos.length})...`);
        const browseUrl = `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`;
        const payload = {
            continuation: continuationToken,
            context: {
                client: {
                    clientName: "WEB",
                    clientVersion: "2.20240210.01.00",
                    hl: "en",
                    gl: "US"
                }
            }
        };

        const res = await axios.post(browseUrl, payload, { 
            headers: { 
                'User-Agent': userAgent,
                'Origin': 'https://www.youtube.com',
                'Referer': `https://www.youtube.com/playlist?list=${listId}`
            } 
        });
        const nextData = res.data;
        
        let nextContents;
        try {
            // Updated path for WEB client continuation
            nextContents = nextData.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
        } catch (e) {
            console.error('Continuation extraction failed', e.message);
            break; 
        }

        const newVids = parseVideos(nextContents);
        console.log(`Extracted ${newVids.length} new videos`);
        allVideos = allVideos.concat(newVids);
        continuationToken = findContinuation(nextContents);
    }

    return { title, videos: allVideos };
}

// Test call
getPlaylistVideos('PLYr8DCKb5oPFleeU3FhLJ8wiLMwrPlRVS')
    .then(p => console.log('Final Result Count:', p.videos.length))
    .catch(console.error);
