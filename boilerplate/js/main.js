//wrap everything is immediately invoked anonymous function so nothing is in global scope
(function (){

    //pseudo-global variables
    var attrArray = ["Pct_Pov", "Pct_HS25", "Pct_Bach25", "Med_Inc", "Pct_UE16"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    
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

        var projection = d3.geoAlbers()
        .center([0.00, 43])
        .rotate([87.75, -0.00, 0])
        .parallels([42.00, 44.19])
        .scale(50000.00)
        .translate([width / 2, height / 2]);

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
            
            //place graticule on the map
            setGraticule(map, path);

            //translate WI and Milwaukee County TopoJSON
            var WIcounties = topojson.feature(wisconsin, wisconsin.objects.WIcounties_proj),
            milwaukeeTracts = topojson.feature(milwaukee, milwaukee.objects.MilwaukeeCounty_proj).features;

            //add WI counties to map
            var counties = map.append("path")
            .datum(WIcounties)
            .attr("class", "counties")
            .attr("d", path);

            //join csv data to GeoJSON enumeration units
            milwaukeeTracts = joinData(milwaukeeTracts, csvData);
            //console.log(milwaukeeTracts);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(milwaukeeTracts, map, path, colorScale);
        };
    }; //end of setMap()

    function setGraticule(map, path){
        var graticule = d3.geoGraticule().step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map
        .append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path); //project graticule

        //create graticule lines
        var gratLines = map
            .selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };

    function joinData(milwaukeeTracts, csvData){

        //loop through csv to assign each set of csv attribute values to geojson tract
        for (var i=0; i<csvData.length; i++){
            var csvTract = csvData[i]; //the current tract
            var csvKey = csvTract.GEOID; //the CSV primary key
            

            //loop through geojson tracts to find correct tract
            for (var a=0; a<milwaukeeTracts.length; a++){

                var geojsonProps = milwaukeeTracts[a].properties; //the current tract geojson properties
                var geojsonKey = geojsonProps.GEOID; //the geojson primary key

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

    function setEnumerationUnits(milwaukeeTracts, map, path, colorScale){
        //add Milwaukee census tracts to map
        var regions = map.selectAll(".tracts")        
            .data(milwaukeeTracts)        
            .enter()        
            .append("path")        
            .attr("class", function(d){            
                return "tracts " + d.properties.GEOID;        
            })        
            .attr("d", path)        
                .style("fill", function(d){            
                    var value = d.properties[expressed];            
                    if(value) {                
                        return colorScale(d.properties[expressed]);            
                    } else {                
                        return "#ccc";            
                    }    
        });

    };   

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            //console.log(val);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };


})();


