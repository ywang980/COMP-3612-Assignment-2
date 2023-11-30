document.addEventListener("DOMContentLoaded", () => {

    let songs, filteredSongs;
    const artists = JSON.parse(artistsJSON);
    const genres = JSON.parse(genresJSON);
    fetchJSON(url, "songs", runUponFetch);

    Chart.defaults.font.size = 16;
    const chart = new Chart(document.querySelector("#analyticsChart"), chartConfig);

    /*
        Attempt to retrieve JSON associated with key, fetching/storing
        from path if not found. Either way, run handler function once JSON
        acquired.
    */
    function fetchJSON(path, key, handler) {
        let data = retrieveJSON(key);
        if (data) {
            handler(data);
        }
        else {
            fetch(path)
                .then(response => response.json())
                .then(d => {
                    data = d;
                    storeJSON(key, d);
                    handler(data);
                })
                .catch("Error: failed to fetch JSON.");
        }

        function storeJSON(key, json) {
            localStorage.setItem(key, JSON.stringify(json));
        }

        function retrieveJSON(key) {
            return JSON.parse(localStorage.getItem(key));
        }
    }

    function runUponFetch(data) {
        songs = filterDuplicates(data, "title");
        filteredSongs = songs;

        populateHomeView(songs, artists, genres);
        populateSearchView();
        turnOnEvents();
    }

    /*
        For the supplied object, attempt to get the parameter specified
        in the path argument.
            -Path is a string delimited by '.'
    */
    function getParameter(object, path) {
        const keys = path.split(".");
        let reducedObject = object;
        keys.forEach(key => { reducedObject = reducedObject[key]; })
        return reducedObject;
    }

    /*
        Sort an array of objects by the parameter specified via path.
            -Order argument is -1 for descending sort,
            anything else for ascending
            -Case insensitive for any non-number parameter
    */
    function sortByParameter(list, path, order) {
        list = list.sort((a, b) => {
            let parameterA = getParameter(a, path);
            let parameterB = getParameter(b, path);

            if (isNaN(parameterA))
                parameterA = parameterA.toLowerCase();
            if (isNaN(parameterB))
                parameterB = parameterB.toLowerCase();

            if (parameterA > parameterB)
                return 1;
            else if (parameterA < parameterB)
                return -1;
            return 0;
        });

        if (order == "-1")
            list = list.reverse();

        return list;
    }

    /*
        Creates a duplicate-free copy of an array of objects.
            -Duplicate is defined as 2 objects having the same parameter
            specified via path

        Details:
            -The original list is sorted and iterated through
            -The duplicate free array is initially empty, but pushed
            whenever an object's parameter does not match that of the
            previous object
    */
    function filterDuplicates(list, path) {
        sortByParameter(list, path, sortOrder);
        const duplicateFreeList = [];
        let j = 0;
        duplicateFreeList.push(list[j]);
        for (let i = 1; i < list.length; i++) {
            if (getParameter(list[i], path) != getParameter(duplicateFreeList[j], path)) {
                duplicateFreeList.push(list[i]);
                j++;
            }
        }
        return duplicateFreeList;
    }

    /*
        Create an HTML element with the specified text, classList (array),
        textContent, and append it to parent.
    */
    function createElement(parent, type, classList, textContent) {
        const element = document.createElement(type);
        classList.forEach(c => element.classList.add(c));
        element.textContent = textContent;
        parent.appendChild(element);
        return element;
    }

    /*
        Switch to the view indicated by the argument.
        Possible view values: "home", "search", "single", "playlist" -
        See: views array in data.js
    */
    function toggleView(view) {
        const views = document.querySelectorAll("main");
        views.forEach(viewNode => viewNode.id.includes(view) ?
            viewNode.classList.remove("hidden") : viewNode.classList.add("hidden"));
    }

    function displayTemporaryPopup(popup, duration) {
        popup.classList.replace("hidden", "visible");

        setTimeout(() => {
            popup.classList.replace("visible", "hidden");
        }, duration);
    }

    function createTemporaryPopup(textContent, duration) {
        const popup = createElement(document.querySelector("body"),
            "div", ["popup", "notification", "hidden"], textContent);

        setTimeout(() => popup.classList.replace("hidden", "visible"), 0);
        setTimeout(() => popup.remove(), duration);
    }

    function populateSelect(select, optionList, path) {
        select.replaceChildren();
        optionList.forEach(option => {
            createElement(select, "option", [], getParameter(option, path));
        });
    }

    /*
        Find the top 15 songs, artists, and genres, then populate the corresponding
        home view list.

        Details:
            -Each object array is first sorted by the desired criteria - 
            popularity for songs, frequency of occurrence in songs
            for artists/genres
            -Each home list is then populated using a truncated
            version (via the slice method) of the corresponding array
    */
    function populateHomeView(songs, artists, genres) {
        sortByParameter(songs, "details.popularity", -1).slice(0, 15);
        populateHomeList(songs.slice(0, 15), document.querySelector("#mostPopularSongs"),
            "title", "Popularity", "details.popularity");

        sortByFrequency(artists, "name", songs, "artist.name");
        populateHomeList(artists.slice(0, 15), document.querySelector("#topArtists"),
            "name", "Songs", "frequency");

        sortByFrequency(genres, "name", songs, "genre.name");
        populateHomeList(genres.slice(0, 15), document.querySelector("#topGenres"),
            "name", "Songs", "frequency");

        /*
            For a list of possible match values (listToMatch), sort it by
            how often each value occurs in listToCount. Matching is on basis
            of parameter specified via matchPath and countPath.

            Details:
                -Each list is first sorted based on the parameter at path
                -listToCount is then iterated, comparing each value
                to the current value to match

                Case 1: values match
                    -The current match value's frequency is incremented

                Case 2: values do not match
                    -Traverese listToMatch until values match
        */
        function sortByFrequency(listToMatch, matchPath, listToCount, countPath) {

            //First declare a frequency field for each possible match
            listToMatch.forEach(i => i.frequency = 0);

            sortByParameter(listToMatch, matchPath, 1);
            sortByParameter(listToCount, countPath, 1);

            let matchIndex = 0;
            listToCount.forEach(i => {
                let matchParameter = getParameter(listToMatch[matchIndex], matchPath);
                let countParameter = getParameter(i, countPath);

                //Find a match
                while (matchParameter != countParameter) {
                    matchIndex++;
                    matchParameter = getParameter(listToMatch[matchIndex], matchPath);
                }
                //Then increment frequency
                listToMatch[matchIndex].frequency++;
            });

            //Sort in descending frequency order
            sortByParameter(listToMatch, "frequency", -1);
        }

        /*
            Populate each home list element with the following markup format:
            <div>
                <span>Song Title/Artist/Genre (e.g. dance pop)</span>
                <span>Metric (e.g. Popularity: 121)</span>
            </div>
        */
        function populateHomeList(sortedList, parent, path, metric, metricPath) {
            sortedList.forEach(i => {
                const container = createElement(parent, "div", ["dataRow", "flex"], "");
                let textContent = `${getParameter(i, path)}`;
                createElement(container, "span", ["underline"], textContent);
                textContent = `${metric}: ${getParameter(i, metricPath)}`;
                createElement(container, "span", [], textContent);
            })
        }
    }

    /*
        Populate the artist and genre search select menus, sorted in ascending order.
    */
    function populateSearchView() {
        sortByParameter(artists, "name", sortOrder);
        populateSelect(document.querySelector("#artistSearch"), artists, "name");
        sortByParameter(genres, "name", sortOrder);
        populateSelect(document.querySelector("#genreSearch"), genres, "name");

        updateSearchResults("title", "")
    }

    /*
            Populate each song list element with the following markup format:
            <div class="songRow">
                <span data-id="song.song_id">Title</span>
                <span>Artist</span>
                <span>Year</span>
                <span>Genre</span>
                <span>Popularity</span>
            </div>

            -If title is 25 or more characters, truncate it to an ellipse
            which may be clicked on to temporarily view the full title via
            a hidden overlay
    */
    function populateSongList(parent, header, songs) {
        //Backup header row before clearing child nodes
        const headerBackup = header;
        parent.replaceChildren();
        parent.appendChild(headerBackup);

        songs.forEach(song => {
            const row = createElement(parent, "div", ["grid", "songRow"], "");

            const title = createElement(row, "span", ["resultsField", "underline"], song.title);
            if (song.title.length > 25)
                truncatelongTitle(title, song);
            title.setAttribute("data-id", song.song_id);

            createElement(row, "span", ["resultsField"], song.artist.name);
            createElement(row, "span", ["resultsField"], song.year);
            createElement(row, "span", ["resultsField"], song.genre.name);
            createElement(row, "span", ["resultsField"], song.details.popularity);
        });

        function truncatelongTitle(title, song) {
            title.textContent = song.title.substring(0, 25);
            title.style.position = "relative";
            createElement(title, "span", ["ellipse", "pointer"], ellipse);
            createElement(title, "span", ["tooltip", "underline", "hidden"], song.title);
        }
    }

    /*
        Filter songs whose specified parameter matches the supplied
        searchText, then repopulates the searchResults section
        with the filtered songs. Filtered songs are sorted according
        to the current sort criteria/order, determined by last clicked
        sort icon in header.
    */
    function updateSearchResults(parameter, searchText) {
        //Only filter on new searchText (i.e. not empty)
        if (searchText)
            filteredSongs = getFilteredSongs(parameter, searchText);
        sortByParameter(filteredSongs, sortCriteria, sortOrder);

        populateSongList(document.querySelector("#searchResults"),
            document.querySelector("#resultsHeaderRow"), filteredSongs);

        function getFilteredSongs(parameter, searchText) {
            if (isNaN(searchText))
                searchText = searchText.toLowerCase();

            filteredResult = (songs.filter(song => {
                value = getParameter(song, parameter);

                //Case insensitive search
                if (isNaN(value))
                    value = value.toLowerCase();

                //Allow partial matching for title search
                if (parameter == "title")
                    return (value.toString()).includes(searchText);
                else
                    return value == searchText;
            }
            ));
            return filteredResult;
        }
    }

    /*
        Update single song view with the data of the clicked song.

        Details: song information is clustered into 3 categories - basic, details,
        and analytics

        Basic: title, artist name, artist type, genre, year
            -Output format is text field
        
        Details: duration, BPM, popularity, loudness
            -Output format is a progress bar; a comparison against a
            predefined maximum
            -Maximum for each detail field is: 300 seconds, 180 BPM,
            100% popularity, and 120 dB, respectively
        
        Analytics: all analytics fields range from 1-100, and are represented
        via a radar chart
    */
    function updateSingleSongView(song) {
        toggleView(views[2]);
        populateBasicInformation(song);
        populateDetails(song.details);
        updateChartData(song.analytics);

        /*
            Fill each text field with the corresponding song field. For artist.type,
            first find the artist object with the same name as the artist.name of the
            song, then create an artist.type field in the song.
        */
        function populateBasicInformation(song) {
            const artist = artists.find(a => a.name == song.artist.name);
            song.artist.type = artist.type;

            const dataNodeList = document.querySelectorAll(".dataRow span[data-type]");
            dataNodeList.forEach(dataNode => {
                dataNode.textContent = getParameter(song, dataNode.getAttribute("data-type"));
            });
        }

        /*
            For each details field in the song, fill and label a progress bar
            to represent the field.
        */
        function populateDetails(songDetails) {
            const detailsList = document.querySelectorAll("#details li");
            detailsList.forEach(li => {
                const type = li.getAttribute("data-type");
                const detailSpecification = detailsSpecifications.find(d => d.type == type)
                const value = Math.abs(getParameter(songDetails, type));

                fillProgressBar(detailSpecification, value, type);
                generateLabelText(detailSpecification, value, type);

                /*
                    Progress bar filled via setting width of progress bar as
                    progress %
                        -Progress % = field value/max value
                        -Implemented via styling parent container
                     with different background color
                */
                function fillProgressBar(detailSpecification, value, type) {
                    let widthPercent = (value / detailSpecification.limit * 100).toFixed(2);
                    if (widthPercent > 100)
                        widthPercent = 100;
                    const progressBar = document.querySelector(`li[data-type="${type}"] .progressBar`);
                    progressBar.style.width = `${widthPercent}%`;
                }

                /*
                    Progress bar label depends on type of field; each field
                    has a distinct unit listed in its detailSpecification object
                        -Time converted to minutes + seconds format
                        -Loudness converted to practical dB values
                */
                function generateLabelText(detailSpecification, value, type) {
                    const label = document.querySelector(`li[data-type="${type}"] label`);
                    let labelText = `${type.toUpperCase()}: `;

                    if (type == "loudness")
                        value *= 10;

                    if (type == "duration")
                        labelText += getDurationInMinutes(value);
                    else
                        labelText += `${value} ${detailSpecification.unit}`;
                    label.textContent = labelText;
                }

                function getDurationInMinutes(seconds) {
                    return `${(seconds / 60).toFixed(0)} Minutes, ${(seconds % 60).toFixed(0)} Seconds`;
                }
            })
        }

        /*
            Replace chart data with analytics data of song
        */
        function updateChartData(songAnalytics) {
            const newData = [];
            const labels = chartData.labels;
            labels.forEach(label => newData.push((getParameter(songAnalytics, label))));

            chart.data.datasets[0].data = newData;
            chart.update();
        }
    }

    /*
        Repopulates playlist, sorted according to the current sort
        criteria/order, then updates the playlist details (i.e. 
        song count, average popularity).
    */
    function updatePlaylist() {
        playlist = sortByParameter(playlist, sortCriteria, sortOrder);

        populateSongList(document.querySelector("#playlist"),
            document.querySelector("#playlistHeaderRow"), playlist);

        updatePlaylistDetails();

        function updatePlaylistDetails() {
            const songCount = playlist.length;
            document.querySelector("#songCount").textContent = songCount;

            let averagePopularity = 0;
            if (songCount != 0) {
                playlist.forEach(song => averagePopularity += song.details.popularity);
                averagePopularity = (averagePopularity / playlist.length).toFixed(2);
            }
            document.querySelector("#averagePopularity").textContent = averagePopularity;
        }
    }

    function turnOnEvents() {
        addEventEnableNav();
        addEventClearSearch();
        addEventFilterSearch();
        addEventViewLinks();
        addEventSortOrderToggle();
        addEventExpandEllipse();
        addPlaylistEvents();
    }

    /*
        View-swapping functionality in header (i.e. logo/button click)
        and credits mouseover.
    */
    function addEventEnableNav() {
        const buttons = document.querySelectorAll("nav.buttonContainer button");
        buttons.forEach(button => {
            const view = views.find(v => v == button.textContent.toLowerCase());
            if (view) {
                button.addEventListener("click", () => toggleView(view));
            }
        });

        document.querySelector("header img").addEventListener("click",
            () => toggleView(views[0]));

        document.querySelector("#creditsButton").addEventListener("mouseover", () => {
            displayTemporaryPopup(document.querySelector("#credits"), 5000);
        });
    }

    /*
        Enable button to clear search choice and value.
    */
    function addEventClearSearch() {
        document.querySelector("#clearSearchButton").addEventListener("click", () => {
            clearSearchChoice();
            emptySearchValues();
            filteredSongs = songs; //Reset filtered songs
            updateSearchResults("title", ""); //Repopulate search results with all songs

            function clearSearchChoice() {
                const choices = document.querySelectorAll("#songSearch input[type=radio]");
                const filterChoice = Array.from(choices).find((choice) => choice.checked);
                if (filterChoice)
                    filterChoice.checked = null;
            }

            function emptySearchValues() {
                document.querySelector("#titleSearch").value = "";
                document.querySelector("#artistSearch").value = "";
                document.querySelector("#genreSearch").value = "";
            }
        })
    }

    /*
        Enable button to filter search results based on value of selected search type.
        Can also search with enter key while in search view.
    */
    function addEventFilterSearch() {
        document.querySelector("#filterSearchButton").addEventListener("click", filterSearch);

        document.addEventListener("keypress", (e) => {
            const searchView = document.querySelector("#searchView");
            if (e.key == "Enter" && !searchView.classList.contains("hidden"))
                filterSearch();
        })

        function filterSearch() {
            //Find search type (i.e. the checked radio)
            const choices = document.querySelectorAll("#songSearch input[type=radio]");
            const filterChoice = Array.from(choices).find((choice) => choice.checked);

            if (!filterChoice)
                alert("Select a search choice");
            else {
                //Use parameter data in checked radio to determine which
                //input's value to use as the search text
                const parameter = filterChoice.getAttribute("data-parameter");
                const searchText = getSearchText(parameter);

                //Don't update results if search text is empty
                searchText ? updateSearchResults(parameter, searchText) : alert("Invalid search input");
            }

            function getSearchText(parameter) {
                if (parameter == "title")
                    return document.querySelector(`[data-parameter="${parameter}"]~input`).value;
                else if (parameter == "artist.name" || parameter == "genre.name")
                    return document.querySelector(`[data-parameter="${parameter}"]~select`).value;
                return "";
            }
        }
    }

    /*
        Clicking on a song title anywhere (i.e. home, search, playlist)
        will display that song in single song view. Clicking on a genre/artist
        in the home view will search by that genre/artist.

        Details:
            -All such clickable nodes are assigned the underline class
            -Type of field determined via ID of encompassing ancestor container
            2 levels up
    */
    function addEventViewLinks() {
        document.querySelector("body").addEventListener("click", e => {
            if (e.target && e.target.classList.contains("underline")) {

                //Determine field type
                const ancestor = (e.target.parentNode).parentNode;
                const ancestorID = ancestor.id.toLowerCase();

                //Search by genre/artist
                if (ancestorID.includes("genres")) {
                    updateSearchResults("genre.name", e.target.textContent);
                    toggleView(views[1]);
                }
                else if (ancestorID.includes("artists")) {
                    updateSearchResults("artist.name", e.target.textContent);
                    toggleView(views[1]);
                }
                //Display clicked song
                else {
                    const clickedSong = songs.find(song => song.title == e.target.textContent);
                    updateSingleSongView(clickedSong);
                }
            }
        });
    }

    /*
        Clicking on any order toggle icon in the search results/playlist header
        will sort the current search results AND playlist based on the icon's
        type/direction.

        Details:
            -The type is embedded as data within the icon img
            -The direction is defined by the img src - an up or down caret
            to reflect the current sort direction
    */
    function addEventSortOrderToggle() {
        document.querySelector("body").addEventListener("click", (e) => {
            if (e.target && e.target.classList.contains("orderToggle")) {
                const sortType = e.target.getAttribute("data-type");
                toggleSortDirection(sortType, e.target);

                function toggleSortDirection(sortType, img) {
                    //src names only differ in up or down
                    //src of "up" caret indicates ascending sort, down-descending
                    let iconSrc = "./images/caret-up-solid.svg";
                    if (img.src.includes("up"))
                        iconSrc = iconSrc.replace("up", "down");
                    img.src = iconSrc;

                    updateSortLogic(sortType, getSortOrder(img));
                    updateSearchResults(sortCriteria, "");
                    updatePlaylist();
                }

                function updateSortLogic(type, order) {
                    sortCriteria = type;
                    sortOrder = order;
                }

                function getSortOrder(orderToggleObject) {
                    if (orderToggleObject.src.includes("up"))
                        return 1;
                    return -1;
                }
            }
        });
    }

    /*
        Clicking on an ellipse (representing a truncated song title) will
        temporarily display a tooltip with the full song title.
    */
    function addEventExpandEllipse() {
        document.querySelector("body").addEventListener("click", (e) => {
            if (e.target && e.target.textContent == ellipse) {
                const parent = e.target.parentNode;
                const tooltip = e.target.nextElementSibling;
                displayTemporaryPopup(tooltip, 5000);
            }
        });
    }

    /*
        Various playlist functionalities:

        -A button to add a song to the playlist in search view, a button to
        remove a song from the playlist in playlist view
        -Either button will open a "menu" popup, which itself has 2 buttons:
        confirm add/remove, or close menu
        -User may choose any song currently visibile in search results/playlist
        to add/remove, respectively
        -Each successful add/remove will display a short notification toast
        -Duplicates may not be added

        -A button to clear the playlist
    */
    function addPlaylistEvents() {
        enableOpenMenuButtons();
        enableCloseMenuButtons();
        enableModifyMenuButtons();
        enableClearPlaylist();

        /*
            Open menu to add/remove song via toggling menu class, then populate
            menu select with (valid) songs which may be added/removed.
        */
        function enableOpenMenuButtons() {
            const openButtons = document.querySelectorAll("div.openMenu button");
            openButtons.forEach(openButton => {
                openButton.addEventListener("click", () => {
                    //select to populate/selectData are determined by target attribute in button
                    const target = openButton.getAttribute("data-target");
                    toggleMenuDisplay(target, "show");

                    const select = document.querySelector(`#${target} select`);
                    select.replaceChildren();
                    let selectData;
                    target == "addSongMenu" ?
                        selectData = filteredSongs.filter(song => !playlist.includes(song)) :
                        selectData = playlist;
                    populateSelect(select, selectData, "title")
                });
            });
        }

        /*
            Buttons to close the popup menu.
        */
        function enableCloseMenuButtons() {
            const closeButtons = document.querySelectorAll(".cancelPlaylistChange");
            closeButtons.forEach(closeButton => {
                closeButton.addEventListener("click", () =>
                    toggleMenuDisplay(closeButton.getAttribute("data-target"), "hide"));
            });
        }

        /*
            Add or remove the selected song to/from the playlist.
            
            Details:
                -Determine type of operation(add/remove) to push/pop playlist
                -Update playlist data, repopulate HTML
                -Update list of songs which can be added/removed
        */
        function enableModifyMenuButtons() {
            const modifyButtons = document.querySelectorAll(".confirmPlaylistChange");
            modifyButtons.forEach(modifyButton => {
                modifyButton.addEventListener("click", () => {
                    const target = modifyButton.getAttribute("data-target");
                    const select = document.querySelector(`#${target} select`);

                    if (target == "addSongMenu") {
                        pushPlaylist(select.value);
                        populateSelect(select, filteredSongs.filter(song => !playlist.includes(song)), "title");
                    }
                    else if (target == "removeSongMenu") {
                        popPlaylist(select.value);
                        populateSelect(select, playlist, "title")
                    }
                });
            });

            function pushPlaylist(value) {
                if (value) {
                    const selectedSong = filteredSongs.find(song => song.title == value);
                    if (!playlist.includes(selectedSong)) {
                        playlist.push(selectedSong);
                        updatePlaylist();
                        createTemporaryPopup("Song Added to Playlist!", 1500);
                    }
                }
            }

            function popPlaylist(value) {
                if (value) {
                    const selectedSong = playlist.find(song => song.title == value);
                    playlist = playlist.filter(song => song != selectedSong);
                    updatePlaylist();
                    createTemporaryPopup("Song Removed from Playlist!", 1500);
                }
            }
        }

        /*
            Button to clear playlist.
        */
        function enableClearPlaylist() {
            document.querySelector("#clearPlaylist button").addEventListener("click", () => {
                playlist = [];
                updatePlaylist();
            });
        }

        /*
            Show or hide a target popup.
        */
        function toggleMenuDisplay(target, showOrHide) {
            const parent = document.querySelector(`#${target}`);
            if (showOrHide == "show")
                parent.classList.replace("hidden", "visible");
            else if (showOrHide == "hide")
                parent.classList.replace("visible", "hidden");
        }
    }
});