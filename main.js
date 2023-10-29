const mapWidth = 1000;
const mapHeight = 800;

const sliderWidth = 900;
const sliderHeight = 100;

let selectedRegion = "World";
let currentYear = 1960;
let g;
let path;
let projection;

function initialiseSVG(){
projection = d3.geoMercator()
    .scale(165)
    .translate([mapWidth / 2 - 20, mapHeight / 1.5]);

path = d3.geoPath(projection);

const mapSVG = d3.select('.map-container').append('svg')
    .attr('width', mapWidth)
    .attr('height', mapHeight);

// d3.select(".map-container svg").style("background-color", "blue");

mapSVG.append('rect')
    .attr('x', 0)
    .attr('y', 1)
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .attr('fill', 'none')
    .attr('stroke', 'black')
    .attr('stroke-width', 4);

g = mapSVG.append('g');


const defs = mapSVG.append('defs');
const noDataPattern = defs.append('pattern')
    .attr('id', 'noDataPattern')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 4)
    .attr('height', 4);

noDataPattern.append('path')
    .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
    .attr('style', 'stroke:black; stroke-width:0.6');

const sliderSVG = d3.select('.slider-container').append('svg')
    .attr('width', sliderWidth)
    .attr('height', sliderHeight);

const handleWidth = 10;

sliderSVG.append("rect")
    .attr("x", (sliderWidth - 400) / 2)
    .attr("y", (sliderHeight - 20) / 2)
    .attr("width", 400)
    .attr("height", 20)
    .attr("fill", "#ddd");

const sliderHandle = sliderSVG.append("rect")
    .attr("x", (sliderWidth - 400) / 2)
    .attr("y", (sliderHeight - 20) / 2)
    .attr("width", handleWidth)
    .attr("height", 20)
    .attr("fill", "#666")
    .call(d3.drag().on("drag", function(event) {
        let x = Math.max((sliderWidth - 400) / 2, Math.min(event.x, (sliderWidth + 400) / 2 - handleWidth));
        d3.select(this).attr("x", x);
    
        const yearScale = d3.scaleLinear()
            .domain([(sliderWidth - 400) / 2, (sliderWidth + 400) / 2 - handleWidth])
            .range([1960, 2021]);
        currentYear = Math.round(yearScale(x));
    
        yearDisplay.text(currentYear);
        updateMap();
    }));

// Year labels on the slider
sliderSVG.append("text").attr("x", (sliderWidth - 400) / 2).attr("y", (sliderHeight - 20) / 2 - 5).attr("text-anchor", "start").text("1960");
sliderSVG.append("text").attr("x", (sliderWidth + 400) / 2).attr("y", (sliderHeight - 20) / 2 - 5).attr("text-anchor", "end").text("2021");

// Display for current year
const yearDisplay = sliderSVG.append("text")
    .attr("x", sliderWidth / 2)
    .attr("y", (sliderHeight - 20) / 2 + 35)
    .attr("text-anchor", "middle")
    .text(currentYear);
}

const employmentLookup = {};

d3.select("#region-dropdown").on("change", function() {
    selectedRegion = d3.select(this).property("value");
    updateProjectionForRegion(selectedRegion);
});

async function loadData(){
    d3.csv("female-employment-to-population-ratio.csv").then(data => {
        data.forEach(d => {
            const countryName = d["Entity"];
            if (!employmentLookup[countryName]) {
                employmentLookup[countryName] = {};
            }
            employmentLookup[countryName][d.Year] = +d["Employment to population ratio, 15+, female (%) (national estimate)"];
        });
        renderMap(selectedRegion);
    }).catch(error => {
        console.error("Error loading CSV data", error);
    });
}

function renderMap(region) {
    Promise.all([
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
        d3.json('https://raw.githubusercontent.com/samayo/country-json/master/src/country-by-continent.json')
    ]).then(([worldAtlasData, continentsArray]) => {
        const countries = topojson.feature(worldAtlasData, worldAtlasData.objects.countries);
        const continentLookup = {};
        continentsArray.forEach(entry => {
            continentLookup[entry.country] = entry.continent;
        });

        const filteredCountries = countries.features.filter(country => {
            if (selectedRegion === 'World') return true;
            const countryName = country.properties.name;
            return continentLookup[countryName] === selectedRegion;
        });        

        const paths = g.selectAll('path').data(filteredCountries, d => d.id);

        paths.enter()
            .append('path')
            .merge(paths)
            .attr('d', path)
            .attr('fill', 'white')
            .attr('stroke', 'black');

        paths.exit().remove();

        updateMap();
    }).catch(error => {
        console.error("Error loading map data", error);
    });
}

function updateProjectionForRegion(region) {
    switch (region) {
        case "Africa":
            projection.center([20, -15]).scale(440);
            break;
        case "Asia":
            projection.center([85, 10]).scale(400);
            break;
        case "Europe":
            projection.center([20, 55]).scale(360);
            break;
        case "North America":
            projection.center([-90, 50]).scale(270);
            break;
        case "South America":
            projection.center([-60, -40]).scale(460);
            break;
        case "Oceania":
            projection.center([140, -40]).scale(700);
            break;
        default:
            projection.center([0, 15]).scale(165);
    }

    renderMap(region);
}

function updateMap() {
    g.selectAll('path').each(function(d) {
        const countryEntityName = d.properties.name;
        const employmentValue = employmentLookup[countryEntityName] ? employmentLookup[countryEntityName][currentYear] : null;
        if (employmentValue != null) {
            d3.select(this).attr('fill', colorScale(employmentValue));
        } else {
            d3.select(this).attr('fill', 'url(#noDataPattern)');
        }
    });
}

let container = d3.select(".map-container");
let gradientWidth = 800;
let xOffset = 200;  // offset to move the bar to the right
let yOffset = 20;
let textOffset = 50;  
let gradientColors = ["#fcfbfd","#efedf5","#dadaeb","#bcbddc","#9e9ac8", "#807dba", "#6a51a3", "#54278f", "rgb(74,20,134)", "#3f007d"];
let colorScale;
let segmentWidth = gradientWidth / gradientColors.length;

function drawLegend() {
    container = d3.select(".color-gradient-bar");
    let legend = container.append("svg")
        .attr("id", "legend")
        .attr("width", "1200")
        .attr("height", "100");

    colorScale = d3.scaleQuantize()
        .domain([0, 100])  
        .range(gradientColors);

    gradientColors.forEach((color, i) => {
        legend.append("rect")
            .attr("x", xOffset + (i * segmentWidth))
            .attr("y", yOffset)
            .attr("width", segmentWidth)
            .attr("height", "50")
            .style("fill", color)
            .attr("stroke", "black")
            .attr("stroke-width", "1");
    });

    const intervals = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    intervals.concat([0, 100]).forEach((position) => {
        legend.append("text")
            .attr("x", (position / 100) * gradientWidth + xOffset + textOffset - (segmentWidth / 2))
            .attr("y", 90)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .text(position + "%");
    });

    legend.append("rect")
        .attr("x", 10)  
        .attr("y", yOffset)
        .attr("width", segmentWidth)
        .attr("height", "50")
        .style("fill", "url(#noDataPattern)") 
        .attr("stroke", "black")
        .attr("stroke-width", "1");

    legend.append("text")
        .attr("x", 45) 
        .attr("y", 95)
        .attr("font-size", "22px")
        .attr("text-anchor", "middle")
        .text("No data");
}

////
// const poemContent = [
//     ["Line 1 of verse 1", "Line 2 of verse 1", "Line 3 of verse 1", "Line 4 of verse 1"],
//     ["Line 1 of verse 2", "Line 2 of verse 2"],
// ];

let keyframeIndex = 0;

let keyframes = [
    {
        activeVerse: 1, 
        activeLines: [1, 2, 3, 4]
    }
];

document.getElementById('forward-button').addEventListener('click', forwardClicked);
document.getElementById('backward-button').addEventListener('click', backwardClicked);

function forwardClicked() {
    if (keyframeIndex < keyframes.length - 1) {
        keyframeIndex++;
        console.log("Forward Clicked, Keyframe Index:", keyframeIndex); 
        drawKeyframe(keyframeIndex);
    }
}

function backwardClicked() {
    if (keyframeIndex > 0) {
        keyframeIndex--;
        console.log("Backward Clicked, Keyframe Index:", keyframeIndex); 
        drawKeyframe(keyframeIndex);
    }
}

function drawKeyframe(kfi) {
    console.log("Drawing keyframe:", kfi); 
    let kf = keyframes[kfi];
  
    // Reset poem verses and lines
    resetActiveLines();
  
    kf.activeLines.forEach(line => {
        updateActiveLine(kf.activeVerse, line);
    });
}

function resetActiveLines(){
    d3.selectAll(".line").classed("active-line", false);
}

function updateActiveLine(vid,lid){
    let thisVerse = d3.select("#verse" + vid);
    thisVerse.select("#line" + lid).classed("active-line", true);
}   

// TODO write a function to initialise the svg properly
async function initialise() {

    // TODO load the data
    await loadData();

    // TODO initalise the SVG
    initialiseSVG();

    drawLegend();

     // TODO draw the first keyframe
    drawKeyframe(keyframeIndex);
}


initialise();
