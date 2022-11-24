/*
	Pslib.jsx
	Adobe Photoshop/Illustrator/Bridge ExtendScript Library for working with XMP and CEP dev
	Source: https://github.com/geeklystrips/pslib

	- Per-layer metadata management: access, create, remove... 
	- Document-based XMP
	
	-----

	Copyright (c) 2015, geeklystrips@gmail.com
	All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

	2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


	http://www.opensource.org/licenses/bsd-license.php

	-----

	TODO
	- add support for standalone .XMP files (?)

	- working on an advanced version of the layer metadata editor, might end up with separate apps
	- will eventually need a way to copy/move chunks of xmp data from one layer to another layer, and from layer to containing document

	- use .canPutXMP() method to determine if string size is compatible
	- robust support for storing more complex data types (arrays as Bag/Seq/Alt, objects as Struct)

	- Pslib.setXmpProperties() should be able to determine that the target is an xmpMeta object instead of a document or layer,  
		and just modify it without getting/setting 
	
	2017-09 updates 
	
	(0.41)
	- replaced "custom" namespace by geeklystrips.com
	- added Pslib.getPropertiesArray() function to iterate through and return all present properties and their values for given namespace (knowing property names is not required)
	- added Pslib.deleteXmpProperties() which also uses Pslib.getPropertiesArray() 
	- added Pslib.propertiesToCSV() to dump properties and their values to CSV text file.
	
	(0.42)
	- fixed issue with getXmpProperties() looping routine  
	
	(0.43)
	- updated LayerMetadataEditor.jsx to support document-level XMP
	- added DocumentMetadataEditor.jsx (useDoc boolean, includes LayerMetadataEditor.jsx)
	- restored XmpWhitespace thingie as part of the main library 
	- added CS6 & CC-specific color references because, why not
	- added encode/decodeURI routines
	- activated cTID/sTID functions
	- added Pslib.getDocumentPath();
	- added Pslib.isPSCS4andAbove boolean
	
	(0.44)
	- updated LayerMetadataEditor.jsx:
		- added default close button to dialog window declaration
		- added icons for relevant functions
		- propertylist and property/value fields now update properly when XMP object is removed from layer.
        - added "Load from CSV" function
        
    (0.5)
	- Pslib.propertiesToCSV() upgraded to UTF-8 format
	
	(0.6)
	- added Illustrator document-level XMP editing support.
	- added Pslib.getXmpDictionary() to allow working with predefined key/value sets
	- performances: checking for .isBackgroundLayer status creates issues and delays, and somehow promotes the background layer to a normal layer anyway
	  it's best to let the try/catch blocks handle it for the cases where it will be actually useful

	(0.61)
	- bugfix for XMP to XML dump (was wrongly using XMPmeta since Illustrator support was added)

	(0.62)
	- WIP support for working with more complex data types

	(0.63)
	- removed try-catch block for creating Pslib object
	- added Pslib.getFileXmp() to work with XMP references for files which are not actively open in Photoshop / Illustrator

	(0.64)
	- added Photoshop artboard-specific stuff
	- tweaking xmp functions so they can use a provided namespace if present


*/

/*
// using and adding functions to Pslib object -- whether or not the library has been loaded
// this technique makes it easier to create and stabilize additional subfunctions separately before integrating them
try
{
	// this will throw an exception if Pslib cannot be found
	// a try/catch is necessary to achieve this, because a simple if(Pslib == undefined) will halt execution
	var attempt = Pslib != undefined;
}
catch(e)
{
	// if we have an error here, it's most likely because we didn't include the library in the preceding statements
	// the current script might be part of an include by a script loaded beforehand

	// $.level == 0 if the script is run by Photoshop, == 1 if run by ExtendScript ToolKit or Visual Studio Code
	// if ESTK, then write to console for easier debugging
	// if($.level) $.writeln("Pslib library object not found. Creating placeholder.");
	
	// errors are objects that can give you some information about what went wrong 
	//$.writeln("typeof e.message: " + typeof e.message + "\n\ne:\n" + e + "\n\ne.message:\n" + e.message);
	//if($.level) $.writeln(e);
	
	// create Pslib as a persistent object 
	// it will remain accessible across most scopes, which is useful when working with panels & actions
	// 
	Pslib = function(){};
}
*/
// do this the json way instead for perfs?
// if undefined, no exception thrown / no interruption
if (typeof Pslib !== "object") {
    Pslib = {};
	// alert("Pslib object created");
}

// library version, used in tool window titles. Maybe.
Pslib.version = 0.64;
Pslib.isPs64bits = BridgeTalk.appVersion.match(/\d\d$/) == '64';

Pslib.isPhotoshop = app.name == "Adobe Photoshop";
Pslib.isIllustrator = app.name == "Adobe Illustrator";
Pslib.isBridge = app.name == "Adobe Bridge";

if(Pslib.isPhotoshop)
{
	// these functions are often required when working with code obtained using the ScriptingListener plugin
	cTID = function(s) {return app.charIDToTypeID(s);}
	sTID = function(s) {return app.stringIDToTypeID(s);}

	// 
	function selectByID(id, add) {
		if (add == undefined) add = false;
		var desc1 = new ActionDescriptor();
		var ref1 = new ActionReference();
		ref1.putIdentifier(cTID('Lyr '), id);
		desc1.putReference(cTID('null'), ref1);
		if (add) desc1.putEnumerated(sTID("selectionModifier"), sTID("selectionModifierType"), sTID("addToSelection"));
		executeAction(cTID('slct'), desc1, DialogModes.NO);
	};
	
	// from xbytor
	function getActiveLayerID() {
		var ref = new ActionReference();
		ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
		var ldesc = executeActionGet(ref);
		return ldesc.getInteger(cTID('LyrI'));
	};

	//
	function getArtboardBounds( id )
	{
		var artboard = selectByID( id );
        artboard = app.activeDocument.activeLayer;

		var r    = new ActionReference();    
		r.putProperty(sTID("property"), sTID("artboard"));
		if (artboard) r.putIdentifier(sTID("layer"), artboard.id);
		else       r.putEnumerated(sTID("layer"), sTID("ordinal"), sTID("targetEnum"));
		var d = executeActionGet(r).getObjectValue(sTID("artboard")).getObjectValue(sTID("artboardRect"));
		var bounds = new Array();
		bounds[0] = d.getUnitDoubleValue(sTID("top"));
		bounds[1] = d.getUnitDoubleValue(sTID("left"));
		bounds[2] = d.getUnitDoubleValue(sTID("right"));
		bounds[3] = d.getUnitDoubleValue(sTID("bottom"));
		return bounds;
	}

	function getArtboards()
	{
		var artboards = [];

		try{
			var ar = new ActionReference();
			ar.putEnumerated(cTID("Dcmn"), cTID("Ordn"), cTID("Trgt"));
			var appDesc = executeActionGet(ar);
			var numOfLayers = appDesc.getInteger(sTID("numberOfLayers"));

			for(var i = 1; i <= numOfLayers; i++) {
				var ar = new ActionReference();
				ar.putIndex(cTID("Lyr "), i);// 1-base
				var dsc = executeActionGet(ar);
				var id = dsc.getInteger(sTID('layerID'));
				var name = dsc.getString(sTID('name'));
				var isAb = dsc.getBoolean(sTID("artboardEnabled"));

				if (isAb) {
					artboards.push([ id, name ]);
					// artboards.push( { id: id, name: name });
				}
			}

		}catch(e){
			if($.level) $.writeln("EXCEPTION: ", e);
		}

		return artboards;
	}

	// get asset path based from ~/generator.js if found
	function getAssetsPath()
	{
		var generatorConfigFile = new File("~/generator.js");
		var cfgObj = {};
		var gao = {};
		var baseDirectory = undefined;

		if(generatorConfigFile.exists)
		{
			try
			{
				var str = JSUI.readFromFile(generatorConfigFile, "UTF-8");

				cfgObj = JSON.parse(str.replace("module.exports = ", ""));
				gao = cfgObj["generator-assets"];
				baseDirectory = gao["base-directory"];

			}
			catch(e)
			{
				if($.level) $.writeln("Error parsing generator.js");
			}
		}
		return baseDirectory;
	}


    // get individual artboard metrics and info (including XMP)
    function getArtboardSpecs(layer, parentFullName, namespace)
    {
        var doc = app.activeDocument;

        var obj = {};

        obj.name = layer.name;
        obj.index = layer.id;

        try
        {        
            var bounds = getArtboardBounds(layer.id);

            //.as('px') doesn't work...?
            obj.x = bounds[0];
            obj.y = bounds[1];
            obj.width = bounds[2] - bounds[1];
            obj.height = bounds[3] - bounds[0];
            // obj.artboardRect = [ bounds[0], bounds[1], bounds[2], bounds[3]];
        }
        catch(e)
        {
            if($.level) $.writeln("Error getting specs for arboard " + layer.name + " \n\n" + e); 

            // force minimal specs / document W x H
            obj.x = 0;
            obj.y = 0;
            obj.width = doc.width.as("px");
            obj.height = doc.height.as("px");
            // obj.artboardRect = [ 0, 0, obj.width, obj.height];
        }
            
        obj.parent = doc.name;
        // obj.parentFullName = doc.fullName.toString();
        obj.parentFullName = parentFullName.toString();

        // if you need placeholder specs, get them here
        // 9SS status

        // get object-level XMP

        // do NOT use an object as template when also using JSUI (what a mess)
       var dictionary = Pslib.getXmpDictionary( layer, { assetID: null, source: null, hierarchy: null, specs: null, custom: null }, false, false, false, namespace ? namespace : Pslib.XMPNAMESPACE);
      
       // no empty strings allowed and no null values
        // var dictionary = Pslib.getXmpDictionary( layer, ["assetID", "source", "hierarchy", "specs", "custom" ], false, false, false);

        // need a version of this feature that will NOT loop through all Object.components
        //var dictionary = Pslib.getXmpDictionary( layer, [ ["assetID", null], ["source", null], ["hierarchy", null], ["specs", null], ["custom", null] ], false);//, true, typeCaseBool)
        
        // only pass dictionary if tags are present

        // function isEmptyObject(obj){
        //     return JSON.stringify(obj) === '{\n\n}';
        // }

        // if(obj.hasOwnProperty("tags"))
        // if(!isEmptyObject(dictionary))
        if(!JSUI.isObjectEmpty(dictionary))
        {
            obj.tags = dictionary;
        }


        if($.level) $.writeln("LayerID " + obj.index + ": " + obj.name + " (w:" + obj.width +" h:" + obj.height + ") (x:" + obj.x +" y:" + obj.y + ")" ); //"  rect: " + obj.artboardRect);
        return obj;
    }



}
else
{
	// just use placeholders for the rest
	cTID = function(){};
	sTID = function(){};
	selectByID = function(){};
	getActiveLayerID = function(){};
	getArtboardBounds = function(){};
	getArtboards = function(){};
	getAssetsPath = function(){};
	getArtboardSpecs = function(){};
}

// metadata is only supported by Photoshop CS4+
Pslib.isPsCS4andAbove = Pslib.isPhotoshop && parseInt(app.version.match(/^\d.\./)) >= 11;

// here's some more stuff that can be useful
Pslib.isPsCCandAbove = Pslib.isPhotoshop && parseInt(app.version.match(/^\d.\./)) >= 14; 
Pslib.isPsCS6 = (Pslib.isPhotoshop && app.version.match(/^13\./) != null);
Pslib.isPsCS5 = (Pslib.isPhotoshop && app.version.match(/^12\./) != null);
Pslib.isPsCS4 = (Pslib.isPhotoshop && app.version.match(/^11\./) != null);
Pslib.isPsCS3 = (Pslib.isPhotoshop  && app.version.match(/^10\./) != null);

// Ps & Ai 2020+
Pslib.is2020andAbove = Pslib.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 21) : (parseInt(app.version.match(/^\d.\./)) >= 24); 

// 2022 for CEP 11
Pslib.is2022andAbove = Pslib.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 23) : (parseInt(app.version.match(/^\d.\./)) >= 26); 

// #############  PER-LAYER METADATA FUNCTIONS

// define default namespace
Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
Pslib.XMPNAMESPACEPREFIX = "gs:";

// for replacing huge whitespace chunk in XMP
var XmpWhitespace = "                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                                                                                                    \
                           ";
				   

// default colors
Pslib.dark = [0, 0, 0];
Pslib.light = [1.0, 1.0, 1.0];

// if Photoshop-version specific colors (I have too much time on my hands!)
if(Pslib.isPsCS3)
{
	Pslib.dark = [0.18823529411765, 0.44705882352941, 0.72549019607843]; //3072b9
}
else if(Pslib.isPsCS4)
{
	Pslib.dark = [0.07058823529412, 0.49019607843137, 0.78823529411765]; //127dc9
}
else if(Pslib.isPsCS5)
{
	Pslib.dark = [0.0, 0.39607843137255, 0.72156862745098]; //0065b8
	Pslib.light = [0.36078431372549, 0.81176470588235, 0.94901960784314];  //5ccff2
}
else if(Pslib.isPsCS6)
{
	Pslib.dark = [0.16862745098039, 0.13725490196078, 0.43137254901961]; //0c1173
	Pslib.light = [0.6078431372549, 0.8, 1.0];  //9bccff
}
else if(Pslib.isPsCCandAbove)
{
	Pslib.dark = [0.0, 0.08627450980392, 0.17647058823529]; //00162d
	Pslib.light = [0.0, 0.76470588235294, 0.9843137254902]; //00c3fb
}

// register custom namespace
try
{
	// load library
	 if(!ExternalObject.AdobeXMPScript)
	{
		ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	}

	// register custom namespace
	XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);
}
catch(e)
{
	// if ExternalObject.AdobeXMPScript not present, hardcode the namespace to exif
	Pslib.XMPNAMESPACE = "http://ns.adobe.com/exif/1.0/";
}

// load XMP
Pslib.loadXMPLibrary = function()
{
   if (!ExternalObject.AdobeXMPScript)
   {
      try
	{
         if($.level) $.writeln("Loading XMP Script Library");
         ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	  return true;
      }
	catch (e)
	{
         if($.level) $.writeln("Error loading XMP Script Library\n" + e);
         return false;
      }
   }
	return true;
};

// unload XMP
Pslib.unloadXMPLibrary = function()
{
   if(ExternalObject.AdobeXMPScript) 
   {
      try
      {
	   if($.level) $.writeln("Unloading XMP Script Library");
         ExternalObject.AdobeXMPScript.unload();
         ExternalObject.AdobeXMPScript = undefined;
	   return true;
      }
      catch(e)
      {
         if($.level) $.writeln("Error unloading XMP Script Library\n" + e);
		return false;
      }
   }
};

// get target's existing XMP if present // assumes you're working with a file that's already open in Photoshop or Illustrator
Pslib.getXmp = function (target, createNew)
{
	var target = (target == undefined ? app.activeDocument.activeLayer : target);
	var createNew = (createNew == undefined ? false : createNew);
	var xmp;
	
	// if library loads without problem, proceed to get the layer's xmpMetadata
	if(Pslib.loadXMPLibrary())
	{
		try
		{
			if($.level) $.writeln("Attempting to get metadata for target \"" + target.name + "\"");
			xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata could not be found for target \"" + target.name + "\"" + (createNew ? "\nCreating new XMP object." : "") );
			if(createNew) xmp = new XMPMeta();
		}

		return xmp;
	}
	else
	{
		return xmp;
	}
};

// get property: returns a string
Pslib.getXmpProperty = function (target, property, namespace)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var value;
		var xmp;
		
		// access metadata
		try
		{
			xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
			value = decodeURI(xmp.getProperty(namespace ? namespace : Pslib.XMPNAMESPACE, property));
			return value;
		
		} catch( e ) {
			if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\"");
			return null;
		}
	}
	else
	{
		return null;
	}
};

// delete specific property
Pslib.deleteXmpProperty = function (target, property, namespace)
{
	// load library
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var xmp = Pslib.getXmp(target);
		
		try
		{
			xmp.deleteProperty(namespace ? namespace : Pslib.XMPNAMESPACE, property);
			if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
			else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
			return true;
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata property could not be deleted from target \"" + target.name + "\"");
			return false;
		}
	}
	else
	{
		return false;
	}
};

// delete array of properties
Pslib.deleteXmpProperties = function (target, propertiesArray, namespace)
{	
	// load library
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var xmp = Pslib.getXmp(target);
		
		try
		{
			for(var i = 0; i < propertiesArray.length; i++)
			{
				report += (+ "\t" + propertiesArray[i][1] + "\n");
				xmp.deleteProperty(namespace ? namespace : Pslib.XMPNAMESPACE, propertiesArray[i][0]);
			}

			if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
			else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
				
			return true;
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata properties could not be removed from target \"" + target.name + "\"");
			return false;
		}
	}
	else
	{
		return false;
	}
};

// set multiple properties
// expects a two-dimensional array
Pslib.setXmpProperties = function (target, propertiesArray, namespace)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var prop;
		var val;
		var xmp;
		
		// access metadata
		try
		{
		//    xmp = new XMPMeta( target.xmpMetadata.rawData );
		   xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} catch( e ) 
		{
		//	if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new floating XMP container.");
			xmp = new XMPMeta(  );
		}
	   
		// loop through array properties and assign them
		if($.level) $.writeln("\nLooping through properties...");
		for (var i = 0; i < propertiesArray.length; i++)
		{	
			prop = propertiesArray[i][0];
			val = encodeURI(propertiesArray[i][1]);
			
			// modify metadata
			try
			{
				var propertyExists = xmp.doesPropertyExist(namespace ? namespace : Pslib.XMPNAMESPACE, prop);
				
				// add new property if not found
				if(!propertyExists)
				{
					xmp.setProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tadding [" + prop + ": " + val +"]  " + typeof val);
				}
				// if property found and value different, update
				else if(propertyExists && decodeURI(xmp.getProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop).toString()) != val.toString() )
				{
					xmp.setProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tupdating [" + prop + ": " + val +"]  " + typeof val);
				}
				else
				{
					if($.level) $.writeln("\tno change to existing property [" + prop + ": " + val +"]  " + typeof val);
				}
			} 
			catch( e )
			{
				var msg = "Could not place metadata property on provided target.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			//    else alert(msg);
			   return false;
			}
		}

		// apply and serialize
		if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
		else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
		// if($.level) $.writeln("Provided properties were successfully added to object \"" + target.name + "\"");


		return true;
	}
	else
	{
		return false;
	}
};

// get multiple properties
// expects a two-dimensional array, returns an updated copy of that array
Pslib.getXmpProperties = function (target, propertiesArray, namespace)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var prop;
		var val;
		var xmp;
		var updatedArray = [];
		
		// access metadata
		try
		{
		   xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
			xmp = new XMPMeta(  );
		}
	   
		// loop through array properties and assign them
		if($.level) $.writeln("\nLooping through properties...");
		for (var i = 0; i < propertiesArray.length; i++)
		{	
			prop = propertiesArray[i][0];
			val = undefined;
			
			// modify metadata
			try
			{
				var propertyExists = xmp.doesPropertyExist(namespace ? namespace : Pslib.XMPNAMESPACE, prop);
				
				// add new property if not found
				if(propertyExists)
				{
					val = decodeURI(xmp.getProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop));
					if($.level) $.writeln("\tgetting property: [" + prop + ": " + val +"]  " + typeof val);
					
					if($.level) $.writeln("\t" + propertiesArray[i][0]+ ": " + val + "\n");
					updatedArray.push([propertiesArray[i][0], val]);
				}
				else
				{
					// if($.level) $.writeln("\tProperty not found [" + prop + ": " + val +"]  " + typeof val);
					updatedArray.push([propertiesArray[i][0], null]);
				}
			} 
			catch( e )
			{
				var msg = "Could not fetch metadata property from provided object.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			   return null;
			}
		}
		return updatedArray;
	}
	else
	{
		return null;
	}
};

// returns bidimensional array of properties/values present in provided namespace
// useful for debugging and building UI windows
Pslib.getPropertiesArray = function (target, namespace, nsprefix)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var xmp;
		var propsArray = [];
		// var propsReport = "";
		
		// access metadata
		try
		{
		   xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
			return null;
		}
	
		// XMPConst.ITERATOR_JUST_CHILDREN	XMPConst.ITERATOR_JUST_LEAFNODES	XMPConst.ITERATOR_JUST_LEAFNAMES	XMPConst.ITERATOR_INCLUDE_ALIASES
		var xmpIter = xmp.iterator(XMPConst.ITERATOR_JUST_CHILDREN, namespace ? namespace : Pslib.XMPNAMESPACE, "");
		var next = xmpIter.next();

		if($.level) $.writeln("\nGetting list of XMP properties for XMP namespace " + (nsprefix ? nsprefix : Pslib.XMPNAMESPACEPREFIX) + "\n");
		while (next)
		{
			var propName = next.path.replace( (nsprefix ? nsprefix : Pslib.XMPNAMESPACEPREFIX), "" ); 
			var propValue = decodeURI(next);
			propsArray.push([propName, propValue]);
			// propsReport += (propName + "\t" + propValue + "\n");
			next = xmpIter.next();
		}
	
		// if($.level) $.writeln(propsReport);
		// if($.level) $.writeln("Properties successfully fetched from object \"" + target.name + "\"");
		
		return propsArray;
	}
	else
	{
		return null;
	}
};


// returns dictionary object with XMP property values if found (each is null if not found, unless allowEmptyString = true)
// favors object-notation as input, but also supports unidimensional and bidimensional arrays
//      var dictionary = { propertyname1: null, propertyname2: null, propertyname3: null }
//      var oneDimensionArray = [ "propertyname1", "propertyname2", "propertyname3" ];
//      var twoDimensionArray = [ ["propertyname1", null], ["propertyname2", null], ["propertyname3", null] ];
// OOPS allow not returning anything at all for null
// 
Pslib.getXmpDictionary = function( target, obj, allowEmptyStringBool, typeCaseBool, allowNullBool, namespace)
{
    var target = target == undefined ? app.activeDocument : target;
    var allowEmptyStringBool = allowEmptyStringBool == undefined ? false : allowEmptyStringBool;
    // var typeCaseBool = typeCaseBool == undefined ? false : typeCaseBool;
    var allowNullBool = allowNullBool == undefined ? true : allowNullBool; // for cases where we don't want anything with a null value
    var tempArr = [];
    var dict = {};

    // if array, typename is object, but objects typically don't have a length property
    if( typeof obj == "object" && obj.length != undefined)
    {
        // build temporary array to fetch all properties in one call
        for(var i = 0; i < obj.length; i++)
        {
            var index = obj[i];
            // if bidimensional array 
            if( typeof index == "object" && index.length > 1)
            {
                // manage extra field (typically label display names)
                if(index.length == 3)
                {
                    tempArr.push( [ obj[i][0], null, obj[i][2]]);
                }
                else
                {
                    tempArr.push( [ obj[i][0], null ]);
                }                
            }
            // if unidimensional array
            else
            {
                tempArr.push( [ obj[i], null ]);
            }
        }

    }
    // otherwise if object
    else
    {
        for (var idx in obj)
        {
            // skip members and internal stuff
            if (idx.charAt(0) == '_' || idx == "Components")
            {
                continue;			
            }
        
            tempArr.push( [ idx, null ]);
        }
    }

    // fetch XMP values
    var propertiesArr = Pslib.getXmpProperties( target, tempArr, namespace ? namespace : Pslib.namespace );

	if(propertiesArr != null)
	{
		for(var i = 0; i < propertiesArr.length; i++)
		{
			var propName = propertiesArr[i][0];
			var propValue = propertiesArr[i][1];

			// attempt to cast types based on string content
			if(propValue == 'true' || propValue == 'false')
			{
				propValue = (propValue == 'true');
			}
			else if(propValue == 'null' || propValue == 'undefined' || propValue == undefined )
			{
				propValue = null;
			}
			else if( !isNaN(Number(propValue)) )
			{
				// Workaround for cases where "000000" which should remain as is
					// if string has more than one character, if first character is a zero and second character is not a dot (decimals etc)
					// then number or string was meant to keep its exact present form
				if(propValue.length > 1 && ( (propValue[0] == "0" || propValue[0] == ".") && (propValue[1] != "." || propValue[1].toLowerCase() != "x") ) ) 
				{

				}

				//workaround for hex denomination format (also keep as string)
				else if(Number(propValue) != 0)
				{
					if(propValue[0] == "0" && propValue[1].toLowerCase() == "x")
					{
	
					}
					else
					{
						propValue = Number(propValue);
					}
				}
				// otherwise yes, do force number
				else
				{
					propValue = Number(propValue);
				}
			}
				
			// if($.level) $.writeln( propName + ": " + propValue + "   " + typeof propValue );
			if((propValue == undefined) && !allowEmptyStringBool && !allowNullBool)
			{
				// skip
			}
			else
			{
				dict[propName] = propValue == undefined ? (allowEmptyStringBool ? "" : ( allowNullBool ? null : undefined)) : propValue;
			}

		}
	}
 
    return dict;
};


// clear XMP : current workaround is to replace current data by empty data
// this is problematic if you actually want to strip the layer from its metadata object entirely
// Edit: turns out there is no structural difference between document XMP and layer XMP. 
// Adobe essentially extended the XMP functionality to layers. A document without an XMP container doesn't make sense, therefore...
Pslib.clearXmp = function (target)
{
	// we do NOT want to delete the illustrator document's XMP source :D
	if(Pslib.isIllustrator) return false;
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var xmp;
		// if metadata not found, return
		try
		{
			xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		}
		catch(e)
		{
			//if($.level) $.writeln(msg + "\n" + e);
			return true;
		}
		
		// if metadata found, replace by empty version
		var emptyXmp = new XMPMeta();
		if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
			
		return true;
	}
	else
	{
		return false;
	}
};

// clear entire namespace
Pslib.clearNamespace = function (target, namespace, nsprefix)
{
	var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
	/*
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		
		// if metadata not found, return
		try
		{
			var xmp = new XMPMeta(layer.xmpMetadata.rawData);
			XMPUtils.removeProperties(xmp, namespace, undefined, XMPConst.REMOVE_ALL_PROPERTIES);
			layer.xmpMetadata.rawData = xmp.serialize();
			//alert(xmp.serialize());
		}
		catch(e)
		{
			if($.level) $.writeln("Metadata not found\n" + e);
			return false;
		}
		
		// if metadata found, replace by empty version
		//var emptyXmp = new XMPMeta();
		//layer.xmpMetadata.rawData = emptyXmp.serialize();
			
		return true;
	}
	else
	{
		return false;
	}
	*/

	// workaround: not friendly on performances, but gets the job done
	var removePropArray = Pslib.getPropertiesArray(target, namespace ? namespace : Pslib.XMPNAMESPACE, nsprefix ? nsprefix : Pslib.XMPNAMESPACEPREFIX);
	Pslib.deleteXmpProperties(target, removePropArray, namespace ? namespace : Pslib.XMPNAMESPACE);
};

// save metadata to XML file
Pslib.exportLayerMetadata = function (target, path, alertMsg)
{
	if(Pslib.loadXMPLibrary())
	{
		var xmp;
		
		// verify that xmp data is available
		   try
		   {
			  xmp = Pslib.isIllustrator ? target.XMPString.toString() : target.xmpMetadata.rawData.toString();

			if(alertMsg) alert(xmp);
	
		   }
			catch(e)
			{
			   var msg = "";
			   if(e.message.match("missing") != null)
			   {	
				   msg += "There doesn't seem to be any metadata attached to layer \"" + target.name + "\"";  
				}
				if($.level) $.writeln(msg + "\n" + e);
				else alert(msg + "\n" + e);
				return false;
		   }
	   
		var path = path == undefined ? File.saveDialog() : path;
		if(path != null)
		{
		   var file = new File(path);

		if(file.exists)
		{
			if($.level) $.writeln("\nFile already present. Prompting user for permission to replace.");
			// if file exists, present the user with the option to replace it
			if(confirm ("Do you wish to overwrite this file?\n\n" + file.fsName, true, "Replace file?"))
			{
				try
				{
					if($.level) $.writeln("Removing file:\n" + file.fsName );
					file.remove();	
				}
				catch(e)
				{
					if($.level) $.writeln("\nCould not remove file. Please verify that it is not open by a different process.");
					return false;
				}
			}
			else
			{
				if($.level) $.writeln("User opted not to replace the file.");
				return false;
			}
		}
		   
		   file.encoding = "UTF-8";
		   try
		   {
			file.open("w");
			file.write(xmp);
			file.close();
		   }
			catch(e)
			{
			   var msg = "";

				if($.level) $.writeln("Unable to write to file.\n" + msg + "\n" + e);
				else alert("Unable to write to file.\n" + msg + "\n" + e);
				return false;
		   }
		   file.close();
		}
	//	Pslib.unloadXMPLibrary();
		return true;
	}
	else
	{
		return false;
	}
};

// save properties/values to CSV
Pslib.propertiesToCSV = function(target, namespace, uri, nsprefix)
{	
	var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
	var propertiesArray = Pslib.getPropertiesArray(target, namespace ? namespace : Pslib.XMPNAMESPACE, nsprefix ? nsprefix : Pslib.XMPNAMESPACEPREFIX);

	var report = "";

	if(propertiesArray != null && propertiesArray.length)
	{
		// adding a specific separator on the first line (allows MS Excel to know what to do with the CSV content)
		report += "sep=\t\n";
		try
		{
			for(var i = 0; i < propertiesArray.length; i++)
			{
				report += (propertiesArray[i][0] + "\t" + propertiesArray[i][1] + "\n");
			}
			
			if(report != "")
			{
				// save to text file
				var file = new File(uri);
				if(!file.parent.exists) file.parent.create();
				if(file.exists) file.remove();
                
                file.encoding = "UTF-8";
				file.open('w');
				$.os.search(/windows/i)  != -1 ? file.lineFeed = 'windows'  : file.lineFeed = 'macintosh';
				file.write(report);
				file.close();
				
				return true;
			}
			else
			{
				return false;
			}
		}
		catch( e )
		{
			return false;
		}
	}
};

// save properties/values to CSV
Pslib.propertiesFromCSV = function(target, namespace, uri)
{	
	var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);

	var csv = new File(uri);
	var pairs = [];
	var propertiesArray = [];
	var success = false;
	
	// open CSV file, read lines
	if(csv.exists)
	{
		csv.open('r');

		while (!csv.eof)
		{
			pairs.push(csv.readln());
		}
		csv.close();
	}

	// loop through lines array and build 
	if(pairs.length)
	{
		var propertiesArray = new Array();

		// loop through lines to harvest info
		for(var i = 0; i < pairs.length; i++)
		{
			// skip first line if separator
			if(pairs[i] == "sep=\t")
			{
				continue;
			}		
			var pair = pairs[i].split('\t');
			if($.level) $.writeln("Adding: " + pair[0] + "," + pair[1]);
			propertiesArray.push([pair[0], pair[1] ]);
		}
	}
	
	if(propertiesArray.length)
	{
		success = Pslib.setXmpProperties(target, propertiesArray, namespace ? namespace : Pslib.XMPNAMESPACE);
	}
	return success;
};

// this returns the full active document path without building a histogram in CS2 (also bypasses the 'document not saved' exception)
Pslib.getDocumentPath = function(doc)
{
	if(Pslib.isPhotoshop)
	{
		var doc = doc != undefined ? doc : app.activeDocument;
		if(app.activeDocument != doc) app.activeDocument = doc;
	
		var ref = new ActionReference();
		ref.putProperty(cTID('Prpr'), cTID('FilR'));
		ref.putEnumerated(cTID('Dcmn'), cTID('Ordn'), cTID('Trgt'));
		var desc = executeActionGet(ref);
		return desc.hasKey(cTID('FilR')) ? desc.getPath(cTID('FilR')) : undefined;
	}
	else
	{
		var docNameNoExt = doc.name.match(/([^\.]+)/)[1];
		var docFullPath = doc.fullName;
		var matchesSystem = docFullPath.toString().match( app.path) != null;
		var defaultExportDir = docNameNoExt.replace(/[\s:\/\\*\?\"\<\>\|]/g, "_") + "-assets";
		
		// .fullName pointing to app.path means document has not been saved to disk
		if(matchesSystem)
		{
			targetDirectory = new Folder ( defaultDocPath );
			"~/" + Folder.desktop.name + "/AiXMPData";
		}
		else
		{
			targetDirectory = new Folder (docFullPath.parent + "/" + defaultExportDir);
		}
	}
};

//////

// Create Alt Array type property
// var arr =  [ [ ["qualifier1", "value1"], ["qualifier2", "value2"] ], [ ["qualifier", "value"] ] ]

// <ns:PropertyName>
// <rdf:Alt>
//    <rdf:li rdf:parseType="Resource">
// 	  <rdf:value/>
// 	  <xmp:qualifier1>value1</xmp:qualifier1>
// 	  <xmp:qualifier2>value2</xmp:qualifier2>
// 	  <xmp:qualifier3>value3</xmp:qualifier3>
//    </rdf:li>
//    <rdf:li rdf:parseType="Resource">
// 	  <rdf:value/>
// 	  <xmp:qualifier>value</xmp:qualifier>
//    </rdf:li>
// </rdf:Alt>
// </ns:PropertyName>

Pslib.setAltArrayProperty = function (xmp, propName, arr, namespace)
{
	var namespace = namespace ? namespace : Pslib.XMPNAMESPACE;
	var prefix = XMPMeta.getNamespacePrefix(namespace);

	var propertyExists = xmp.doesPropertyExist(namespace, propName);

	if(propertyExists)
	{
		// choose to do something with the existing data (comparison/validation?)
	}

	xmp.setProperty(namespace, propName, null, XMPConst.ARRAY_IS_ALTERNATIVE); // <prefix:propName>
	if($.level) $.writeln( "<"+prefix+propName+">" ); 

	for(var i = 0; i < arr.length; i++)
	{
		// var defaultValue = arr[i].length > 2 ? arr[i][2] : ""; // 
		
		xmp.appendArrayItem(namespace, propName, ""); // <rdf:value> -- opportunity to include extra info or fallback value here
		if($.level) $.writeln( "\n\t<rdf:value/>" );

		for(var j = 0; j < arr[i].length; j++)
		{
			var subArr = arr[i][j];
			var qualifier = subArr[0];
			var value = subArr[1];

			xmp.setQualifier(namespace, propName+'['+(i+1)+']', XMPConst.NS_XMP, qualifier, value);
			if($.level) $.writeln( "\t<xmp:"+qualifier+">"+value+"</xmp:"+qualifier+">" );
		}
	}
	if($.level) $.writeln( "</"+prefix+propName+">" ); 
}


////// illustrator item tags

// illustrator: get array of specific tags 
// tagsArr: [ ["name", "value"], ["name", "value"]]
Pslib.getTags = function( pageItem, tagsArr )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem){
			return
		}
	
		var harvestedTagsArr = [];
		var tags = pageItem.tags;
	
		if(tags.length)
		{    
			for(var i = 0; i < tags.length; i++)
			{
				var tag = tags[i];
	
				var name = tag.name;
				var value = tag.value;
	
				// compare with provided array to match names
				for(var j = 0; j < tagsArr.length; j++)
				{
					if(name == tagsArr[j][0])
					{
						harvestedTagsArr.push([ name, value]);
					}
	
					if($.level) $.writeln( "\t"+ name + ": " + value );
				}
			}
		}
	
		return tagsArr;
	}
}

// Illustrator: batch set tags
// tagsArr: [ ["name", "value"], ["name", "value"]]
Pslib.setTags = function( pageItem, tagsArr )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem || !tagsArr){
			return;
		}

		var success = false;

		for(var i = 0; i < tagsArr.length; i++)
		{
			var tagArr = tagsArr[i];

			var name = tagArr[0];
			var value = tagArr[1];

			var tag = pageItem.tags.add();
			tag.name = name;
			tag.value = value;
		}

		success = true;

		return success;
	}
}

// Illustrator: batch remove tags
// tagsArr: ["name", "name", "name"]
Pslib.removeTags = function( pageItem, tagsArr )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem || !tagsArr){
			return
		}

		var success = false;

		// remove tags by matching names, starting from the last
		for(var i = pageItem.tags.length-1; i > (-1); i--)
		{
			var tag = pageItem.tags[i];

			for(var j = 0; j < tagsArr.length; j++)
			{
				if(tag.name == tagsArr[j])
				{
					pageItem.tags[i].remove();
				}
			}
		}

		success = true;

		return success;
	}
}

// Illustrator: remove all tags from item
Pslib.removeAllTags = function( pageItem )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem){
			return;
		}
	
		var success = false;
	
		if(pageItem.tags.length)
		{
			for(var i = pageItem.tags.length-1; i > (-1); i--)
			{
				pageItem.tags[i].remove();
			}
			success = true;
		}
		return success;
	}
}

// Illustrator: remove all tags from item
// expects an array of items
Pslib.scanItemsForTags = function( items, filter )
{
	if(Pslib.isIllustrator)
	{
		var tagsArr = [];
		var tagsObj = {};
		filter = filter ? filter : "PageItem";

		// detect single PageItem passed instead of array, cast as array
		if(items != undefined)
		{
			if(!(items instanceof Array))
			{
				if(items.typename)
				{
					items = [items];
				}
			}
		}

		// if items array not provided, use current selection
		if(items == undefined)
		{
			var doc = app.activeDocument;
			var selection = doc.selection;
			if(selection.length)
			{
				items = selection;
			}
			// or scan everything
			else
			{
				items = doc.pageItems;
			}
		}

		if(items.length)
		{
			for(var i = 0; i < items.length; i++)
			{
				var item = items[i];
				var typename = item.typename;
				var matchesFilter = typename == filter;
		
				if(matchesFilter)
				{
					var tags = item.tags;
					if($.level && tags.length) $.writeln( i + "  " + item.name + " \t" + typename);

					for(var j = 0; j < tags.length; j++)
					{
						var tag = tags[j];
			
						var name = tag.name;
						var value = tag.value;
			
						if($.level) $.writeln( "\t"+ name + ": " + value );
			
						tagsArr.push([name, value]);
						tagsObj[name] = value;
					}
				}
			}
		}
		return [ tagsArr, tagsObj ];
	}
}


// DEBUG AREA

if($.level)
{
	// let's confirm that the file was properly included
	$.writeln("\nPslib.jsx v" + Pslib.version + " successfully loaded by " + app.name + " " + app.version);
}

"\n";
//EOF

