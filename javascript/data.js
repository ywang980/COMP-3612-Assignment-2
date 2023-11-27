const url = "https://www.randyconnolly.com/funwebdev/3rd/api/music/songs-nested.php";

const views = ["home", "search", "single", "playlist"];

let sortCriteria = "title";
let sortOrder = 1;

const ellipse = "\u2026"

const detailsSpecifications = [
    {type: "duration", limit: 300, unit: "seconds"},
    {type: "bpm", limit: 180, unit: ""},
    {type: "popularity", limit: 100, unit: "%"},
    {type: "loudness", limit: 12, unit: "dB"}
];

const chartData = {
    labels: ['energy', 'danceability', 'liveness', 'valence', 'acousticness', 'speechiness'],
    datasets: [{
        label: 'Analytics Score',
        data: [],
        borderWidth: 1
    }]
}

const chartConfig = {
    type: 'radar',
    data: chartData,
    options: {
        elements: {
            line: {
                borderWidth: 3
            }
        }
    },
};

let playlist = [];