//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

     //map frame dimensions
     var width = 960,
     height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create cylindrical equal area project centered on Milwaukee
    var projection = d3.geoCylindricalEqualArea()
        .parallel(0)
        .translate([width / 2, height / 2])
        .fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], {type: "Sphere"})
        .precision(0.1);
        

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];    
    promises.push(d3.csv("data/MilwaukeeCounty.csv")); //load attributes from csv    
    promises.push(d3.json("data/WIcounties.topojson")); //load background spatial data
    promises.push(d3.json("data/MilwaukeeCounty.topojson")); //load choropleth spatial data    
    Promise.all(promises).then(callback);
  

    function callback(data){    
        var csvData = data[0], wisconsin = data[1], milwaukee = data[2];    

        //translate WI and Milwaukee County TopoJSON
        var WIcounties = topojson.feature(wisconsin, wisconsin.objects.WIcounties).features,
        milwaukeeTracts = topojson.feature(milwaukee, milwaukee.objects.MilwaukeeCounty).features;
            
        //place graticule on the map
        setGraticule(map, path);

        //join csv data to GeoJSON enumeration units
        var milwaukeeTracts = joinData(milwaukeeTracts, csvData);

        //create the color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units to the map
        setEnumerationUnits(milwaukeeTracts, map, path);
    };
}; //end of setMap()

function setGraticule(map, path){
    //...GRATICULE BLOCKS FROM Week 8
};

function joinData(milwaukeeTracts, csvData){
    

    //variables for data join
    var attrArray = ["Pct_Pov", "Pct_HS25", "Pct_Bach25", "Med_Inc", "Pct_UE16"];

    //loop through csv to assign each set of csv attribute values to geojson tract
    for (var i=0; i<csvData.length; i++){
        var csvTract = csvData[i]; //the current tract
        var csvKey = csvTract.GEO_ID; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<milwaukeeTracts.length; a++){

            var geojsonProps = milwaukeeTracts[a].properties; //the current tract geojson properties
            var geojsonKey = geojsonProps.GEO_ID; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvTract[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };

    return milwaukeeTracts;
};

function setEnumerationUnits(milwaukeeTracts, map, path){
    //add WI counties to map
    var counties = map.append("path")
    .datum(WIcounties)
    .attr("class", "counties")
    .attr("d", path);

    //add Milwaukee census tracts to map
    var tracts = map.selectAll(".tracts")
        .data(milwaukeeTracts)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "tracts " + d.properties.GEO_ID;
        })
        .attr("d", path);
};   
