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
        csvData = data[0];
        wisconsin = data[1];
        milwaukee = data[2];    
        console.log(csvData);
        console.log(wisconsin);
        console.log(milwaukee);

        var WIcounties = topojson.feature(wisconsin, wisconsin.objects.WIcounties).features,
            milwaukeeTracts = topojson.feature(milwaukee, milwaukee.objects.MilwaukeeCounty).features;

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

    
};