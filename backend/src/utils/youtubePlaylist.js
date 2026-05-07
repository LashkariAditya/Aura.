import axios from 'axios';

/**
 * Fetch videos from a YouTube playlist recursively to bypass the 100-item limit.
 * Bypasses the 100-item limit of standard scrapers using InnerTube continuation tokens.
 */
export async function fetchFullYouTubePlaylist(listId) {
    const url = `https://www.youtube.com/playlist?list=${listId}`;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        const response = await axios.get(url, { headers: { 'User-Agent': userAgent } });
        const html = response.data;

        // Extract InnerTube parameters from page source
        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
        const initialDataMatch = html.match(/var ytInitialData = ({.*?});/s);

        if (!apiKeyMatch || !initialDataMatch) {
            throw new Error('Could not extract YouTube metadata. The playlist may be private or deleted.');
        }

        const apiKey = apiKeyMatch[1];
        let data = JSON.parse(initialDataMatch[1]);
        let allVideos = [];

        // Helper to parse video objects from YouTube's complex JSON
        const parseVideos = (contents) => {
            return contents
                .filter(item => item.playlistVideoRenderer)
                .map(item => {
                    const v = item.playlistVideoRenderer;
                    const thumbs = v.thumbnail?.thumbnails || [];
                    return {
                        videoId: v.videoId,
                        title: v.title?.runs?.[0]?.text || 'Unknown Title',
                        author: v.shortBylineText?.runs?.[0]?.text || 'Unknown Artist',
                        lengthSeconds: parseInt(v.lengthSeconds || '0'),
                        thumbnail: thumbs[thumbs.length - 1]?.url || ''
                    };
                });
        };

        // Helper to find the next page token
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

        // Locate first page content
        let listContents;
        try {
            listContents = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
        } catch (e) {
            try {
                listContents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
            } catch (e2) {
                throw new Error('Playlist structure changed or contains no videos.');
            }
        }

        allVideos = parseVideos(listContents);
        let continuationToken = findContinuation(listContents);

        const title = data.metadata?.playlistMetadataRenderer?.title || 'YouTube Playlist';
        
        const headerThumbs = data.header?.playlistHeaderRenderer?.playlistHeaderBanner?.heroPlaylistThumbnailRenderer?.thumbnail?.thumbnails || [];
        const image = headerThumbs.length > 0 
            ? headerThumbs[headerThumbs.length - 1].url 
            : (allVideos[0]?.thumbnail || '');

        // Recursive fetching loop
        let pageCount = 1;
        while (continuationToken && pageCount < 20) { // Limit to 2000 songs for performance
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
                    'Referer': url 
                } 
            });
            
            const nextData = res.data;
            let nextContents;
            try {
                nextContents = nextData.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
            } catch (e) {
                break; 
            }

            const newVids = parseVideos(nextContents);
            if (newVids.length === 0) break;
            
            allVideos = allVideos.concat(newVids);
            continuationToken = findContinuation(nextContents);
            pageCount++;
        }

        return {
            title,
            image,
            videos: allVideos
        };
    } catch (error) {
        console.error('Full Playlist Fetch Error:', error.message);
        throw error;
    }
}
