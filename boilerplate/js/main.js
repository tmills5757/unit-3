//wrap everything is immediately invoked anonymous function so nothing is in global scope
(function () {
    //pseudo-global variables
    var attrArray = ["Poverty rate", "High school graduation rate", "Percent of adults with bachelor's degree", 
        "Median income (in thousands of dollars)", "Unemployment rate"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.600,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear().range([463, 0]).domain([0, 110]);

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {
        //map frame dimensions
        var width = window.innerWidth * 0.300,
            height = 460;

        //create new svg container for the map
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        var projection = d3
            .geoAlbers()
            .center([0.0, 43])
            .rotate([87.85, -0.0, 0])
            .parallels([42.0, 44.19])
            .scale(50000.0)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/MilwaukeeCounty.csv")); //load attributes from csv
        promises.push(d3.json("data/WIcounties.topojson")); //load background spatial data
        promises.push(d3.json("data/MilwaukeeCounty.topojson")); //load choropleth spatial data
        Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0],
                wisconsin = data[1],
                milwaukee = data[2];

            //place graticule on the map
            setGraticule(map, path);

            //translate WI and Milwaukee County TopoJSON
            var WIcounties = topojson.feature(wisconsin, wisconsin.objects.WIcounties_proj),
                milwaukeeTracts = topojson.feature(
                    milwaukee,
                    milwaukee.objects.MilwaukeeCounty_proj
                ).features;

            //add WI counties to map
            var counties = map
                .append("path")
                .datum(WIcounties)
                .attr("class", "counties")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            milwaukeeTracts = joinData(milwaukeeTracts, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(milwaukeeTracts, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add dropdown menu to the map
            createDropdown(csvData);
        }
    } //end of setMap()

    function setGraticule(map, path) {
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
    }

    function joinData(milwaukeeTracts, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson tract
        for (var i = 0; i < csvData.length; i++) {
            var csvTract = csvData[i]; //the current tract
            var csvKey = csvTract.GEOID; //the CSV primary key

            //loop through geojson tracts to find correct tract
            for (var a = 0; a < milwaukeeTracts.length; a++) {
                var geojsonProps = milwaukeeTracts[a].properties; //the current tract geojson properties
                var geojsonKey = geojsonProps.GEOID; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {
                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvTract[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                }
            }
        }

        return milwaukeeTracts;
    }

    function setEnumerationUnits(milwaukeeTracts, map, path, colorScale) {
        //add Milwaukee census tracts to map
        var tracts = map
            .selectAll(".tracts")
            .data(milwaukeeTracts)
            .enter()
            .append("path")
            .attr("class", function (d) {
                //console.log(d.properties.GEOID);
                return "tracts " + "t" + d.properties.GEOID;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        //add style descriptor to each path
        var desc = tracts.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}');
    }

    //function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = ["#f6eff7", "#bdc9e1", "#67a9cf", "#1c9099", "#016c59"];

        //create color scale generator
        var colorScale = d3.scaleQuantile().range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    }

    /*
    function makeChart(pack,data,d3,width,height,DOM,color,format) {
        const root = pack(data);
      
        const svg = d3.create("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("font-size", 10)
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle");
    
        const leaf = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
            .attr("transform", d => `translate(${d.x + 1},${d.y + 1})`);
    
        leaf.append("circle")
            .attr("id", d => (d.leafUid = DOM.uid("leaf")).id)
            .attr("r", d => d.r)
            .attr("fill-opacity", 0.7)
            .attr("fill", d => color(d.data.group));
    
        leaf.append("clipPath")
            .attr("id", d => (d.clipUid = DOM.uid("clip")).id)
        .append("use")
            .attr("xlink:href", d => d.leafUid.href);
    
        leaf.append("text")
            .attr("clip-path", d => d.clipUid)
        .selectAll("tspan")
        .data(d => d.data.name.split(/(?=[A-Z][a-z])|\s+/g))
        .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
            .text(d => d);
    
        leaf.append("title")
            .text(d => `${d.data.title === undefined ? "" : `${d.data.title}
    `       }${format(d.value)}`);
        
        return svg.node();
    }

    function(d3,width,height){return(
        data => d3.pack()
            .size([width - 2, height - 2])
            .padding(3)
          (d3.hierarchy({children: data})
            .sum(d => d.value))
        )};
    */

    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.600,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3
            .select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart
            .append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear().range([463, 0]).domain([0, 100]);

        //set bars for each tract
        var bars = chart
            .selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + "t" + d.GEOID;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        //add style descriptor to each rect
        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');

        //create a text element for the chart title
        var chartTitle = chart
            .append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " by census tract"); //changes with each variable

        //create vertical axis generator
        var yAxis = d3.axisLeft().scale(yScale);

        //place axis
        var axis = chart.append("g").attr("class", "axis").attr("transform", translate).call(yAxis);

        //create frame for chart border
        var chartFrame = chart
            .append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    } //end of setChart()

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData) {
        //add select element
        var dropdown = d3
            .select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData);
            });

        //add initial option
        var titleOption = dropdown
            .append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown
            .selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) {
                return d;
            })
            .text(function (d) {
                return d;
            });
    }

    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var tracts = d3
            .selectAll(".tracts")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        //Sort, resize, and recolor bars
        var bars = d3
            .selectAll(".bar")
            //Sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function (d, i) {
                return i;
            })
            .duration(1000);

        updateChart(bars, csvData.length, colorScale);
    } //end of changeAttribute()

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale) {
        //position bars
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        var chartTitle = d3
            .select(".chartTitle")
            .text(expressed + " by census tract"); //changes with each variable
    }

    //function to highlight enumeration units and bars
    function highlight(props) {
        //console.log(props);
        //change stroke
        var selected = d3
            .selectAll(".t" + props.GEOID)
            .style("stroke", "blue")
            .style("stroke-width", "2");

        setLabel(props);
    }

    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3
            .selectAll(".t" + props.GEOID)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];

            
        }

        //remove info label
        d3.select(".infolabel").remove();
    }
    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3
            .select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", "t" + props.GEOID + "_label")
            .html(labelAttribute);
        // console.log(infolabel.html);

        var tractName = infolabel.append("div").attr("class", "labelname").html(props.name);
    }

    //function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel").node().getBoundingClientRect().width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }
})();
