/*

    JSUI Test Window
    JSON


*/
#target photoshop;

#include "jsui.js";

JSUI.TOOLNAME = "JSUI JSON Test";
JSUI.populateJSON();

JSUI.PREFS = {};
JSUI.PREFS.exampleBoolean = true;
JSUI.PREFS.exampleString = "oh HAI iz <STRING> lol"; // "Hi!";
JSUI.PREFS.exampleNumber = 123.45;
JSUI.PREFS.exampleStrArr = [ "one", "two", "three"];
JSUI.PREFS.exampleNumArr = [ 1, 2, 3];
JSUI.PREFS.exampleBoolArr = [ true, true, false];

Main();

function Main()
{
    // testing JSON stuff
    var obj = {};
    obj.exampleBoolean = true;
    obj.exampleNumber = 1.23;
    obj.exampleString = "oh HAI iz <STRING> lol";
     obj.exampleStrArr = [ "one", "two", "three"];
     obj.exampleNumArr = [ 1, 2, 3];
     obj.exampleBoolArr = [ true, true, false];
     obj.exampleObj = { iDoLoveCats: true, howMany: 8 };

    // convert object to JSON string
    var jsonStr = JSON.stringify ( obj );

  //  JSUI.alert(jsonStr);
  if($.level) $.writeln(jsonStr);

  /* results:

  {
    "exampleBoolean":true,
    "exampleNumber":1.23,
    "exampleString":"oh%20HAI%20iz%20%3CSTRING%3E%20lol",
    "exampleStrArr":["one", "two", "three"],
    "exampleNumArr":[1, 2, 3],
    "exampleBoolArr":[true, true, false]
  }

  */

  // store custom object 
    JSUI.writeJSONfile( JSUI.JSONFILE, obj );

  
    // store internal preferences to JSON
    //JSUI.saveJSONfile();  // equivalent of JSUI.writeJSONfile( JSUI.JSONFILE, JSUI.PREFS );

   // read back data from JSON file
  var newObj = JSUI.readJSONfile( {}, JSUI.JSONFILE );
  JSUI.reflectProperties( newObj, "\nNEW OBJECT FROM JSON FILE");

  /*

  NEW OBJECT FROM JSON FILE
    exampleBoolean:		true	                  	[boolean]
    exampleString:		oh HAI iz <STRING> lol		[string]
    exampleNumber:		123.45		                [number]
    exampleStrArr:		one,two,three		          [array]
    exampleNumArr:		1, 2, 3		                [array]
    exampleBoolArr:		true, true, false		      [array]

  */
};