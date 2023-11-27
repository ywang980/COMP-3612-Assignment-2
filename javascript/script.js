document.addEventListener("DOMContentLoaded", () => {

    let songs = fetchJSON(url, "songs");
    songs = filterDuplicates(songs, "title");
    let filteredSongs = songs;
    
    const artists = fetchJSON("./JSON/artists.json", "artists");
    const genres = fetchJSON("./JSON/genres.json", "genres");

    populateHomeView(songs, artists, genres);
    populateSearchView();
    turnOnEvents();

    function fetchJSON(path, key) {
        let data = retrieveJSON(key);
        if (data) {
            return data;
        }
        else {
            fetch(path)
                .then(response => response.json())
                .then(d => {
                    data = d;
                    storeJSON(key, d);
                    return data;
                })
                .catch();
        }

        function storeJSON(key, json) {
            localStorage.setItem(key, JSON.stringify(json));
        }

        function retrieveJSON(key) {
            return JSON.parse(localStorage.getItem(key));
        }
    }

    function getParameter(object, path) {
        const keys = path.split(".");
        let reducedObject = object;
        keys.forEach(key => { reducedObject = reducedObject[key]; })
        return reducedObject;
    }

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
            else if (parameterA > parameterB)
                return -1;
            return 0;
        });

        if (order == "-1")
            list = list.reverse();

        return list;
    }

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

    function createElement(parent, type, classList, textContent) {
        const element = document.createElement(type);
        classList.forEach(c => element.classList.add(c));
        element.textContent = textContent;
        parent.appendChild(element);
        return element;
    }

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

        function sortByFrequency(listToMatch, matchPath, listToCount, countPath) {
            listToMatch.forEach(i => i.frequency = 0);
            sortByParameter(listToMatch, matchPath);
            sortByParameter(listToCount, countPath);

            let matchIndex = 0;
            listToCount.forEach(i => {
                let matchParameter = getParameter(listToMatch[matchIndex], matchPath);
                let countParameter = getParameter(i, countPath);

                while (matchParameter != countParameter) {
                    matchIndex++;
                    matchParameter = getParameter(listToMatch[matchIndex], matchPath);
                }
                listToMatch[matchIndex].frequency++;
            });

            sortByParameter(listToMatch, "frequency", -1);
        }

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

    function populateSearchView() {
        sortByParameter(artists, "name", sortOrder);
        populateSelect(document.querySelector("#artistSearch"), artists, "name");
        sortByParameter(genres, "name", sortOrder);
        populateSelect(document.querySelector("#genreSearch"), genres, "name");

        updateSearchResults("title", "")
    }

    function populateSongList(parent, header, songs) {
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

    function updateSearchResults(parameter, searchText) {
        if (searchText != "")
            filteredSongs = getFilteredSongs(parameter, searchText);
        sortByParameter(filteredSongs, sortCriteria, sortOrder);

        populateSongList(document.querySelector("#searchResults"),
            document.querySelector("#resultsHeaderRow"), filteredSongs);

        function getFilteredSongs(parameter, searchText) {
            if (isNaN(searchText))
                searchText = searchText.toLowerCase();

            filteredResult = (songs.filter(song => {
                value = getParameter(song, parameter);
                if (isNaN(value))
                    value = value.toLowerCase();
                return (value.toString()).includes(searchText);
            }
            ));
            return filteredResult;
        }
    }

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
        addEventHomeViewLinks();
        addEventViewSongFromSearch();

        addEventSortOrderToggle();
        addEventExpandEllipse();
        addPlaylistEvents();
    }

    function addEventEnableNav() {
        const buttons = document.querySelectorAll("nav.buttonContainer button");
        buttons.forEach(button => {
            const view = views.find(v => v == button.textContent.toLowerCase());
            if (view) {
                button.addEventListener("click", () => toggleView(view));
            }
        });

        document.querySelector("header h1").addEventListener("click",
            () => toggleView(views[0]));

        document.querySelector("#creditsButton").addEventListener("mouseover", () => {
            displayTemporaryPopup(document.querySelector("#credits"), 5000);
        });
    }

    function addEventClearSearch() {
        document.querySelector("#clearSearchButton").addEventListener("click", () => {
            clearSearchChoice();
            emptySearchValues();
            filteredSongs = songs;
            updateSearchResults("title", "");

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

    function addEventFilterSearch() {
        document.querySelector("#filterSearchButton").addEventListener("click", () => {
            const choices = document.querySelectorAll("#songSearch input[type=radio]");
            const filterChoice = Array.from(choices).find((choice) => choice.checked);

            if (!filterChoice)
                alert("Select a search choice");
            else {
                const parameter = filterChoice.getAttribute("data-parameter");
                const searchText = getSearchText(parameter);
                searchText ? updateSearchResults(parameter, searchText) : alert("Invalid search input");
            }
        });

        function getSearchText(parameter) {
            if (parameter == "title")
                return document.querySelector(`[data-parameter="${parameter}"]~input`).value;
            else if (parameter == "artist.name" || parameter == "genre.name")
                return document.querySelector(`[data-parameter="${parameter}"]~select`).value;
            return "";
        }
    }

    function updateSingleSongView(song) {
        toggleView(views[2]);
        populateBasicInformation(song);
        populateDetails(song.details);

        function populateBasicInformation(song){
            const artist = artists.find(a => a.name == song.artist.name);
            song.artist.type = artist.type;

            const dataNodeList = document.querySelectorAll(".dataRow span[data-type]");
            dataNodeList.forEach(dataNode =>{
                dataNode.textContent = getParameter(song, dataNode.getAttribute("data-type"));
            });
        }

        function populateDetails(songDetails) {
            const detailsList = document.querySelectorAll("#details li");
            detailsList.forEach(li => {
                const type = li.getAttribute("data-type");
                const detailSpecification = detailsSpecifications.find(d => d.type == type)
                const value = Math.abs(getParameter(songDetails, type));

                fillProgressBar(detailSpecification, value, type);
                generateLabelText(detailSpecification, value, type);

                function fillProgressBar(detailSpecification, value, type) {
                    let widthPercent = (value / detailSpecification.limit * 100).toFixed(2);
                    if (widthPercent > 100)
                        widthPercent = 100;
                    const progressBar = document.querySelector(`li[data-type="${type}"] .progressBar`);
                    progressBar.style.width = `${widthPercent}%`;
                }

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
                    return `${(seconds / 60).toFixed(0)} Minutes and ${(seconds % 60).toFixed(0)} Seconds`;
                }
            })
        }
    }

    function addEventHomeViewLinks() {
        document.querySelector("#homeView").addEventListener("click", e => {
            if (e.target && e.target.classList.contains("underline")) {
                const listAncestor = (e.target.parentNode).parentNode;
                listID = listAncestor.id.toLowerCase();

                if (listID.includes("genres")) {
                    updateSearchResults("genre.name", e.target.textContent);
                    toggleView(views[1]);
                }
                else if (listID.includes("artists")) {
                    updateSearchResults("artist.name", e.target.textContent);
                    toggleView(views[1]);
                }
                else {
                    const clickedSong = songs.find(song => song.title == e.target.textContent);
                    updateSingleSongView(clickedSong);
                }
            }
        });
    }

    function addEventViewSongFromSearch() {
        document.querySelector("#searchResults").addEventListener("click", e => {
            if (e.target && e.target.classList.contains("underline")) {
                const resultField = e.target;
                if (resultField.parentNode.classList.contains("underline"))
                    resultField = resultField.parentNode;

                const clickedSong = songs.find(song => song.song_id ==
                    resultField.getAttribute("data-id"));

                updateSingleSongView(clickedSong)
            };
        });
    }

    function addEventSortOrderToggle() {
        document.querySelector("body").addEventListener("click", (e) => {
            if (e.target && e.target.nodeName == "IMG"
                && e.target.classList.contains("orderToggle")) {
                const sortType = e.target.getAttribute("data-type");
                const imgList = document.querySelectorAll(`img.orderToggle[data-type="${sortType}"]`);
                toggleSortDirection(sortType, imgList);

                function toggleSortDirection(sortType, imgList) {
                    let iconSrc = "./images/caret-up-solid.svg"
                    imgList.forEach(img => img.src.includes("up") ?
                        img.src = iconSrc.replace("up", "down") : img.src = iconSrc);

                    updateSortLogic(sortType, getSortOrder(imgList[0]));
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

    function addEventExpandEllipse() {
        document.querySelector("#searchResults").addEventListener("click", (e) => {
            if (e.target && e.target.textContent == ellipse) {
                const parent = e.target.parentNode;
                const tooltip = e.target.nextElementSibling;
                displayTemporaryPopup(tooltip, 5000);
            }
        });
    }

    function addPlaylistEvents() {
        enableOpenMenuButtons();
        enableCloseMenuButtons();
        enableModifyMenuButtons();
        enableClearPlaylist();

        function enableOpenMenuButtons() {
            const openButtons = document.querySelectorAll("div.openMenu button");
            openButtons.forEach(openButton => {
                openButton.addEventListener("click", () => {
                    const target = openButton.getAttribute("data-target");
                    toggleMenuDisplay(target, "show");

                    const select = document.querySelector(`#${target} select`);
                    select.replaceChildren();
                    let selectData;
                    target == "addSongMenu" ? selectData = filteredSongs : selectData = playlist;
                    populateSelect(select, selectData, "title")
                });
            });
        }

        function enableCloseMenuButtons() {
            const closeButtons = document.querySelectorAll(".cancelPlaylistChange");
            closeButtons.forEach(closeButton => {
                closeButton.addEventListener("click", () =>
                    toggleMenuDisplay(closeButton.getAttribute("data-target"), "hide"));
            });
        }

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
                    playlist.push(selectedSong);
                    updatePlaylist();
                    createTemporaryPopup("Song Added to Playlist!", 1500);
                }
            }

            function popPlaylist(value) {
                if(value){
                    const selectedSong = playlist.find(song => song.title == value);
                    playlist = playlist.filter(song => song != selectedSong);
                    updatePlaylist();
                    createTemporaryPopup("Song Removed from Playlist!", 1500);
                }
            }
        }

        function enableClearPlaylist() {
            document.querySelector("#clearPlaylist button").addEventListener("click", () => {
                playlist = [];
                updatePlaylist();
            });
        }

        function toggleMenuDisplay(target, showOrHide) {
            const parent = document.querySelector(`#${target}`);
            if (showOrHide == "show")
                parent.classList.replace("hidden", "visible");
            else if (showOrHide == "hide")
                parent.classList.replace("visible", "hidden");
        }
    }
});