import React, {useEffect, useState} from "react";
import {getLikedSongsFromArtist} from "./PDM";


const Focus = React.memo((props) => {
    const { user, playlists, item, datapoint, tertiary } = props;
    useEffect(() => {
        updateArtistQualities(datapoint);
        if(item){
            updateFocus();
        }
    }, [item])
    const [focus, setFocus] = useState({
        item: null,
        title: '', //main text
        secondary: '', //sub-title
        tertiary: '', //desc
        image: '',
        link: '',
    })
    const [focusMessage, setFocusMessage] = useState(<p>See what is says.</p>);
    const [showArt, setShowArt] = useState(true);
    const [artistQualities, setArtistQualities] = useState();
    const analyticsMetrics = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'valence', `tempo`];
    const translateAnalytics = {
        acousticness: {name: 'acoustic', description: 'Music with no electric instruments.'},
        danceability: {name: 'danceable', description: 'Music that makes you want to move it.'},
        energy: {name: 'energetic', description: 'Music that feels fast and loud.'},
        instrumentalness: {name: 'instrumental', description: 'Music that contains no vocals.'},
        liveness: {name: 'live', description: 'Music that is performed live.'},
        loudness: {name: 'loud', description: 'Music that is noisy.'},
        valence: {name: 'positive', description: 'Music that feels upbeat.'},
        tempo: {name: 'tempo', description: 'Music that moves and flows quickly.'}
    }
    // Delay function used for animations
    const delay = ms => new Promise(res => setTimeout(res, ms));
    // The function that updates the focus.
    async function updateFocus() {
        console.info("updateFocus called!")
        focus.item = item;
        setShowArt(false);
        let localState = focus;
        await delay(350);
        localState.image = item.image;
        localState.link = item.link;
        if (item.type === "song") {
            localState.title = item.title;
            localState.secondary = `by ${item.artist}`;
            localState.tertiary = tertiary;
        } else if (item.type === "artist") {
            localState.title = item.name;
            localState.secondary = item.genre;
            localState.tertiary = tertiary;
        } else {
            localState.title = '';
            localState.secondary = item;
            localState.tertiary = '';
        }
        setFocus(localState);
        await updateFocusMessage();
        setShowArt(true)
    }
    // Update the artist attributes that are used to make the focus
    // message.
    const updateArtistQualities = function (data) {
        const songs = data.topSongs;
        const artists = data.topArtists;
        const genres = data.topGenres;
        let result = {};
        // The analytics from the datapoint that we will compare
        // Get the artist that has the max value in each
        // metric
        analyticsMetrics.forEach(metric => {
            let max = {artist: '', value: 0};
            for (let i = 0; i < 50; i++) {
                if (songs[i].analytics[metric] > max.value) {
                    max.artist = songs[i].artist;
                    max.value = songs[i].analytics[metric];
                }
            }
            // Append the result to the existing result object
            result = {
                ...result,
                [max.artist]: {theme: metric}
            }
        })
        // For every artist [in order of listen time]
        artists.forEach(artist => {
            // Add the genre quality to them
            // equal to their genre
            if (artist && genres.includes(artist.genre)) {
                result[artist.name] = {
                    ...result[artist.name],
                    genre: artist.genre
                }
            }
        })
        setArtistQualities(result);
    }

    // Update the focus message to be
    // relevant to the current focus
    const updateFocusMessage = async function () {
        // What do we use as our possessive?
        let possessive;
        user.userID === 'me' ? possessive = 'your' : possessive = `${user.username}'s`
        const item = focus.item;
        let topMessage = '';
        let secondMessage = '';
        console.log(artistQualities);
        switch (item.type) {
            case "artist":
                if (artistQualities[`${item.name}`] === undefined) {
                    // If the artist doesn't have a genre analysis then we assume
                    // that they are not wildly popular.
                    topMessage += `${item.name} is a rare to see artist. They make ${possessive} profile quite unique.`
                } else {
                    Object.keys(artistQualities[item.name]).length > 1 ?
                        topMessage += `${item.name} represents ${possessive} love for ${artistQualities[item.name]["genre"]} and ${translateAnalytics[artistQualities[item.name]["theme"]].name} music.`
                        :
                        topMessage += `${item.name} is the artist that defines ${possessive} love for ${artistQualities[item.name][Object.keys(artistQualities[item.name])[0]]} music.`
                }
                // The index of the song in the user's top songs list made by this artist.
                const songIndex = datapoint.topSongs.findIndex((element) => element.artist === item.name);
                if(songIndex !== - 1){secondMessage += `${datapoint.topSongs[songIndex].title} by ${item.name} is Nº ${songIndex+1} on ${possessive} top 50 songs list for this time frame.`}
                break;
            case "song":
                let maxAnalytic = "acousticness";
                analyticsMetrics.forEach(analytic => {
                    let comparisonValue;
                    if (analytic === "tempo") {
                        comparisonValue = (item.analytics[analytic] - 50) / 150
                    } else {
                        comparisonValue = item.analytics[analytic]
                    }
                    if (comparisonValue > item.analytics[maxAnalytic]) {
                        maxAnalytic = analytic;
                    }
                })
                topMessage += `${item.title} is a very ${maxAnalytic === 'tempo' ? 'high' : ''} ${translateAnalytics[maxAnalytic].name} song by ${item.artist}.`
                if(datapoint.topArtists.some((element) => element && element.name === item.artist)){
                    const index = datapoint.topArtists.findIndex((element) => element.name === item.artist);
                    secondMessage += `${item.artist} is Nº ${index+1} on ${possessive} top artists list in this time frame.`
                }
                break;
            default:
                console.warn("updateFocusMessage error: No focus type found.")
        }
        setFocusMessage(
            <>
                <h2>{topMessage}</h2>
                <p style={{color: '#22C55E', fontFamily: 'Inter Tight', fontWeight: '600', fontSize: '20px'}}>{secondMessage}</p>
            </>
        );
    }

    return (
        <div className='focus-container'>
            <div className='art-container'>
                <a className={showArt ? 'play-wrapper' : 'play-wrapper-hidden'}
                   href={focus.link} rel="noopener noreferrer" target="_blank">
                    <img alt={'item artwork'} className='art' src={focus.image}></img>
                    <img alt={''} className='art' id={'art-backdrop'} src={focus.image}></img>
                    <div className='art-text-container'>
                        <h1 className={showArt === true ? "art-name-shown" : "art-name-hidden"}>{focus.title}</h1>
                        <p className={showArt === true ? "art-desc-shown" : "art-desc-hidden"}
                           style={{fontSize: '25px'}}>{focus.secondary}</p>
                        <p className={showArt === true ? "art-desc-shown" : "art-desc-hidden"}>{focus.tertiary}</p>
                    </div>
                </a>
            </div>
            <div className={'focus-message'}>
                {focusMessage}
            </div>
        </div>
    )
})

export default Focus
