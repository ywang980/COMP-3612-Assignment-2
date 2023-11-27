const url = "https://www.randyconnolly.com/funwebdev/3rd/api/music/songs-nested.php";

// Used to switch between views
const views = ["home", "search", "single", "playlist"];

// Used to determine search results/playlist sort logic
let sortCriteria = "title";
let sortOrder = 1;

const ellipse = "\u2026"

// Used to represent each field of a song's details section as a progress bar
const detailsSpecifications = [
    { type: "duration", limit: 300, unit: "seconds" },
    { type: "bpm", limit: 180, unit: "" },
    { type: "popularity", limit: 100, unit: "%" },
    { type: "loudness", limit: 12, unit: "dB" }
];

const chartData = {
    labels: ['energy', 'danceability', 'liveness', 'valence', 'acousticness', 'speechiness'],
    datasets: [{
        label: 'Analytics Score',
        data: [0, 0, 0, 0, 0, 0],
        pointBackgroundColor: ['red'],
        borderWidth: 1,
        pointRadius: 3
    }]
}

const chartConfig = {
    type: 'radar',
    data: chartData,
    options: {
        elements: {
            line: {
                borderWidth: 1
            }
        },
        scales: {
            r: {
                pointLabels: {
                    font: {
                        size: 20
                    }
                },
                min: 0,
                max: 100
            }
        }
    }
};

let playlist = [];