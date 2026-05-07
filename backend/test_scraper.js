import axios from 'axios';

export async function scrapeFullPlaylist(listId) {
    const url = `https://www.youtube.com/playlist?list=${listId}`;
    const { data: html } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    const regex = /var ytInitialData = ({.*?});/s;
    const match = html.match(regex);
    if (!match) throw new Error('Could not find ytInitialData');

    const data = JSON.parse(match[1]);
    
    // This is the tricky part, finding where the videos are in the nested JSON
    let contents;
    try {
        contents = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
    } catch (e) {
        try {
            contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
        } catch (e2) {
             throw new Error('Could not find playlist content in JSON');
        }
    }

    const videos = contents
        .filter(item => item.playlistVideoRenderer)
        .map(item => {
            const v = item.playlistVideoRenderer;
            return {
                videoId: v.videoId,
                title: v.title.runs[0].text,
                author: v.shortBylineText?.runs[0]?.text || 'Unknown',
                lengthSeconds: parseInt(v.lengthSeconds || '0'),
                thumbnail: v.thumbnail.thumbnails[0].url
            };
        });

    const title = data.metadata?.playlistMetadataRenderer?.title || 'YouTube Playlist';
    
    return { title, videos };
}
