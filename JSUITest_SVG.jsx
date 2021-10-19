
/*

    JSUI Test Window
    SVG

    https://extendscript.docsforadobe.dev/integrating-xml/xml-object-reference.html?highlight=XML
*/

#include "jsui.js";

#target photoshop;


// SVG tests

// Affinity Designer
var svgStr = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
+ '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
+ '<svg width="100%" height="100%" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">'
+ '     <g transform="matrix(1,0,0,1,-301,-232)">'
+ '         <g id="DocMetadata" transform="matrix(0.901408,0,0,0.831169,29.6761,39.1688)">'
+ '             <rect x="301" y="232" width="71" height="77" style="fill:none;"/>'
+ '             <g transform="matrix(1.10938,0,0,1.20312,-38.4687,-48.3281)">'
+ '                 <path d="M360,245.45C360,241.89 357.11,239 353.55,239L323.45,239C319.89,239 317,241.89 317,245.45L317,286.55C317,290.11 319.89,293 323.45,293L353.55,293C357.11,293 360,290.11 360,286.55L360,245.45Z" style="fill:rgb(219,219,219);"/>'
+ '             </g>'
+ '             <g transform="matrix(1.10937,0,0,1.20312,141.25,-56.75)">'
+ '                 <text x="158.224px" y="280.02px" style="font-family:\'MyriadPro-Bold\', \'Myriad Pro\', sans-serif;font-weight:700;font-size:24px;">&lt;/&gt;</text>'
+ '             </g>'
+ '         </g>'
+ '     </g>'
+ '</svg>'

// Photoshop "Copy SVG"
// var svgStr = '<svg '
// +'xmlns="http://www.w3.org/2000/svg"'
// +'xmlns:xlink="http://www.w3.org/1999/xlink"'
// +'width="173.42px" height="173.42px">'
// +'<path fill-rule="evenodd"  stroke="rgb(46, 49, 146)" stroke-width="8.28px" stroke-linecap="butt" stroke-linejoin="miter" fill="rgb(165, 195, 47)" '
// +'d="M149.210,148.593 L50.380,164.246 L4.952,75.90 L75.707,4.335 L164.863,49.762 L149.210,148.593 Z"/>'
// +'</svg>"';


var svgxml = new XML(svgStr);

var svgWidth = svg.@width.toString();
var svgHeight = svg.@height.toString();
var svgViewBox = svg.@viewBox.toString(); // .split(" ")
// if($.level) $.writeln( "width: " + svgWidth + "  height:" + svgHeight + "  viewBox: " + svgViewBox);

var svgChildren = svg.children();
var svgElements = svg.elements(); // returns two XML objects (machin, g)
var svgDescendants = svg.descendants();

//var svg_g = svg..("g");
var svg_g = svgDescendants;

// if($.level) $.writeln("g: " + svg_g.length());

for (var i = 0; i < svg_g.length(); i++)
{
  var element = svg_g[i];
  //if($.level) $.writeln( i + ": " + element.toXMLString() + "\n");

  // if XML element has "id" attribute, treat as 
  var nodeName = element.localName(); // returns "g"
  //var nodeName = element.name(); // returns namespace::name

  // if local name is "g"
  if(nodeName == "g")
  {
    var eID = element.@id.toString();
    //var visible = element.@visibility.toString() == "visible";

    if(eID != "") // && visible)
    {
      $.writeln( "\nID: " + eID + "\n" + element.toXMLString() + "\n");
    }
  }

}