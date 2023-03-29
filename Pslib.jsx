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
	- add support for reading standalone XMP/XML/JSON files 
	- add method for getting match for artboard based on selected item bounds

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
Pslib.version = 0.66;
Pslib.isPs64bits = BridgeTalk.appVersion.match(/\d\d$/) == '64';

Pslib.isPhotoshop = app.name == "Adobe Photoshop";
Pslib.isIllustrator = app.name == "Adobe Illustrator";
Pslib.isInDesign = app.name == "Adobe InDesign";
Pslib.isBridge = app.name == "Adobe Bridge";

if(Pslib.isPhotoshop)
{
	// these functions are often required when working with code obtained using the ScriptingListener plugin
	cTID = function(s) {return app.charIDToTypeID(s);}
	sTID = function(s) {return app.stringIDToTypeID(s);}

	// 
	function selectByID(id, add) {
		Pslib.selectLayerByID(id, add);
		// if (add == undefined) add = false;
		// var desc1 = new ActionDescriptor();
		// var ref1 = new ActionReference();
		// ref1.putIdentifier(cTID('Lyr '), id);
		// desc1.putReference(cTID('null'), ref1);
		// if (add) desc1.putEnumerated(sTID("selectionModifier"), sTID("selectionModifierType"), sTID("addToSelection"));
		// executeAction(cTID('slct'), desc1, DialogModes.NO);
	};
	
	// from xbytor
	function getActiveLayerID() {
		Pslib.getActiveLayerID();
		// var ref = new ActionReference();
		// ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
		// var ldesc = executeActionGet(ref);
		// return ldesc.getInteger(cTID('LyrI'));
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

	// get all artboards
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


    // get individual artboard metrics and info
	// anything including XMP data requires the layer to be selected
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

	function makeActiveByIndex( idx, visible )
	{   
		return Pslib.selectLayerByIndex( idx, visible );
	}
		
	// return intersection between all artboards and selected artboards
	function getSelectedArtboards()
	{
		return Pslib.getSpecsForSelectedArtboards();
	}


	function getAllArtboards()
	{
		return Pslib.getSpecsForAllArtboards();
	}

	// get list of selected layer INDEXES 
	// (only relevant to the current order of layers in the root stack at the moment of running the script)
	function getSelectedLayersIdx()
	{   
		return Pslib.getSelectedLayerIndexes();
	}

	function isArtboard()
	{
		return Pslib.isArtboard();
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

	getAllArtboards = function(){};
	getSelectedArtboards = function(){};
	getSelectedLayersIdx = function(){};
	isArtboard = function(){};
}

// metadata is only supported by Photoshop CS4+
Pslib.isPsCS4andAbove = Pslib.isPhotoshop && parseInt(app.version.match(/^\d.\./)) >= 11;

// here's some more stuff that can be useful
// won't work for Bridge :D
Pslib.isPsCCandAbove = Pslib.isPhotoshop && parseInt(app.version.match(/^\d.\./)) >= 14; 
Pslib.isPsCS6 = (Pslib.isPhotoshop && app.version.match(/^13\./) != null);
Pslib.isPsCS5 = (Pslib.isPhotoshop && app.version.match(/^12\./) != null);
Pslib.isPsCS4 = (Pslib.isPhotoshop && app.version.match(/^11\./) != null);
Pslib.isPsCS3 = (Pslib.isPhotoshop  && app.version.match(/^10\./) != null);

// Ps & Ai 2020+
Pslib.is2020andAbove = Pslib.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 21) : (parseInt(app.version.match(/^\d.\./)) >= 24); 

// 2022 for CEP 11 
Pslib.is2022andAbove = Pslib.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 23) : (parseInt(app.version.match(/^\d.\./)) >= 26); 

Pslib.is2023andAbove = Pslib.isPhotoshop ? (parseInt(app.version.match(/^\d.\./)) >= 24) : (parseInt(app.version.match(/^\d.\./)) >= 27); 

// default key-value pairs for document (usually XMP)
Pslib.docKeyValuePairs = [ [ "source", null ], [ "range", null ], [ "destination", null ], [ "specs", null ],  [ "custom", null ] ];
// Pslib.docKeyValuePairs = [ [ "source", "range", "destination", "specs", "custom" ] ];

// default key-value pairs for individual assets (either XMP or custom tags)
// Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "index", null ] ];
Pslib.assetKeyValuePairs = [ [ "assetID", null ] ];
Pslib.storedAssetPropertyNamesArr = [ "assetName", "assetArtboardID", "assetID"];
Pslib.assetKeyConversionArr = [ ];

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
			// if($.level) $.writeln("Attempting to get metadata for target \"" + target.name + "\"");

			if(Pslib.isInDesign)
			{
				// xmp = new XMPMeta(Pslib.getInDesignDocumentXMP(target));
				xmp = Pslib.getInDesignDocumentXMP(target);
			}
			else if(Pslib.isPhotoshop)
			{
				xmp = new XMPMeta(target.xmpMetadata.rawData );
			}
			else if(Pslib.isIllustrator)
			{
				xmp = new XMPMeta(target.XMPString);
			}
			else
			{
				xmp = new XMPMeta();
			}
		}
		catch( e )
		{
			// if($.level) $.writeln("Metadata could not be found for target \"" + target.name + "\"" + (createNew ? "\nCreating new XMP object." : "") );
			if(createNew && !Pslib.isInDesign) xmp = new XMPMeta();
		}

		return xmp;
	}
	else
	{
		return xmp;
	}
};

// get xmp data from active InDesign document
Pslib.getInDesignDocumentXMP = function( target )
{
	if(!app.documents.length) return;
	if(Pslib.isInDesign)
	{
		var target = target ? target : app.activeDocument;
		var file = new File( Folder.temp + "/indesignmeta.xmp" );
		file.encoding="UTF-8";

		target.metadataPreferences.save(xmpFile); // this cannot happen while ScriptUI is showing a dialog!

		file.open('r');
		var xmpStr = file.read();
		file.close();
		// file.remove();
	
		return new XMPMeta(xmpStr);
	}
	return;
}

// get property: returns a string
Pslib.getXmpProperty = function (target, property, namespace)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( (Pslib.isIllustrator || Pslib.isInDesign ) ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var value;
		var xmp;
		
		// access metadata
		try
		{
			// xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
			xmp = Pslib.getXmp(target);
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
		var target = (target == undefined ? ( (Pslib.isIllustrator || Pslib.isInDesign)  ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var xmp;
		if(Pslib.isIllustrator || Pslib.isPhotoshop) xmp = Pslib.getXmp(target);
		// in the case of indesign, we are removing property live from document, not from xmp object
		else if(Pslib.isInDesign) xmp = target.metadataPreferences;
		
		try
		{
			xmp.deleteProperty(namespace ? namespace : Pslib.XMPNAMESPACE, property);

			if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
			else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
			// else if(Pslib.isInDesign) // no need to go there...?
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
		// var xmp = Pslib.getXmp(target);
				
		if(Pslib.isIllustrator || Pslib.isPhotoshop) xmp = Pslib.getXmp(target);
		// in the case of indesign, we are removing property live from document, not from xmp object
		else if(Pslib.isInDesign) xmp = target.metadataPreferences;
		
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
		//    xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );

		if(Pslib.isIllustrator || Pslib.isPhotoshop )
		{
			xmp = Pslib.getXmp(target);
		}
		else if(Pslib.isInDesign)
		{
			xmp = target.metadataPreferences;
			// alert("Adding property to indesign doc");
		}

		   // if scriptui interfering...
		   if(xmp === undefined)
		   {
				var file = new File( Folder.temp + "/indesignmeta.xmp" );
				file.encoding = "UTF-8";
				file.open('r');
				var xmpStr = file.read();
				file.close();

				xmp = new XMPMeta(xmpStr);
		   }

		//    if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} 
		catch( e ) 
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
				// var propertyExists = xmp.doesPropertyExist(namespace ? namespace : Pslib.XMPNAMESPACE, prop);
				var propertyExists = Pslib.isInDesign ? false : xmp.doesPropertyExist(namespace ? namespace : Pslib.XMPNAMESPACE, prop);
				
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
		else if(Pslib.isInDesign) target.metadataPreferences = xmp.serialize();
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
		var foundXMP = false;
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var prop;
		var val;
		var xmp;
		var updatedArray = [];
		
		// access metadata
		try
		{
		//    xmp = new XMPMeta( Pslib.isIllustrator ? target.XMPString : target.xmpMetadata.rawData );
		   xmp = Pslib.getXmp(target);
		   foundXMP = true;
		//    if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
			xmp = new XMPMeta(  );
		}
	   

		if(foundXMP)
		{
			// loop through array properties and assign them
			if($.level) $.writeln("\nLooping through "+target.name+" properties...");

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
						// if($.level) $.writeln("\tgetting property: [" + prop + ": " + val +"]  " + typeof val);
						
						if($.level) $.writeln("  " + propertiesArray[i][0]+ ": " + val + "\n");
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
					// var msg = "Could not fetch metadata property from provided object.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
				//    if($.level) $.writeln( msg );
				return null;
				}
			}
			return updatedArray;
		}
		else return null;
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
			// xmp = Pslib.getXmp(target);
		//    if($.level) $.writeln("XMP Metadata successfully fetched from target \"" + target.name + "\"");
		} catch( e ) 
		{
			if(Pslib.isPhotoshop)
			{
				xmp = new XMPMeta();
			}
			// if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
			return null;
		}

		if(Pslib.isInDesign)
		{
			if ( xmp === undefined )
			{
				if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
				return null;
			}
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
//      var customObject = { propertyname1: null, propertyname2: null, propertyname3: null }
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
    // if( typeof obj == "object" && obj.length != undefined)
    if( obj instanceof Array )
    {
        // build temporary array to fetch all properties in one call
        for(var i = 0; i < obj.length; i++)
        {
            var index = obj[i];
            // if bidimensional array 
            // if( typeof index == "object" && index.length > 1)
            if( index instanceof Array && index.length > 1)
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
    else if( obj instanceof Object )
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
    var propertiesArr = Pslib.getXmpProperties( target, tempArr, namespace ? namespace : Pslib.XMPNAMESPACE );

	if(propertiesArr != null)
	{
		for(var i = 0; i < propertiesArr.length; i++)
		{
			var propName = propertiesArr[i][0];
			var propValue = propertiesArr[i][1];

			// now, attempt to cast types based on string content

			// if null, skip the rest
			if(propValue == null)
			{
				dict[propName] = propValue; 
				continue;
			} 

			// this should handle True/False/"true"/"false"
			if(propValue.toLowerCase() == 'true' || propValue.toLowerCase() == 'false')
			{
				// cast as Boolean
				propValue = (propValue.toLowerCase() == 'true');
			}
			// null is allowed!
			else if(propValue == 'null' || propValue == 'undefined' || propValue == undefined )
			{
				propValue = null;
			}
			else if( !isNaN(Number(propValue)) )
			{
				// Workaround for cases where "000000" should remain as is
					// if string has more than one character, if first character is a zero and second character is not a dot (decimals etc)
					// then number or string was meant to keep its exact present form
				if(propValue.length > 1 && ( (propValue[0] == "0" || propValue[0] == ".") && (propValue[1] != "." || propValue[1].toLowerCase() != "x") ) ) 
				{

				}

				//workaround for number expressed as hexadecimal (also keep as string)
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
	else if(Pslib.isIllustrator)
	{
		var doc = doc != undefined ? doc : app.activeDocument;
		if(app.activeDocument != doc) app.activeDocument = doc;

		var docFullPath = doc.fullName;
		var matchesSystem = docFullPath.toString().match( app.path) != null;

		return matchesSystem ? undefined : docFullPath;
	}
	else if(Pslib.isInDesign)
	{
		var docFullPath;
		var matchesSystem = true;
		
		try{
			docFullPath = doc.fullName;
			matchesSystem = docFullPath.toString().match( app.path ) != null;
		}
		catch(e){}

		return matchesSystem ? undefined : docFullPath;
	}
};

//////

// Create custom XMP Seq Array with qualifiers
// var arr =  [ [ ["qualifier1", "value1"], ["qualifier2", "value2"] ], [ ["qualifier", "value"] ] ]

// <ns:PropertyName>
// <rdf:Seq>
//    <rdf:li rdf:parseType="Resource">
// 	  <rdf:value/>
// 	  	<ns:qualifier1>value1</ns:qualifier1>
// 	  	<ns:qualifier2>value2</ns:qualifier2>
// 	  	<ns:qualifier3>value3</ns:qualifier3>
//    </rdf:li>
//    <rdf:li rdf:parseType="Resource">
// 	  <rdf:value/>
// 	  	<xmp:qualifier>value</xmp:qualifier>
//    </rdf:li>
// </rdf:Seq>
// </ns:PropertyName>

// plain function for creating ordered array (Seq) in provided XMP Meta object
// only manipulates xmp object, serialization must happen somewhere else)
Pslib.setOrderedArray = function (xmp, propName, arr, namespace)
{
	if(!xmp) return;
	// if(!app.documents.length){ return; }

	var namespace = namespace ? namespace : Pslib.XMPNAMESPACE;
	var prefix = XMPMeta.getNamespacePrefix(namespace);

	var propertyExists = xmp.doesPropertyExist(namespace, propName);

	if(propertyExists)
	{
		// choose to do something with the existing data (comparison/validation?)
	}

	// xmp.setProperty(namespace, propName, null, XMPConst.ARRAY_IS_ALTERNATIVE); // <prefix:propName>
	xmp.setProperty(namespace, propName, null, XMPConst.ARRAY_IS_ORDERED); // <prefix:propName>
	if($.level) $.writeln( "\n<"+prefix+propName+">\n  <rdf:Seq/>" ); 

	for(var i = 0; i < arr.length; i++)
	{
		xmp.appendArrayItem(namespace, propName, ""); // <rdf:value> -- opportunity to include extra info or fallback value here

		if($.level) $.writeln( "    <rdf:li rdf:parseType=\"Resource\">\n    <rdf:value/>" );

		for(var j = 0; j < arr[i].length; j++)
		{
			var subArr = arr[i][j];
			var qualifier = subArr[0];
			var value = subArr[1];

			xmp.setQualifier(namespace, propName+'['+(i+1)+']', namespace, qualifier, value);
			if($.level) $.writeln( "    <"+prefix+qualifier+">"+value+"</"+prefix+qualifier+">" );
		}
		if($.level) $.writeln( "     </rdf:li>" ); 
	}
	if($.level) $.writeln( "  </rdf:Seq>\n</"+prefix+propName+">\n" ); 

	return xmp;
}


// wrapper for Pslib.setOrderedArray()
// takes care of conversion between local xmp properties and stored array item qualifiers
// in this context, Pslib.getAdvancedSpecs() should also work for illustrator
Pslib.pushDataCollectionToOrderedArray = function( obj )
{
    if(!app.documents.length){ return; }
    if(!obj) obj = {};

    JSUI.startTimer();

    var doc = app.activeDocument;
    var xmpUpdated = false;

    if(!obj.xmp) obj.xmp = Pslib.getXmp(doc, false);
    if(!obj.arrNameStr) obj.arrNameStr = "ManagedArtboards";
    
    // if no artboards given, use selected artboards
    if(!obj.artboardObjArr) obj.artboardObjArr = Pslib.getSpecsForSelectedArtboards();
    
    // arbitrary list of xmp array item objects, likely obtained from a related process
    // can be a selection of items we need to preserve while flushing the current stored XMP array
    if(!obj.existingArrayItems) obj.existingArrayItems = [];

    if(!obj.requiredQualifiers) obj.requiredQualifiers = Pslib.assetKeyValuePairs; // default:  [ [ "assetID", null ] ];
    if(!obj.converter) obj.converter = Pslib.assetKeyConversionArr; // default is empty array, no conversion
    if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;

    if(obj.deleteExisting == undefined) obj.deleteExisting = false;

    var propertyExists = obj.xmp.doesPropertyExist(obj.namespace, obj.arrNameStr);

    var preExistingArrayItems = [];
    var itemCount = 0;

	if(propertyExists)
    {
        if(obj.deleteExisting)
        {
            itemCount = obj.xmp.countArrayItems(obj.namespace, obj.arrNameStr);
            obj.xmp.deleteProperty(obj.namespace, obj.arrNameStr);
            JSUI.quickLog("deleted " + itemCount+ " array items");
        }
        else
        {
            // if there is existing data that we need to keep and work with, get it here
            preExistingArrayItems = Pslib.getDataCollectionFromOrderedArray( obj );
            
            itemCount = obj.xmp.countArrayItems(obj.namespace, obj.arrNameStr);

            // JSUI.quickLog(preExistingArrayItems, "\npreExistingArrayItems items: " +(preExistingArrayItems.length));
        }
    }

    // get additional specs for artboards (layer xmp / item tags)
    if(obj.artboardObjArr.length)
    {
        obj.artboardObjArr = Pslib.getAdvancedSpecs(obj.artboardObjArr, { dictionary: Pslib.arrayToObj(obj.requiredQualifiers), converter: obj.converter });
        // obj.artboardObjArr = Pslib.filterDataObjectArray(obj.artboardObjArr, obj.converter);
        // JSUI.quickLog(obj.artboardObjArr, "\nobj.artboardObjArr: " +(obj.artboardObjArr.length));

    }

    // obj.existingArrayItems allows passing an arbitrary number of items taken from the same document, or another source.
    if(obj.existingArrayItems.length)
    {
        obj.existingArrayItems = Pslib.getAdvancedSpecs(obj.existingArrayItems, { dictionary: Pslib.arrayToObj(obj.requiredQualifiers), converter: obj.converter });
        // obj.existingArrayItems = Pslib.filterDataObjectArray(obj.existingArrayItems);

        // JSUI.quickLog(obj.existingArrayItems, "\nobj.existingArrayItems: " +(obj.existingArrayItems.length));
    }

    // add existing stuff to new array...?

    var seqArrayItems = [];
    // var seqArrayObjects = [];

    for(var i = 0; i < obj.artboardObjArr.length; i++)
    {
        var artboardObj = obj.artboardObjArr[i];

        if(artboardObj)
        {
            var hasRequiredQualifier = false;
            for(var j = 0; j < obj.requiredQualifiers.length; j++)
            {
                var qualItem = obj.requiredQualifiers[j][0];

                if(artboardObj[qualItem] != undefined )
                {
                    hasRequiredQualifier = true;
                    break;
                }
            }
            // if no qualifier found, skip
            if(hasRequiredQualifier)
            {
                var itemArr = [];
                // these two are hard-coded for maintenance and syncing purposes
                // (if user renames artboard/changes the order of artboards in stack)
                if(artboardObj.name) itemArr.push(["assetName", artboardObj.name]);
                if(artboardObj.id) itemArr.push(["assetArtboardID", artboardObj.id]);

                for(var j = 0; j < obj.requiredQualifiers.length; j++)
                {
                    var qualItem = obj.requiredQualifiers[j][0];

                    if(artboardObj[qualItem] != undefined )
                    {
                        // take care of converting legacy property name to array item property qualifier
                        for(var k = 0; k < obj.converter.length; k++)
                        {
                            if(qualItem == obj.converter[0])
                            {
                                qualItem == obj.converter[1];
                            } 
                        }
                        itemArr.push([qualItem, artboardObj[qualItem] ]);

                    }
                }
                
                seqArrayItems.push(itemArr);
                // seqArrayItems.push(Pslib.pairArrCollectionToObj(itemArr));
                // seqArrayItems.push(Pslib.pairArrToObj(itemArr));
                // seqArrayObjects.push( Pslib.pairArrToObj(itemArr));

            }
        }
    }


    // default usecase is pushing provided specs to array
    // if array items are already being filtered by the current process, deal with them here 
    if(propertyExists && !obj.deleteExisting)
    {
        for(var i = 0; i < preExistingArrayItems.length; i++)
        {
            seqArrayItems.push(preExistingArrayItems[i]);
            // JSUI.quickLog(preExistingArrayItems[i]);
        }
    }
    // JSUI.quickLog(seqArrayItems, "\nCurrent Harvest: " +(seqArrayItems.length));

    for(var i = 0; i < obj.existingArrayItems.length; i++)
    {
        seqArrayItems.push(obj.existingArrayItems[i]);
        // JSUI.quickLog(obj.existingArrayItems[i]);
    }

    // reorder array based on 
    seqArrayItems = seqArrayItems.sort( Pslib.compareArtboardID );

    if(seqArrayItems.length)
    {
        // JSUI.quickLog("Pushing " + seqArrayItems.length + " item"+(seqArrayItems.length > 1 ? "s" : "")+" to \"" + obj.arrNameStr + "\"");
        obj.xmp = Pslib.setOrderedArray(obj.xmp, obj.arrNameStr, seqArrayItems, obj.namespace);
        xmpUpdated = true;
    }
    else
    {
        if(obj.clearIfEmpty)
        {
            obj.xmp.deleteProperty(obj.namespace, obj.arrNameStr);
        }
    }

	// serialize and update document XMP
    if(xmpUpdated)
    {
        if(Pslib.isPhotoshop) doc.xmpMetadata.rawData = obj.xmp.serialize();
        else if(Pslib.isIllustrator) doc.XMPString = obj.xmp.serialize();
    }

    JSUI.stopTimer();

    return obj.artboardObjArr;
}

// Pslib.getOrderedArrayItems = function (xmp, propName, arr, namespace, getObjBool)
Pslib.getOrderedArrayItems = function ( obj )
{
    if(!app.documents.length){ return; }

	// JSUI.startTimer();

	var doc = app.activeDocument;

	if(!obj) obj = {};
	if(!obj.xmp) obj.xmp = Pslib.getXmp(doc, false);
	if(!obj.arrNameStr) obj.arrNameStr = "ManagedArtboards";
    if(!obj.arr) obj.arr = Pslib.storedAssetPropertyNamesArr; // [ "assetName", "assetArtboardID", "assetID"]
	if(!obj.range) obj.range = "all"; // range string, 1-based. "1-5"  "1,6,10,13-16"
    if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
    if(!obj.getObjBool) obj.getObjBool = false;

    // var prefix = XMPMeta.getNamespacePrefix(namespace);

    var propertyExists = obj.xmp.doesPropertyExist(obj.namespace, obj.arrNameStr);

	if(!propertyExists)
	{
        return;
	}
	var resultsArr = [];
	var itemCount = obj.xmp.countArrayItems(obj.namespace, obj.arrNameStr);
	
	// "all" is default, gets a full array of integers   
	var rangeIntArr = (obj.range == "all" ? ("1" + (itemCount > 1 ? "-"+itemCount : "") ) : obj.range ).toRangesArr();

    // for(var i = 1; i <= itemCount; i++)
    for(var h = 0; h < rangeIntArr.length; h++)
    {
		var i = rangeIntArr[h]; 

        var itemObj = { };
        var itemArr = [ ];
        if($.level) $.writeln("\n"+obj.arrNameStr+"["+i+"]"); 
        for(var j = 0; j < obj.arr.length; j++)
        {
            // var qualifier = arr[j];
            var qualifier = (obj.arr[j] instanceof Array) ? obj.arr[j][0] : obj.arr[j];
            var value = decodeURI(obj.xmp.getQualifier(obj.namespace, obj.arrNameStr+"["+i+"]", obj.namespace, qualifier).toString());
			value = Pslib.autoTypeDataValue(value);

            if($.level) $.writeln("  "+qualifier+": " + value); 

            if( value != undefined)
            {
				if( (value != "undefined") && (value != "null"))
				{
					itemObj[qualifier] = value;
					itemArr.push([ qualifier, value]);
				}
            }
        }
        resultsArr.push(obj.getObjBool ? itemObj : itemArr);
    }
	// JSUI.stopTimer();

	return resultsArr;
}

// target one specific artboard in AltArray
// Pslib.getSingleArtboardDataArrayItem( 2, obj )
Pslib.getSingleArtboardDataItemFromArray = function( indexInt, obj )
{
    if(!obj) obj = {}
    obj.range = indexInt.toString();
	obj.getObjBool = true;
	var arr = Pslib.getOrderedArrayItems( obj );
    return arr.length != undefined ? arr[0] : arr;
}


// wrapper 
Pslib.getDataCollectionFromOrderedArray = function( obj )
{
    if(!app.documents.length){ return; }

	JSUI.startTimer();

    var doc = app.activeDocument;
    if(!obj) obj = {};
    if(!obj.xmp) obj.xmp = Pslib.getXmp(doc, false);
    if(!obj.arrNameStr) obj.arrNameStr = "ManagedArtboards";
    if(!obj.arr) obj.arr = Pslib.storedAssetPropertyNamesArr; // [ "assetName", "assetArtboardID", "assetID"]
    if(!obj.range) obj.range = "all"; // range string, 1-based. "1-5"  "1,6,10,13-16"
    if(!obj.requiredQualifiers) obj.requiredQualifiers = Pslib.assetKeyValuePairs;
    if(!obj.converter) obj.converter = Pslib.assetKeyConversionArr; // default: empty array
    if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
    // if(!obj.getObjBool) obj.getObjBool = false; // always getting objects

    var docXmpArtboardsSpecs = Pslib.getOrderedArrayItems( { xmp: obj.xmp, arrNameStr: obj.arrNameStr, arr: obj.arr, namespace: obj.namespace, getObjBool: true});
	
	JSUI.stopTimer();

    return docXmpArtboardsSpecs;

    // // JSUI.quickLog(docXmpArtboardsSpecs);

    // var filteredData = [];

    // for(var i = 0; i < docXmpArtboardsSpecs.length; i++)
    // {
    //     var xmpArtboardSpecs = docXmpArtboardsSpecs[i];
    //     var filteredItem = {};

    //     // var hasRequiredQualifier = false;
    //     // for(var j = 0; j < obj.requiredQualifiers.length; j++)
    //     // {
    //     //     var qualItem = obj.requiredQualifiers[j][0];

    //     //     if(xmpArtboardSpecs[qualItem] != undefined )
    //     //     {
    //     //         hasRequiredQualifier = true;
    //     //         break;
    //     //     }
    //     // }

    //     // if(hasRequiredQualifier)
    //     // {
    //         // if(xmpArtboardSpecs.assetName) filteredItem.assetName = xmpArtboardSpecs.assetName;
    //         // if(xmpArtboardSpecs.assetArtboardID) filteredItem.assetArtboardID = xmpArtboardSpecs.assetArtboardID;
            
    //         for(var j = 0; j < obj.arr.length; j++)
    //         {
    //             var storedQualifier = obj.arr[j];
    //             if(xmpArtboardSpecs[storedQualifier] != undefined) filteredItem[storedQualifier] = xmpArtboardSpecs[storedQualifier];
    //         }

    //         for(var j = 0; j < obj.requiredQualifiers.length; j++)
    //         {
    //             var qualItem = obj.requiredQualifiers[j][0];
                
    //             // convert qualifier here if required

    //             // take care of converting legacy property name to array item property qualifier
    //             for(var k = 0; k < obj.converter.length; k++)
    //             {
    //                 if(qualItem == obj.converter[0])
    //                 {
    //                     qualItem == obj.converter[1];
    //                 } 
    //             }

    //             if(xmpArtboardSpecs[qualItem] != undefined)
    //             {
    //                 filteredItem[qualItem] = xmpArtboardSpecs[qualItem];
    //             }
    //         }
    
            
    //     // }

    //     filteredData.push(filteredItem);
    // }
    // // JSUI.quickLog(filteredData);
    // // JSUI.quickLog(docXmpArtboardsSpecs);

    // JSUI.stopTimer();

    // return filteredData;
}


Pslib.autoTypeDataValue = function( propValue, allowEmptyStringBool, allowNullBool )
{
	if(propValue == undefined) return;
	if(propValue == "undefined") return;
	if(propValue == "null") return;

	// this should handle True/False/"true"/"false"
	if(propValue.toLowerCase() == 'true' || propValue.toLowerCase() == 'false')
	{
		// cast as Boolean
		propValue = (propValue.toLowerCase() == 'true');
	}
	// null may be allowed!
	else if(propValue == 'null' || propValue == 'undefined' || propValue == undefined )
	{
		propValue = null;
	}
	else if( !isNaN(Number(propValue)) )
	{
		// Workaround for cases where "000000" should remain as is
			// if string has more than one character, if first character is a zero and second character is not a dot (decimals etc)
			// then number or string was meant to keep its exact present form
		if(propValue.length > 1 && ( (propValue[0] == "0" || propValue[0] == ".") && (propValue[1] != "." || propValue[1].toLowerCase() != "x") ) ) 
		{

		}

		//workaround for number expressed as hexadecimal (also keep as string)
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
		propValue = propValue == undefined ? (allowEmptyStringBool ? "" : ( allowNullBool ? null : undefined)) : propValue;
	}
	return propValue;
}

// offline XMP operations (2023)
// these are more robust, more portable, less involved

// this returns the entire XMP structure from an offline file (prompts user if no file argument is provided)
// important precision: XMP from a live document may be different if modified but not saved
Pslib.getXMPfromFile = function( filepath )
{
    try {
        if(filepath){ filepath = new File(filepath); }
        var f = filepath ? filepath : File.openDialog('Open file');
        if(!f) { if($.level) $.writeln("Invalid file"); return; }

        if($.level) $.writeln("Getting XMP data from " + f.fsName);

        if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript')
        // var xmpFile = new XMPFile(f.fsName, XMPConst.UNKNOWN, XMPConst.OPEN_FOR_READ),
        var xmpFile = new XMPFile(f.fsName, XMPConst.UNKNOWN, XMPConst.XMPConst.OPEN_ONLY_XMP),
        xmp = xmpFile.getXMP();
        // if($.level) $.writeln( xmp.serialize());
		xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);
        return xmp;
    } catch (e) { if($.level) $.writeln( "Error: \n\n" + e);}
}

//
//
////// illustrator item tags


// illustrator: get entire array of tags assigned to pageItem
Pslib.getAllTags = function( pageItem )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem){
			return
		}
	
		var tagsArr = [];
		
		var tags = pageItem.tags;

		if(tags.length)
		{    
			for(var i = 0; i < tags.length; i++)
			{
				var tag = tags[i];
	
				var name = tag.name;
				if(name == "BBAccumRotation") continue;
				var value = tag.value;
				tagsArr.push([ name, value ]);
				if($.level) $.writeln( "\t"+ name + ": " + value );
			}
		}
	
		return tagsArr;
	}
}

// illustrator: get array of specific tags 
// tagsArr: [ ["name", "value"], ["name", "value"]]
Pslib.getTags = function( pageItem, tagsArr )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem){
			return
		}
	
		if($.level) $.writeln( "\nGetting tags on " +  pageItem.typename + " " + pageItem.name);

		var harvestedTagsArr = [];
		var tags = pageItem.tags;
	
		if(tags.length)
		{    
			for(var i = 0; i < tags.length; i++)
			{
				var tag = tags[i];
	
				var name = tag.name;
				// you probably want to skip this one
				// if(name == "BBAccumRotation") continue;
				var value = tag.value;
	
				// compare with provided array to match names
				for(var j = 0; j < tagsArr.length; j++)
				{
					if(name == tagsArr[j][0])
					{
						harvestedTagsArr.push([ name, value]);
					}
				}
				if($.level) $.writeln( "\t"+ name + ": " + value );
			}
		}
	
		return harvestedTagsArr;
	}
}

// simple bidimensional array to object conversion
// arr = [ ["name1", "value1"], ["name2", "value2"]]
// returns { name1: "value1", name2: "value2"}
Pslib.arrayToObj = function( arr, obj )
{
	if(!arr) return;
	if(!arr.length) return;
	if(!obj) var obj = {};

	for(var i = 0; i < arr.length; i++)
	{
		// property needed, but undefined allowed
		if(arr[i][0] != undefined)
		{
			obj[arr[i][0]] = arr[i][1]; 
		}

	}
	return obj;
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

			// "" (empty string) should be considered valid
			if(value != undefined && value != null && value != "BBAccumRotation")
			{
				var tag = pageItem.tags.add();
				tag.name = name;
				tag.value = value;
			}
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
					if(tag.name == "BBAccumRotation") continue; // skip this one
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
				if(pageItem.tags[i].name == "BBAccumRotation") continue; // don't touch this one
				pageItem.tags[i].remove();
			}
			success = true;
		}
		return success;
	}
}

// Illustrator: scan items for any tags
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
						if(name == "BBAccumRotation") continue; // skip this one
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

// artboard functions

// check for artboard status
Pslib.isArtboard = function( layerObject )
{
	// relevance of this for Illustrator is... zero!
	if(Pslib.isPhotoshop)
	{
		var doc = app.activeDocument;
		
		if(!layerObject) layerObject = doc.activeLayer;

		if(layerObject != doc.activeLayer) doc.activeLayer = layerObject;

		var isArtboard = false;

		// an artboard is a fancy group
		if(layerObject.typename == "LayerSet")
		{
			var ref = new ActionReference();
			ref.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
			isArtboard = executeActionGet(ref).getBoolean(sTID("artboardEnabled"));
		}

		return isArtboard;
	}
}

// select layer using its current index in the layer stack
// should not be used without getting indexes within the same script operation
Pslib.selectLayerByIndex = function ( indexInt, makeVisibleBool )
{
	if(Pslib.isPhotoshop)
	{
		var desc = new ActionDescriptor();   
		var ref = new ActionReference();   
		ref.putIndex(cTID( "Lyr " ), indexInt )   
		desc.putReference( cTID( "null" ), ref );   
		desc.putBoolean( cTID( "MkVs" ), makeVisibleBool );   
		executeAction( cTID( "slct" ), desc, DialogModes.NO ); 
		return app.activeDocument.activeLayer;  
	}
}

// get persistent integer associated with selected layer object 
// (value does not change, except if object is copied over to a different document)
Pslib.getActiveLayerID = function ()
{
	if(Pslib.isPhotoshop)
	{
		var ref = new ActionReference();
		ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
		var ldesc = executeActionGet(ref);
		return ldesc.getInteger(cTID('LyrI'));
	}
}

// selecting a layer object means expanding corresponding groups in the layers palette
// this cannot be fixed through scripting, but a CTRL+click while collapsing one of the groups fixes all of them
Pslib.selectLayerByID = function ( idInt, addToSelectionBool )
{
	if(Pslib.isPhotoshop)
	{
		var desc1 = new ActionDescriptor();
		var ref1 = new ActionReference();
		ref1.putIdentifier(cTID('Lyr '), idInt);
		desc1.putReference(cTID('null'), ref1);
		if (addToSelectionBool) desc1.putEnumerated(sTID("selectionModifier"), sTID("selectionModifierType"), sTID("addToSelection"));
		executeAction(cTID('slct'), desc1, DialogModes.NO);
		return app.activeDocument.activeLayer;
	}
}

// get an array of indexes
// (can become invalid if layer groups are moved or deleted)
Pslib.getSelectedLayerIndexes = function()
{   
	if(Pslib.isPhotoshop)
	{
		var selectedIndexes = new Array();

		var ref = new ActionReference();   
		ref.putEnumerated( cTID("Dcmn"), cTID("Ordn"), cTID("Trgt") );   
		var desc = executeActionGet(ref);   
		var increment = 0; 
		if( desc.hasKey( sTID( 'targetLayers' ) ) )
		{   
			desc = desc.getList( sTID( 'targetLayers' ));   
			var c = desc.count; 

			// indexes are based differently if document has a background layer
			try{   
				app.activeDocument.backgroundLayer;   
			}catch(e){   
				increment = 1; 
			}   
			for(var i = 0; i < c; i++)
			{   
				selectedIndexes.push( desc.getReference( i ).getIndex() + increment ); 
			}   
		}
		else
		{   
			var ref = new ActionReference();   
			ref.putProperty( cTID("Prpr") , cTID( "ItmI" ));   
			ref.putEnumerated( cTID("Lyr "), cTID("Ordn"), cTID("Trgt") );   
			try{   
				app.activeDocument.backgroundLayer;   
				increment = 1;
			}catch(e){   
			}   
			selectedIndexes.push( executeActionGet(ref).getInteger(cTID( "ItmI" )) - increment); 
		}   
		return selectedIndexes;   
	}
}

Pslib.getSpecsForSelectedArtboards = function()
{
	if(Pslib.isPhotoshop)
	{
	   // return intersection between all artboards and selected artboards	
		var indexArr = Pslib.getSelectedLayerIndexes();
		
		var r = new ActionReference();
		r.putProperty(sTID("property"), sTID('hasBackgroundLayer'));
		r.putEnumerated(sTID("document"), sTID("ordinal"), sTID("targetEnum"));
		var from = executeActionGet(r).getBoolean(sTID('hasBackgroundLayer')) ? 0 : 1;
		
		var r = new ActionReference();
		r.putProperty(sTID("property"), sTID('numberOfLayers'))
		r.putEnumerated(sTID("document"), sTID("ordinal"), sTID("targetEnum"))
		var to = executeActionGet(r).getInteger(sTID('numberOfLayers'));

		var artboards = [];
		for (var i = from; i <= to; i++)
		{
			// compare current ids with selected IDs, if match found, process
			var selectedMatch = false;
			for (var j = 0; j < indexArr.length; j++)
			{
				if(i == indexArr[j])
				{
					selectedMatch = true;
					break;
				}
			}
			if(!selectedMatch)
			{
				continue;
			}

			(r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboardEnabled'));
			r.putIndex(sTID("layer"), i);
			
			// workaround for documents without artboards defined at all
			try
			{
				var artboardEnabled = executeActionGet(r).getBoolean(p);
			}
			catch(e)
			{
				var artboardEnabled = false;
			}

			if (artboardEnabled)
			{
				(r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboard'));
				r.putIndex(sTID("layer"), i);

				// get artboard name, ID and bounds 
				var ref = new ActionReference();
				ref.putIndex( cTID( "Lyr " ), i);
				var layerDesc = executeActionGet(ref);
				var artboardName = layerDesc.getString(sTID ("name"));
				var artboardID = layerDesc.getInteger(cTID('LyrI'));
				
				var artboard = executeActionGet(r).getObjectValue(p),
					artboardRect = artboard.getObjectValue(sTID("artboardRect")),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom')),
					};
				
					artboards.push({ name: artboardName, index: i, id: artboardID, x: bounds.top, y: bounds.left, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
				}
		}
		return artboards;
	}
	else if(Pslib.isIllustrator)
	{
		var doc = app.activeDocument;
		var initialSelection = doc.selection;

		var artboards = Pslib.getArtboardsFromSelectedItems();
		var artboardsCoords = [];
		for(var i = 0; i < artboards.length; i++)
		{
			var artboard = artboards[i];
			// var coords = Pslib.getArtboardCoordinates(artboard);
			var artboardIndex = Pslib.getArtboardIndex(artboard, true);
			// coordsObj.index = artboardIndex;
			// doc.artboards.setActiveArtboardIndex(artboardIndex-1);

			placeholder = Pslib.getArtboardItem(artboard, "#");
			var specsObj = { name: artboard.name.toFileSystemSafeName(), id: (artboardIndex+1) };
			if(placeholder)
			{
				var tags = Pslib.getTags(placeholder, [ ["assetID", null] ]);
				if(tags.length)
				{
					specsObj = Pslib.arrayToObj( tags, specsObj );
				}
			}
			artboardsCoords.push(specsObj);
		}

		if(initialSelection) doc.selection = initialSelection;

		JSUI.quickLog(artboardsCoords);
		return artboardsCoords;
	}
}

Pslib.getSpecsForAllArtboards = function()
{
	if(Pslib.isPhotoshop)
	{
		var r = new ActionReference();
		r.putProperty(sTID("property"), sTID('hasBackgroundLayer'));
		r.putEnumerated(sTID("document"), sTID("ordinal"), sTID("targetEnum"));
		var from = executeActionGet(r).getBoolean(sTID('hasBackgroundLayer')) ? 0 : 1;
		
		var r = new ActionReference();
		r.putProperty(sTID("property"), sTID('numberOfLayers'))
		r.putEnumerated(sTID("document"), sTID("ordinal"), sTID("targetEnum"))
		var to = executeActionGet(r).getInteger(sTID('numberOfLayers'));
		
		var artboards = [];
		for (var i = from; i <= to; i++) {
			(r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboardEnabled'));
			r.putIndex(sTID("layer"), i);
			var artboardEnabled = executeActionGet(r).getBoolean(p);
			if (artboardEnabled) {
				(r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboard'));
				r.putIndex(sTID("layer"), i);
	
				// get artboard name
				var ref = new ActionReference();
				ref.putIndex( cTID( "Lyr " ), i);
				var layerDesc = executeActionGet(ref);
				var artboardName = layerDesc.getString(sTID ("name"));
				var artboardID = layerDesc.getInteger(cTID('LyrI'));
	
				var artboard = executeActionGet(r).getObjectValue(p),
					artboardRect = artboard.getObjectValue(sTID("artboardRect")),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom')),
		
					};
				artboards.push({ name: artboardName, index: i, id: artboardID, x: bounds.top, y: bounds.left, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
			 }
		}
	
		return artboards;
	}
	else if(Pslib.isIllustrator)
	{
		return Pslib.getArtboardCollectionCoordinates();
	}

}

// typically used in conjunction with Pslib.getSpecsForSelectedArtboards()/Pslib.getSpecsForAllArtboards()
// based on "light" specs quickly obtained from artboards, select layer objects to gather custom xmp data if present on layer objects
// var obj = { dictionary: [ ["propertyname1", null], ["propertyname2", null], ["propertyname3", null] ], converter: [ [ "layerProperty", "docArrayItemQualifier"] ] }
// var dictionary = Pslib.getXmpDictionary( layer, { assetID: null, source: null, hierarchy: null, specs: null, custom: null }, false, false, false, namespace ? namespace : Pslib.XMPNAMESPACE);
      
Pslib.getAdvancedSpecs = function( specsArr, obj )
{
	// if(Pslib.isPhotoshop)
	// {
		if(!specsArr) specsArr = Pslib.isPhotoshop ? Pslib.getSpecsForSelectedArtboards() : Pslib.getArtboardCollectionCoordinates(); // this still needs to be finetuned for illustrator
		if(!obj) obj = {};
		if(!obj.dictionary) obj.dictionary = Pslib.arrayToObj(Pslib.assetKeyValuePairs);
		if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
		if(!obj.converter) obj.converter = Pslib.assetKeyConversionArr; 

		var updatedSpecsArr = [];

		for(var i = 0; i < specsArr.length; i++)
		{
			var specsObj = specsArr[i];
			// var layerObj = Pslib.isPhotoshop ? Pslib.selectLayerByID( specsObj.id, false ) : ;
			var layerObj = Pslib.selectLayerByID( specsObj.id, false ); // fix for illustrator

			if(obj.dictionary)
			{
				// Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "index", null ] ];
				// Pslib.isPhotoshop ? 
				// if(Pslib.isIllustrator) Pslib.getArtboardCoordinates(originalArtboard)
				// var keyValuePairs = Pslib.isPhotoshop ? Pslib.getXmpDictionary( layerObj, obj.dictionary, false, false, false, obj.namespace) : ( [ /* get artboard item tags */ ] );
				var keyValuePairs = Pslib.getXmpDictionary( layerObj, obj.dictionary, false, false, false, obj.namespace);
				// var keyValuePairs = Pslib.getXmpDictionary( layerObj, Pslib.assetKeyValuePairs, false, false, false, obj.namespace ? obj.namespace : Pslib.XMPNAMESPACE);
				// JSUI.quickLog(keyValuePairs, layerObj.name + " keyValuePairs "+(typeof keyValuePairs)+": ");

				if(obj.dictionary instanceof Array)
				{
					for(var j = 0; j < keyValuePairs.length; j++)
					{
						var pair = keyValuePairs[j];
						// if($.level) $.writeln("pair: " + pair );
						if(!pair) continue;

						var property = pair[0];
						var value = pair[1];

						if(property != undefined)
						{
							if(value != undefined)
							{
								// convert item property name to xmp qualifier here
								// converter: [ [ "layerProperty", "docArrayItemQualifier"] ]
								if(obj.converter != undefined)
								{
									if(obj.converter instanceof Array)
									{
										for(var k = 0; k < obj.converter.length; k++)
										{
											if(obj.converter[k][0] == property)
											{
												property = obj.converter[k][1];
											}
										}
									}
								}

								// if($.level) $.writeln(property +": " + value );
								specsObj[property] = value;
							}
						}
					}
				}
				else if(obj.dictionary instanceof Object)
				{
					for (var key in keyValuePairs)
					{
						if (key.charAt(0) == '_' || key == "reflect" || key == "Components" || key == "typename")
						{
							continue;			
						}
						if(keyValuePairs[key] != undefined)
						{
							var value = keyValuePairs[key];
							if(value != undefined)
							{
								if(typeof value != "function")
								{
									if(value != null && value != "null")
									{
										// convert item property name to xmp qualifier here
										// converter: [ [ "layerProperty", "docArrayItemQualifier"] ]
										if(obj.converter != undefined)
										{
											if(obj.converter instanceof Array)
											{
												for(var k = 0; k < obj.converter.length; k++)
												{
													if(obj.converter[k][0] == key)
													{
														key = obj.converter[k][1];
													}
												}
											}
										}

										specsObj[key] = value;
										// if($.level) $.writeln("***"+key +": " + value );
									}
								}
							}
						}
					}
				}
			}

			// if custom function object is passed along to do something specific with the current state of the document or layer, execute it here
			if(obj.customObjFunction != undefined)
			{
				specsObj.customResults = obj.customObjFunction();
			}

			// JSUI.quickLog(specsObj, "Updating...");

			updatedSpecsArr.push(specsObj);
		}

		if(Pslib.isPhotoshop)
		{
			// restore selection in layers palette 
			for(var i = 0; i < specsArr.length; i++)
			{
				if(specsArr[i])
				{
					if(specsArr[i].id) Pslib.selectLayerByID( specsArr[i].id, true );
				}
			}
		}

		return updatedSpecsArr;
	// }
	// else if(Pslib.isIllustrator)
	// {

	// }
}

Pslib.getActiveArtboard = function()
{
	if(Pslib.isIllustrator)
	{
		var doc = app.activeDocument;
		var i = doc.artboards.getActiveArtboardIndex();
		var artboard = doc.artboards[i];
	
		return artboard;
	}
}

Pslib.getArtboardByName = function (nameStr, activateBool)
{
	if(Pslib.isIllustrator)
	{
		var doc = app.activeDocument;
		var artboard = doc.artboards.getByName(nameStr);

		if(artboard)
		{
			if(activateBool)
			{
				for(var i = 0; i < doc.artboards.length; i++)
				{
					if(doc.artboards[i] == artboard)
					{
						doc.artboards.setActiveArtboardIndex(i);
						break;
					}
	
				}
			}
			return artboard;
		}
	}
}

// get artboard index without having to make it active
Pslib.getArtboardIndex = function (artboard, activateBool)
{
	if(Pslib.isIllustrator)
	{
		var doc = app.activeDocument;
		var index;

		for(var i = 0; i < doc.artboards.length; i++)
		{
			if(doc.artboards[i] == artboard)
			{
				index = i;
				if(activateBool) doc.artboards.setActiveArtboardIndex(i);
				break;
			}
		}

		return index;
	}	
}

// okay-ish for getting indexes IF you don't have multiple artboards with the same name
Pslib.getArtboardIndexByName = function (nameStr, activateBool)
{
	if(Pslib.isIllustrator)
	{
		var doc = app.activeDocument;
		var artboard = doc.artboards.getByName(nameStr);
		var index;

		for(var i = 0; i < doc.artboards.length; i++)
		{
			if(doc.artboards[i] == artboard)
			{
				index = i;
				if(activateBool) doc.artboards.setActiveArtboardIndex(i);
				break;
			}
		}

		return index;
	}	
}

// get simple artboard names array for matching / renaming
Pslib.getArtboardNames = function( artboards )
{
	if(Pslib.isIllustrator)
	{
		if(!artboards)
		{
			artboards = app.activeDocument.artboards;
		}

		var artboardNames = [];
		for(var i = 0; i < artboards.length; i++)
		{
			artboardNames.push(artboards[i]);
		}
		return artboardNames;
	}
}

// get quick artboard info (structure to match Photoshop artboard objects)
Pslib.getArtboardCollectionCoordinates = function()
{
	var artboards = app.activeDocument.artboards;
	var artboardObjArr = [ ];

	app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

	for(var i = 0; i < artboards.length; i++)
	{
		var coords = Pslib.getArtboardCoordinates( artboards[i] );
		var obj = { name: coords.name, id: i, width: coords.width, height: coords.height, x: coords.x, y: coords.y };
		artboardObjArr.push(obj);
	}

	return artboardObjArr;
}

Pslib.getArtboardCoordinates = function( artboard )
{
	if(Pslib.isIllustrator)
	{
		if(!artboard)
		{ 
			var artboard = Pslib.getActiveArtboard();
		}

		// if(app.coordinateSystem != CoordinateSystem.ARTBOARDCOORDINATESYSTEM) app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

		var rect = artboard.artboardRect;
		var coords = {};

		coords.name = artboard.name.trim();
		coords.x = rect[0];
		coords.y = (-rect[1]);
		coords.width = rect[2] - rect[0];
		coords.height = Math.abs(rect[3] - rect[1]);
		coords.rect = rect;
		coords.centerX = coords.x + coords.width/2;
		coords.centerY = coords.y - coords.height/2;

		// advanced logic for which we don't have to make the artboard active
		coords.isSquare = coords.width == coords.height;
		coords.isPortrait = coords.width < coords.height;
		coords.isLandscape = coords.width > coords.height;
		coords.hasIntegerCoords = coords.x == Math.round(coords.x) && coords.y == Math.round(coords.y) && coords.width == Math.round(coords.width) && coords.height == Math.round(coords.height);

		return coords;
	}
	else if(Pslib.isPhotoshop)
	{
		if(!artboard)
		{ 
			var layer = app.activeDocument.activeLayer;
			if(!Pslib.isArtboard(layer))
			{
				return {};
			}
		}

		var coords = {};
		coords.name = layer.name.trim();

		// // get info
		// coords.x = rect[0];
		// coords.y = (-rect[1]);
		// coords.width = rect[2] - rect[0];
		// coords.height = Math.abs(rect[3] - rect[1]);
		// coords.rect = rect;
		// coords.centerX = coords.x + coords.width/2;
		// coords.centerY = coords.y - coords.height/2;

		// // advanced logic for which we don't have to make the artboard active
		// coords.isSquare = coords.width == coords.height;
		// coords.isPortrait = coords.width < coords.height;
		// coords.isLandscape = coords.width > coords.height;
		// coords.hasIntegerCoords = coords.x == Math.round(coords.x) && coords.y == Math.round(coords.y) && coords.width == Math.round(coords.width) && coords.height == Math.round(coords.height);

		return coords;
	}
}

// get extended artboard metrics and information
// 
Pslib.getArtboardSpecs = function( artboard )
{
	if(Pslib.isIllustrator)
	{
		var isActive = false;
		if(!artboard) { var artboard = Pslib.getActiveArtboard(); isActive = true; }
		var coords = Pslib.getArtboardCoordinates(artboard);
		var specs = coords;

		var doc = app.activeDocument;
		// specs.name = artboard.name;

		// specs.x = coords.x;
		// specs.y = coords.y;
		// specs.width = coords.width;
		// specs.height = coords.height;
		// specs.rect = coords.rect;

		// advanced logic for which we don't have to make the artboard active
		// specs.isSquare = coords.isSquare;
		// specs.isPortrait = coords.isPortrait;
		// specs.isLandscape = coords.isLandscape;
		// specs.hasIntegerCoords = coords.hasIntegerCoords; 

		specs.isPow2 = specs.width.isPowerOf2() && specs.height.isPowerOf2();
		specs.isMult4 = specs.width.isMult4() && specs.width.isMult4();
		specs.isMult8 = specs.width.isMult8() && specs.width.isMult8();
		specs.isMult16 = specs.width.isMult16() && specs.width.isMult16();

		// if active, select items and harvest more information
		if(isActive)
		{
			specs.index = doc.artboards.getActiveArtboardIndex();
			specs.page = specs.index+1;

			// specs.hasBitmap
			// specs.itemCount
			// specs.hasTaggedItem
		}

		return specs;
	}
}

// Lazy filters for uniformization of artboard specs objects between Photoshop & Illustrator
// with option to "rename" a property while retaining its value
// usage:
//		var obj = { name: "ExampleName", id: 10, assetID: "1234-5678-90AB", target: "Hello" };
// 		Pslib.filterDataObject( obj, [ "target", "replaced"] );
// yields { name: "ExampleName", assetArtboardID: 10, assetID: "1234-5678-90AB", replaced: "Hello" }
Pslib.filterDataObject = function( obj, extraPairArr )
{
    var newObj = {};
    if(obj.name) newObj.assetName = obj.name;
    if(Pslib.isPhotoshop)
    {
        if(obj.id) newObj.assetArtboardID = obj.id;
    }
    else if(Pslib.isIllustrator)
    {
        if(obj.index) newObj.assetArtboardID = obj.index;
    }

    if(obj.assetID) newObj.assetID = obj.assetID;
    if(extraPairArr)
    {
        if(extraPairArr.length == 2)
        {
			var value = obj[extraPairArr[0]];
            if(value != undefined)
			{
				newObj[extraPairArr[0]] = undefined;
				newObj[extraPairArr[1]] = value;
			}
        }
    }
    return newObj;
}

Pslib.filterDataObjectArray = function( arr, extraPairArr )
{
    var newArray = [];
    for(var i = 0; i < arr.length; i++)
    {
        var item = Pslib.filterDataObject( arr[i], extraPairArr );
        newArray.push(item);
    }
    return newArray;
}

// convert simple array pair to object
Pslib.pairArrToObj = function( arr, extraPairArr )
{
    var newObj = {};

	var property = arr[0];
	var value = arr[1];

	if(extraPairArr)
	{
		if(extraPairArr.length == 2)
		{
			var replaceProperty = extraPairArr[0];
			var newPropertyName = extraPairArr[1];
			if( property == replaceProperty)
			{
				property = newPropertyName;
			}
		}
	}
	newObj[property] = value;

    return newObj;
}

// convert array of pairs to array of objects
Pslib.pairArrCollectionToObjArr = function( arr, extraPairArr )
{
    var newArr = [];

    for(var i = 0; i < arr.length; i++)
    {
		var obj = Pslib.pairArrToObj(arr[i], extraPairArr);
		newArr.push(obj);
	}

    return newArr;
}

// convert set of pairs to single object
Pslib.pairArrCollectionToObj = function( arr, extraPairArr )
{
	var newObj = {};

    for(var i = 0; i < arr.length; i++)
    {
		var property = arr[i][0];
		var value = arr[i][1];
		if((property != undefined) && (value != undefined))
		{
			if(extraPairArr)
			{
				if(extraPairArr.length == 2)
				{
					var replaceProperty = extraPairArr[0];
					var newPropertyName = extraPairArr[1];
					if( property == replaceProperty)
					{
						property = newPropertyName;
					}
				}
			}
			newObj[property] = value;
		}
	}

    return newObj;
}

// quick check for selection / collection of items intersecting with artboard geometry
// if getItems, returns array of overlaps
Pslib.getItemsOverlapArtboard = function( itemsArr, artboard, getItems )
{
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) return;
		var doc = app.activeDocument;

		if(!artboard) var artboard = Pslib.getActiveArtboard();
		if(!itemsArr) var itemsArr = doc.selection ? doc.selection : undefined;
		if(!itemsArr) return;

		if(getItems) var overlapsArr = [];

		var artboardCoords = Pslib.getArtboardCoordinates(artboard);

		var abx1 = artboardCoords.x;
		var abx2 = artboardCoords.x + artboardCoords.width;
		var aby1 = artboardCoords.y;
		var aby2 = artboardCoords.y + artboardCoords.height;

		var overlaps = false;

		// function returns true if a single item in collection overlaps artboard geometry
		for(var i = 0; i < itemsArr.length; i++)
		{
			var item = itemsArr[i];
			var itemCoords = { x: item.left, y: -item.top, width: item.width, height: item.height};

			var itx1 = itemCoords.x; 
			var itx2 = itemCoords.x + itemCoords.width;
			var ity1 = itemCoords.y;
			var ity2 = itemCoords.y + itemCoords.height;
			
			var thisItemOverlaps = ((abx1 < itx2) && (itx1 < abx2) && (aby1 < ity2) && (ity1 < aby2));
			if(thisItemOverlaps)
			{
				overlaps = true;
				if(getItems) overlapsArr.push(item);
				// if not returning items, break the loop early
				else break; 
			}
		}

		return getItems ? overlapsArr : overlaps;
	}
}

// get collection of artboards for which selected items have an overlap with
// tried using .splice on a copy of doc.artboards, illustrator does NOT like it
Pslib.getArtboardsFromSelectedItems = function( itemsArr, getPagesBool )
{
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) return;
		var doc = app.activeDocument;

		if(!itemsArr) var itemsArr = doc.selection ? doc.selection : undefined;
		if(!itemsArr) return;

		var docArtboards = doc.artboards;
		var artboards = [];

		for(var j = docArtboards.length-1; j >= 0; j--)
		{
			var artboard = docArtboards[j];
			var artboardFound = false;

			for(var i = 0; i < itemsArr.length; i++)
			{
				var item = itemsArr[i];
				artboardFound = Pslib.getItemsOverlapArtboard([item], artboard, false);
				
				if(artboardFound)
				{
					artboards.push(getPagesBool ? (j+1) : artboard );
					break;
				}
			}
		}
		artboards.reverse();
		return artboards;
	}
}

Pslib.getViewCoordinates = function( view )
{
	if(Pslib.isIllustrator)
	{
		if(!view) { var view = app.activeDocument.views[0]; }
    
		var coords = {};
	
		var b = view.bounds;
	
		coords.x = b[0];
		coords.y = b[1];
		coords.width = Math.abs(coords.x - b[2]);
		coords.height = Math.abs(coords.y - b[3]);
	
		coords.isPortrait = coords.width < coords.height;
		coords.isLandscape = coords.width > coords.height;
		coords.isSquare = coords.width == coords.height;
	
		coords.zoom = view.zoom;
	
		coords.width100 = coords.width * coords.zoom;
		coords.height100 = coords.height * coords.zoom;
	
		return coords;
	}
}

// zoom and center on artboard
// default padding is 0.1 (10% around main view)
// note that the pixel preview option affects the displayed value
Pslib.zoomOnArtboard = function(artboard, forceValue, paddingValue)
{   
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) { return false; }

		var doc = app.activeDocument;
		var zoomed = false;

		// if only provided value is a number, assume it's the zoom level
		if(forceValue == undefined && (typeof artboard == "number"))
		{
			forceValue = artboard;
			artboard = Pslib.getActiveArtboard();
		}

		var artboard = artboard ? artboard : Pslib.getActiveArtboard();
	
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

		var coords = Pslib.getArtboardCoordinates(artboard);
		var viewCoords = Pslib.getViewCoordinates(doc.views[0]);
	
		var paddingValue = paddingValue ? paddingValue : 0.1; // 10% of visible view area

		var newBoundsW = coords.width + (coords.width * paddingValue);
		var newBoundsH = coords.height + (coords.height * paddingValue);
		var newZoomValue = forceValue ? forceValue : 4.0;
	
		if ( coords.isPortrait && (coords.isSquare && viewCoords.isPortrait) )
		{
			newZoomValue = viewCoords.width100 / newBoundsW;
		} 
		else if (coords.isLandscape)
		{
			newZoomValue = viewCoords.width100 / newBoundsW;
		}
		else 
		{
			newZoomValue = viewCoords.height100 / newBoundsH;
		}
	
		try
		{
			doc.views[0].zoom = newZoomValue;
			doc.views[0].centerPoint = [coords.centerX, coords.centerY]; 
			zoomed = true;
		}
		catch(e)
		{

		}

		return zoomed;
	}
}

// round x+y coords and width+height of artboards
Pslib.validateArtboardRects = function( artboards, offsetPageItems )
{
	if(Pslib.isIllustrator)
	{
		if(!artboards)
		{
			artboards = app.activeDocument.artboards;
		}

		var updated = false;

		for(var i = 0; i < artboards.length; i++)
		{
			var artboard = artboards[i];
			var rect = artboard.artboardRect;

			var x = rect[0];
			var y = rect[1];
			var w = rect[2] - x;
			var h = y - rect[3];
			
			// we need a method selectively allowing differences in hundredths / thousandths of pixels: 
			// in this specific context 128.00007123 and 128.0 should be considered equal,
			// as stored values do not precisely correspond to what illustrator shows in its UI.
			if(x % 2 != 0 || y % 2 != 0 || w % 2 != 0 || h % 2 != 0) 
			{
				artboard.artboardRect = [ Math.round(x), Math.round(y), Math.round(rect[2]), Math.round(rect[3]) ];
	
				// should probably offset artboard pageItems by difference?
				if(offsetPageItems)
				{


				}

				updated = true;
			}
		}

		return updated;
	}
}

// simple function to find/replace/add text patterns in artboard names 
// var obj = { find: "TextToFind", replace: "TextToReplaceWith", prefix: "Prefix_", suffix: "_Suffix" }
Pslib.renameArtboards = function( artboards, obj )
{
	if(Pslib.isIllustrator)
	{
		if(!obj){ return; }
		// if(!obj){ var obj = {} }; // this could be valid if used by sanitization function

		if(!artboards)
		{
			artboards = app.activeDocument.artboards;
		}

		var renamedArr = [];
		for(var i = 0; i < artboards.length; i++)
		{
			var artboard = artboards[i];
			var originalStr = artboard.name;
			var renamedStr = artboard.name.trim();

			if(obj.find)
			{
				artboard.name = artboard.name.replace(obj.find, obj.replace);
				renamedStr = artboard.name;
			}

			// can be empty
			if(obj.prefix != undefined)
			{
				artboard.name = obj.prefix + artboard.name;
				renamedStr = artboard.name;
			}

			// can be empty
			if(obj.suffix != undefined)
			{
				artboard.name = artboard.name + obj.suffix;
				renamedStr = artboard.name;
			}
			if(renamedStr != originalStr) renamedArr.push(renamedStr);
			else renamedArr.push(undefined); // push nothing, just so returned array length matches original
		}
		return renamedArr;
	}
}

// replace any whitespace characters in artboard collection names
// default replacement is underscore, define optional object as { replace: "^-^" } to use something else
Pslib.renameArtboardsWhiteSpace = function( artboards, obj )
{
	if(Pslib.isIllustrator)
	{
		if(!obj){ var obj = {} }; 
		return Pslib.renameArtboards( artboards, { find: new RegExp(/[\s]/g), replace: obj.replace != undefined ? obj.replace : "_" } );
	}
}

// deal with special characters: whitespace, slash, backslash, question, exclamation, quotes etc (default replacement is "_")
// default replacement is underscore, define optional object as { replace: "^-^" } to use something else
Pslib.renameArtboardsSystemSafe = function( artboards, obj )
{	
	if(Pslib.isIllustrator)
	{
		if(!obj){ var obj = {} }; 
		return Pslib.renameArtboards( artboards, { find: new RegExp(/[\s:\/\\*\?\!\"\'\<\>\|]/g), replace: obj.replace != undefined ? obj.replace : "_" } );
	}
}

// this is broken for now!
Pslib.moveItemsToLayer = function( items, layer )
{	
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) return;
		
		var doc = app.activeDocument;
		// var initialSelection = doc.selection;
		if(!items)
		{
			// items = doc.pageItems;
			items = doc.selection;
		}
		// doc.selection = items;

		var movedItems = [];
		var layerWasLocked = false;
		var layerWasHidden = false;

		// if user passed string instead of layer object, attempt to get layer by name
		if(typeof layer == "string")
		{
			layer = doc.layers.getByName(layer);

			// if not found, fallback to default value
			if(!layer)
			{
				layer = doc.layers.getByName("Placeholders");
			}
			if(!layer)
			{
				layer = doc.layers.getByName("placeholders");
			}
		}

		if(!layer || layer.typename != "Layer")
		{
			return movedItems;
		}

		if(layer.typename == "Layer")
		{
			if(layer.locked)
			{
				layer.locked = false;
				layerWasLocked = true;
			}

			if(!layer.visible)
			{
				layer.visible = true;
				layerWasHidden = true;
			}
	
			for(var i = 0; i < items.length; i++)
			// for (var i = items.length-1; i >=0; i--) 
			{
				var item = items[i];
				doc.selection = item;
				// try{
					// doc.selection = [item];
					// if(item.parent != layer)
					// {
						// item.move(layer, ElementPlacement.PLACEATEND);
						// item.move(layer, ElementPlacement.PLACEATBEGINNING);
						// doc.selection[0].move(layer, ElementPlacement.PLACEINSIDE);

						// doc.selection[0].zOrder(ZOrderMethod.SENDTOBACK);

						try
						{
							doc.selection[0].move(layer, ElementPlacement.PLACEINSIDE);
							movedItems.push(item);
						}
						catch(e)
						{
						// 	alert("ERROR:\n" + e);
						}

						// item.moveToEnd(layer);
						// doc.selection[0].moveToEnd(layer);
						// item.moveToBeginning(layer);
						
						// if($.level) $.writeln(i + " moved " + item.name + " to " + layer.name + "  parent: " + item.parent.name);
					// }

					// alert(item.name + "\nparent: " + item.parent.typename);
				// }
				// catch(e)
				// {
				// 	alert("ERROR:\n" + e);
				// }
			}
	
			if(layerWasLocked)
			{
				layer.locked = true;
			}
			if(layerWasHidden)
			{
				layer.visible = false;
			}
		}

		// doc.selection = initialSelection;

		return movedItems;
	}
}

Pslib.documentFromArtboard = function( templateUri )
{
	if(Pslib.isIllustrator)
	{
		var sourceDoc = app.activeDocument;
		var artboard = Pslib.getActiveArtboard(); 
		var artboardName = artboard.name;
		var duplicatedItems = [];

		// set coordinates system before storing metrics
		app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;

		// store metric info
		var artboardRect = artboard.artboardRect;
		var artboardOrigin = artboard.rulerOrigin;

		var newDoc = Pslib.createNewDocument( templateUri );

		// get items to duplicate
		app.activeDocument = sourceDoc;
		sourceDoc.selectObjectsOnActiveArtboard();
		var sel = sourceDoc.selection;

		for (var i = 0; i < sel.length; i++)
		{ 
			var item = sel[i];
			var newItem = item.duplicate(newDoc.layers[0], ElementPlacement.PLACEATEND);
			duplicatedItems.push([ newItem, item.left, item.top ]);
		}

		// switch to new doc, adjust coordinates system
		app.activeDocument = newDoc;
		app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;

		var destArtboard = newDoc.artboards[0];
		destArtboard.rulerOrigin = artboardOrigin;
		destArtboard.artboardRect = artboardRect;
		destArtboard.name = artboardName;

		// reposition items
		for (var i = 0; i < duplicatedItems.length; i++)
		{ 
			var destItem = duplicatedItems[i][0];
			destItem.left = duplicatedItems[i][1];
			destItem.top = duplicatedItems[i][2];
		}

		// zoom / center artboard in viewport
		Pslib.zoomOnArtboard(destArtboard, undefined, 0.2);

		return newDoc;
	}
}

// Pslib.artboardsToFiles()
// Only for Illustrator, assumes JSUI is also included
// Advanced options using XMP
/*
var obj = { 
	extension: ".png",							// output format: default is ".png", use ".json" if you only want JSON data and no images 
	pagesArr: [ ],								// artboards to export: undefined value outputs current page, "all" for the entire collection (1-based, same number indicated on Artboards palette)
	exportFolderUri: "/full/path/to/folder" 	// destination path // default: ./{DocumentName}-assets
	document: false,							// saves entire layout to file along with artboard collection
	exportOptions: {}, 							// custom export options to use for .ai/.psd format output
	formatOptions: {}, 							// custom format options to use for .png/.svg/.pdf SmartExport ("Export For Screens")
	templateUri: "/full/path/to/template.ait", 	// default: undefined, creates blank document using Web DocumentPreset if no template is provided
	saveJson: false, 							// get basic coordinates from artboards (name, x, y, width, height)
	advancedCoords: false, 						// get advanced coordinates for each artboard (slower, requires selecting items for each to get custom tags) 
	dictionary: Pslib.docKeyValuePairs,			// bidimensional array of key/value pairs to get from document's XMP
	bypassXmpRange: false,						// if true, does not honor the document's hardcoded .range value
	bypassXmpDestination: false,				// if true, does not honor the document's hardcoded .destination value
	bypassXmpSource: false,						// if true, does not honor the document's hardcoded .source value
	namespace: undefined, 						// get document XMP tags from specific namespace
	jsonData: {}, 								// default JSON data to include for each artboard 
	confirmReplace: false,						// if true, will ask for permission to replace existing files
	confirmCreateFolder: false,					// if true, will ask for permission to create directory if it does not exist in file system
	prefix: "",									// prefix for each exported file (all supported formats)
	objArrFunction: undefined,					// function to execute on resulting object
	close: false								// for .ai + .psd, will leave new documents created from individual artboards open 
};
 */

/*
	// advanced stuff

	// advancedCoords gets values for tags defined in Pslib.docKeyValuePairs, 
	// which you can override before running artboardsToFiles() ...

	Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
	Pslib.XMPNAMESPACEPREFIX = "gs:";
	XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);

	// ...or include a namespace that is already handled earlier in the script
	Pslib.artboardsToFiles( { saveJson: true, advancedCoords: true, dictionary: [ ["key","defaultValue"],["key","value"] ],  namespace: "http://www.domain.com/definition/"})

	// hardcoded document-based XMP logic (these can potentially be used by external tools)
	
	obj.dictionary.range		 	// string, continuous or otherwise range of pages, so to speak -- "1-5, 7-8, 10, 12"
	// 		a quick way to get a usable string for this is bringing up the Export For Screens dialog, selecting artboards, 
	//		and copying the resulting value for Range to the clipboard
	
	obj.dictionary.destination 		// string, hardcoded export location, relative to current document "./images" or absolute "/full/path"
	
	obj.dictionary.source 			// string, usually a full path to the original source document used to export assets 
									// copied to exported JSON files to facilitate ancestor retrieval from a different context
									// you could choose to store several properties as part of a stringified object
									// this is a complement to .parentFullName which will point to the user's local file and may not be what you need.



	obj.objArrFunction				// function to be executed on resulting object
*/

// export process based on array of artboard indexes
// you may think of this as a slower version of the Export For Screens command
// with support for .ai + .psd output
// (still uses Document.exportForScreens() method for PNG, SVG, PDF)


// var obj = {
//	pagesArr: [ 1, 2, 3, 4, 5 ] 	// 1-based (the artboard number on the Artboards palette)
//
//	}
// returns array of results objects
 
// known bugs: multiple ranges "1-3,10-12" only yield first portion
//

Pslib.artboardsToFiles = function( obj )
{
	if(Pslib.isIllustrator)
	{ 
		if(!obj) { var obj = {}; }

		if(!app.documents.length) return;
		var sourceDoc = app.activeDocument;

		// first check for system folder nonsense before proceeding
			// if Document.fullName is undefined, default export location is going to point to a system directory where we have no business saving files to.
			// on macOS getting fullName for "Untitled-1" Illustrator document that has not yet been saved to disk returns "/Untitled-1" 			
			// Windows shows the folder where the host application lives
			// var matchesSystem = JSUI.isWindows ? (sourceDoc.fullName.toString().match( app.path) != null) : (sourceDoc.fullName.toString() == ("/" + app.activeDocument.name));

		var matchesSystem = JSUI.isWindows ? (sourceDoc.fullName.toString().match( app.path) != null) : (sourceDoc.fullName.toString() == ("/" + sourceDoc.name));

		if(matchesSystem) 
		{
			alert("Error: Document should be saved to disk at least once before exporting assets. Please try again.");
			return;
		}

		// if no indexes provided, get active artboard
		if(!obj.pagesArr) { obj.pagesArr = [ sourceDoc.artboards.getActiveArtboardIndex()+1 ]; } // +1 so index zero means page one

		// if provided pages range is a string, convert "1-5" to [ 1, 2, 3, 4, 5 ]
		if(typeof obj.pagesArr == "string")
		{
			if(obj.pagesArr == "all")
			{
				// user means to export entire artboards collection
				obj.pagesArr = "1" + ( sourceDoc.artboards.length > 1 ? ("-" + sourceDoc.artboards.length) : "" );
				obj.pagesArr = obj.pagesArr.toRangesArr();
			}
			else if(!isNaN(parseInt(obj.pagesArr)))
			{
				obj.pagesArr = obj.pagesArr.toRangesArr(); 

				// option to bypass this later using docKeyValuePairs.range
				// issue here with multiple ranges in XMP?
			}
			else
			{
				// fallback to active artboard
				obj.pagesArr = [ sourceDoc.artboards.getActiveArtboardIndex()+1 ];
			}
		}
		
		// additional sanitization check: make sure the array does not contain page numbers that go over the document's actual length
		var highestNum = obj.pagesArr[obj.pagesArr.length-1];
		
		// if extension user is aking for is invalid, abort right away
		// force PNG if not provided
		var extension = obj.extension ? obj.extension : ".png"; // ".ai" / ".psd" 
		if(!(extension == ".png" || extension == ".psd" || extension == ".ai" || extension == ".svg" || extension == ".pdf" || extension == ".json" ))
		{
			alert("Error with output file format!\nMake sure you are using one of these:\n.png (default)\n.psd\n.ai\n.svg\n.pdf");
			return;
		}

		// just in case
		if(extension == ".json")
		{
			obj.saveJson = true;
		}

		// some preparation based on exportForScreens supported formats
		if((extension == ".png" || extension == ".svg" || extension == ".pdf"))
		{
		    // // User's local "Create Sub-folders" setting from Export For Screens dialog (will create "1x" subfolder if true)
			var smartExportUICreateFoldersPreference_UserValue = app.preferences.getIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference');
			if(smartExportUICreateFoldersPreference_UserValue)
			{   
				app.preferences.setIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference', 0);
			}
		}
		
		var resultObjArr = [];
		// var exportCount = 0;

		var destinationFolder = obj.exportFolderUri;

		var docNameNoExt = sourceDoc.name.getFileNameWithoutExtension();
		// var sourceDocName = sourceDoc.name.toFileSystemSafeName();
		

		// var originalSelection = sourceDoc.selection;

		if(obj.exportFolderUri)
		{
			var exportFolderUriStr = obj.exportFolderUri.toString().trim();
			if(exportFolderUriStr.length)
			{		
				// "./" can be dangerous, but valid
				if(exportFolderUriStr == "./")
				{
					// destinationFolder = JSUI.getRelativeFolderPath( obj.exportFolderUri, sourceDoc.path);
					destinationFolder = sourceDoc.path;
				}
				// if first character is a period or a slash, assume relative pattern
				// if(exportFolderUriStr[0] == "." || (exportFolderUriStr[0] == "/" && exportFolderUriStr.length > 2))
				else if((exportFolderUriStr.match( /^\.\// ) != null) && exportFolderUriStr.length > 2)
				{
					// destinationFolder = sourceDoc.path;
					destinationFolder = JSUI.getRelativeFolderPath( obj.exportFolderUri, sourceDoc.path);
				}
				else
				{
					// if we have no periods, no slashes, no backslashes, 
					var matchesDot = exportFolderUriStr.match( /\./g ) != null;
					var matchesSlash = exportFolderUriStr.match( /\//g ) != null;
					var matchesBackslash = exportFolderUriStr.match( /\\/g ) != null;
					
					// assume a simple directory name to add in same location as source document
					if(!matchesDot && !matchesSlash && !matchesBackslash)
					{
						destinationFolder =  new Folder(sourceDoc.path + "/" + obj.exportFolderUri); 
					}
				}
			}
		}

		// if no destination folder specified, force Photoshop Generator pattern
		if(!obj.exportFolderUri)
		{
			var sourceDocPath = sourceDoc.path;
			destinationFolder = new Folder(sourceDocPath + "/"+ docNameNoExt.toFileSystemSafeName() + "-assets");			
		}

		// get these before looping
		// not going through decodeURI automatically?
		var docKeyValuePairs = Pslib.getXmpDictionary( sourceDoc, obj.dictionary ? obj.dictionary : Pslib.docKeyValuePairs, false, false, false, obj.namespace ? obj.namespace : Pslib.XMPNAMESPACE); // get "source" tag from document if present

		// if .range property found in custom XMP namespace, use it to override the export location
		if(docKeyValuePairs.range && !obj.bypassXmpRange)
		{
			var xmpRange = decodeURI(docKeyValuePairs.range).replace(/[\s]/g,'');

			if(typeof xmpRange == "string")
			{
				if(!isNaN(parseInt(xmpRange)))
				{
					obj.pagesArr = xmpRange.toRangesArr();
				}
			}

			highestNum = obj.pagesArr[obj.pagesArr.length-1];
		}

		if( highestNum > sourceDoc.artboards.length )
		{
			var rangeErrorMsg = "Error:\nInput range is outside of document's total artboard collection (" + sourceDoc.artboards.length + ")\n\nClamp values?\n\n[" + obj.pagesArr.toString() +"]";

			var confirmRangeClamp = confirm( rangeErrorMsg, "Confirm Range Clamping" );
			if(confirmRangeClamp)
			{
				// trim array until numbers make sense.
				while (highestNum > sourceDoc.artboards.length)
				{
					obj.pagesArr.pop();
					highestNum = obj.pagesArr[obj.pagesArr.length-1];
					// if($.level) $.writeln("highestNum: " + highestNum);
					if(highestNum == 1) break;
				}
			}
			else
			{
				return;
			}
		}

		// if destination tag found, process info
		if(docKeyValuePairs.destination	&& !obj.bypassXmpDestination)
		{
			var xmpUriStr = decodeURI(docKeyValuePairs.destination).trim();

			// if obj.exportFolderUri was NOT provided and we have a .destination defined in XMP, 
			// remove "-assets" pattern relative to activeDocument path and use source file path as a template
			// there should be a check to make sure an output file is not going to replace the active document on disk
			if(!obj.exportFolderUri) destinationFolder = sourceDoc.path;

			// check if destination is relative or absolute
			var relativeDir = JSUI.getRelativeFolderPath( xmpUriStr, destinationFolder );
			destinationFolder = relativeDir;

			// issue IF single-word path in XMP && single-word path in obj.exportFolderUri: 
			// currently results in this pattern: {Document.path}/{obj.exportFolderUri}/{xmp.destination}

			// if we have no periods, no slashes, no backslashes, 
			var matchesDot = xmpUriStr.match( /\./g ) != null;
			var matchesSlash = xmpUriStr.match( /\//g ) != null;
			var matchesBackslash = xmpUriStr.match( /\\/g ) != null;
			
			// assume a simple directory name to add in same location as source document (?)
			if(!matchesDot && !matchesSlash && !matchesBackslash)
			{
				destinationFolder =  new Folder(sourceDoc.path + "/" + xmpUriStr); 
			}

			if((xmpUriStr.match( /^\.\// ) != null) && xmpUriStr.length > 2)
			{
				// destinationFolder = sourceDoc.path;
				destinationFolder = JSUI.getRelativeFolderPath( xmpUriStr, sourceDoc.path);
			}
		}

		// alert( "exportFolderUri!\n" + obj.exportFolderUri + "\n" + obj.exportFolderUri.match(/^\.\//) + "\n" + destinationFolder);

		// issue here if chain of directories to create is longer than one
		// "./images" will work, "./output/images" will not 
		var destDirCheck = new Folder(destinationFolder);
		var dirParent = destDirCheck.parent;

		// at this point if .parent points to system folder, abort
		if(dirParent.toString() == "/" || dirParent.toString().match(app.path) != null)
		{
			alert("Error: Destination path invalid Please try again.\n\n" + destinationFolder);
			return;
		}
		

		// alert("destDirCheck: " + destDirCheck + "\nParent exists: " + dirParent +  "\nparent exists: " + dirParent.exists + "\n\n" + relativeDir + "\ndestination exists: " + relativeDir.exists);

		// if parent directory is present but target directory does not, create it.
		if(dirParent.exists && !destinationFolder.exists)
		{
			if(obj.confirmCreateFolder)
			{
				// offer to create directory if it does not exist.
				var createDirMsg = "This directory does not exist. Create?\n\n" + destinationFolder;
				var confirmCreateDirectory = confirm(createDirMsg, "Confirm directory creation");
				if(confirmCreateDirectory)
				{
					if(dirParent.exists)
					{
						destinationFolder.create();
					}
				}
				else
				{
					return;
				}
			}
			else
			{
				destinationFolder.create();
			}
		}

		//
		if(extension == ".png" || extension == ".svg" || extension == ".pdf" || extension == ".json" ) //obj.saveJson
		{
			var prefixStr = obj.prefix != undefined ? obj.prefix : "";
			// var suffixStr = obj.suffix != undefined ? obj.suffix : ""; // this won't work with ExportForScreens
            var exportOptions = new ExportForScreensItemToExport();
			exportOptions.artboards = obj.pagesArr.toSimplifiedString(); // [1, 2, 3, 4, 5] becomes "1-5"
            exportOptions.document = obj.document ? obj.document : false; // exports docname.png/.svg

			switch(extension)
			{
				case ".json" :
				{
					//
					break;
				}
				case ".png" :
				{
					var formatType = ExportForScreensType.SE_PNG24;
					var formatOptions = obj.formatOptions ? obj.formatOptions : new ExportForScreensOptionsPNG24();
					// ExportForScreensOptionsPNG24.transparency (default: true)

					// formatOptions.antiAliasing
					//     AntiAliasingMethod.ARTOPTIMIZED
					//
					//     AntiAliasingMethod.None
					//     AntiAliasingMethod.TYPEOPTIMIZED

					// formatOptions.backgroundBlack (default false)
					// ExportForScreensOptionsPNG24.interlaced (default false)

					// ExportForScreensOptionsPNG24.scaleType
					// ExportForScreensScaleType.SCALEBYFACTOR
					//
					// ExportForScreensScaleType.SCALEBYHEIGHT
					// ExportForScreensScaleType.SCALEBYRESOLUTION
					// ExportForScreensScaleType.SCALEBYWIDTH

					// ExportForScreensOptionsPNG24.scaleTypeValue (default 1.0)

					sourceDoc.exportForScreens(destinationFolder, formatType, formatOptions, exportOptions, prefixStr);
					
					break;
				}
				case ".svg" :
				{
					var formatType = ExportForScreensType.SE_SVG;
					var formatOptions = obj.formatOptions ? obj.formatOptions : new ExportForScreensOptionsWebOptimizedSVG();


                // formatOptions.coordinatePrecision = 3; // Int32 (range 1 - 7)

                // formatOptions.cssProperties
                    // SVGCSSPropertyLocation
                    // SVGCSSPropertyLocation.ENTITIES
                    // SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES
                    // SVGCSSPropertyLocation.STYLEATTRIBUTES
                    // SVGCSSPropertyLocation.STYLEELEMENTS

                // formatOptions.fontType
                //     SVGFontType.OUTLINEFONT
                //     SVGFontType.SVGFONT

                // formatOptions.rasterImageLocation
                //     RasterImageLocation.EMBED
                //     RasterImageLocation.LINK
                //     RasterImageLocation.PRESERVE

                // formatOptions.svgId
                //     SVGIdType.SVGIDMINIMAL
                //     SVGIdType.SVGIDREGULAR
                //     SVGIdType.SVGIDUNIQUE

                // formatOptions.svgMinify = true/false

                // formatOptions.svgResponsive = true/false

					sourceDoc.exportForScreens(destinationFolder, formatType, formatOptions, exportOptions, prefixStr);

					break;
				}
				case ".pdf" :
				{
					var formatType = ExportForScreensType.SE_PDF;
					var formatOptions = obj.formatOptions ? obj.formatOptions : new ExportForScreensPDFOptions();

					// .pdfPreset = ""

					sourceDoc.exportForScreens(destinationFolder, formatType, formatOptions, exportOptions, prefixStr);

					break;
				}
			}
		}

		// prepare object to return forensic info along with data
		var resultObj = {};

		// if((extension == ".psd" || extension == ".ai" || extension == ".json") || obj.saveJson )
		if((extension == ".psd" || extension == ".ai" || extension == ".json" || extension == ".png" || extension == ".svg" || extension == ".pdf" ) || obj.saveJson )
		{
			for(var i = 0; i < obj.pagesArr.length; i++)
			{
				resultObj = {};
				app.activeDocument = sourceDoc;
				var artboardIndex = obj.pagesArr[i];
				sourceDoc.artboards.setActiveArtboardIndex(artboardIndex-1);
				var originalArtboard = Pslib.getActiveArtboard();

				var newDoc;

				var artboardName = originalArtboard.name;
				// var artboardNameFs = artboardName.toFileSystemSafeName();
				// var artboardIndex = sourceDoc.artboards.getActiveArtboardIndex();
				var placeholder;
				var artboardJsonData = { }; 
				// use provided JSON data
				if(obj.jsonData)
				{
					artboardJsonData = obj.jsonData;
				}
				// build default JSON data structure
				else
				{
					artboardJsonData = Pslib.getArtboardCoordinates(originalArtboard);
					artboardJsonData.index = artboardIndex-1;
					
					// remove extra info
					artboardJsonData.rect = undefined;
					artboardJsonData.centerX = undefined;
					artboardJsonData.centerY = undefined;

					artboardJsonData.isSquare = undefined;
					artboardJsonData.isPortrait = undefined;
					artboardJsonData.isLandscape = undefined;
					artboardJsonData.hasIntegerCoords = undefined;

					// if asked to get advanced coordinates / tags, items must be selected on artboard (this is noticeably slower)
					if(obj.advancedCoords)
					{
						placeholder = Pslib.getArtboardItem(originalArtboard, "#");

						if(placeholder)
						{
							// this includes ALL tags found on placeholder
							var tags = Pslib.getAllTags(placeholder)
							var tagsObj = Pslib.arrayToObj( tags, {} );
							artboardJsonData.tags = tagsObj;

							// // target tags based on default key-value pairs for individual assets
							// // Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "index", null ]  ];

							// // transfer ALL tags
							// for(var k = 0; k < tags.length; k++)
							// {
							// 	var pName = tags[k][0];
							// 	var pValue = tags[pName];
							// 	if(pValue != undefined && pValue != null)
							// 	{
							// 		if($.level) $.writeln(pName + ": " + pValue);
							// 		if(tags[pName] != undefined) artboardJsonData[pName] = pValue;
							// 	}
							// }

							// // transfer only tags present in Pslib.assetKeyValuePairs
							// for(var k = 0; k < Pslib.assetKeyValuePairs.length; k++)
							// {
							// 	var tag = tagsObj[k];
							// 	if(tag == undefined) continue;

							// 	var pName = tag[0];
							// 	var pValue = tag[1];

							// 	if(Pslib.assetKeyValuePairs[k][0] == pName)
							// 	{
							// 		if(pValue != undefined && pValue != null)
							// 		{
							// 			if($.level) $.writeln(pName + ": " + pValue);
							// 			if(tags[pName] != undefined) artboardJsonData[pName] = pValue;
							// 		}
							// 	}
							// }
						}
					}

					artboardJsonData.parent = sourceDoc.name;
					var documentLocalPath = Pslib.getDocumentPath(sourceDoc);
					// artboardJsonData.parentFullName = documentLocalPath ? documentLocalPath.fsName : undefined; // absolute path
					artboardJsonData.parentFullName = documentLocalPath ? documentLocalPath.toString() : undefined; // relative ~/
					
					if(placeholder)
					{
						artboardJsonData.layer = placeholder.layer.name;
					}

					// // here we mostly want .source ... ?
					// for(var k = 0; k < Pslib.docKeyValuePairs.length; k++)
					// {
					// 	var pName = Pslib.docKeyValuePairs[k][0];
					// 	var pValue = docKeyValuePairs[pName];
					// 	if(pValue != undefined && pValue != null)
					// 	{
					// 		if($.level) $.writeln(pName + ": " + pValue);
					// 		if(docKeyValuePairs[pName] != undefined) artboardJsonData[pName] = docKeyValuePairs[pName];
					// 	}
					// }

					// // get xmp tags if present
					if(docKeyValuePairs.source && !obj.bypassXmpSource)
					{
						artboardJsonData.source = docKeyValuePairs.source;
					}
				}

				// only create new document if exporting to PSD or AI
				if (extension == ".psd" || extension == ".ai")
				{
					newDoc = Pslib.documentFromArtboard( obj.templateUri );
				}

				if(destinationFolder)
				{
					var outputFile = new File( destinationFolder + "/" + (obj.prefix != undefined ? obj.prefix : "") + artboardName + extension );

					if (extension == ".psd" || extension == ".ai" || extension == ".json") 
					{
						if(outputFile.exists)
						{
							if(obj.confirmReplace) 
							{
								var confirmMsg = "Replace existing file?\n\n" + outputFile.fsName;
								var confirmBool = confirm(confirmMsg);
								
								if(confirmBool)
								{
									outputFile.remove();
								}					
							}
							else
							{
								outputFile.remove();
							}
						}
					}

					// if ".ai", use saveAs() method
					if(extension == ".ai")
					{
						if(obj.exportOptions)
						{
							var aiOpts = obj.exportOptions;
						}
						else
						{
							var aiOpts = new IllustratorSaveOptions();
							aiOpts.pdfCompatible = true;
							aiOpts.compressed = true;
							aiOpts.embedICCProfile = true;
							aiOpts.embedLinkedFiles = true;
							aiOpts.saveMultipleArtboards = false;
						}

						newDoc.saveAs( outputFile, aiOpts);
						resultObj.outputFile = outputFile;
					}
					// if ".psd", use exportFile() method
					else if(extension == ".psd")
					{
						if(obj.exportOptions)
						{
							var psdOpts = obj.exportOptions;
						}
						else
						{
							var psdOpts = new ExportOptionsPhotoshop();

							// (editable layers)
							// var psdOpts = new ExportOptionsPhotoshop();
							// psdOpts.antiAliasing = true;
							// psdOpts.editableText = true;
							// psdOpts.embedICCProfile = true;
							// psdOpts.imageColorSpace = ImageColorSpace.RGB;
							// psdOpts.maximumEditability = true;
							// psdOpts.writeLayers = true;
							// psdOpts.resolution = 72;
							
							// (merged layers)
							psdOpts.antiAliasing = true;
							psdOpts.editableText = false;
							psdOpts.embedICCProfile = true;
							psdOpts.imageColorSpace = ImageColorSpace.RGB;
							psdOpts.maximumEditability = false;
							psdOpts.writeLayers = false;
							psdOpts.resolution = 72;
						}

						newDoc.exportFile( outputFile, ExportType.PHOTOSHOP, psdOpts);
						resultObj.outputFile = outputFile;
					}
				}

				// output json data
				if(obj.saveJson)
				{
					var jsonFile = outputFile.toString().swapFileObjectFileExtension(".json");
					if(jsonFile.exists) jsonFile.remove();

					var jsonFileCreated = false;

					 if( !JSUI.isObjectEmpty(artboardJsonData) ) 
					 jsonFileCreated = JSUI.writeToFile(jsonFile, JSON.stringify(artboardJsonData, null, "\t"), "utf8");
					
					if(jsonFileCreated)
					{
						resultObj.artboardJsonData = artboardJsonData;
						resultObj.jsonFile = jsonFile;
					}
				}

				// close new document if properly saved
				// if(obj.close && obj.exportFolderUri && (extension == ".ai" || extension == ".psd"))
				if(obj.close && (extension == ".ai" || extension == ".psd"))
				{
					newDoc.close(SaveOptions.DONOTSAVECHANGES);
					app.activeDocument = sourceDoc;
				}
				else if ( obj.exportFolderUri && (extension == ".ai" || extension == ".psd") ) 
				{
					// zoom on content
					Pslib.zoomOnArtboard(destArtboard);
				}

				if((extension == ".png" || extension == ".svg" || extension == ".pdf"))
				{
					resultObj.outputFile = outputFile;
				}
				resultObjArr.push(resultObj);
			}
		}

		// if asked to export entire document
		if(obj.document)
		{
			if(app.activeDocument != sourceDoc)
			{
				app.activeDocument = sourceDoc;
			}

			var outputFile = new File( destinationFolder + "/" + (obj.prefix != undefined ? obj.prefix : "") + docNameNoExt + extension );

			if(extension == ".psd")
			{
				if(obj.exportOptions)
				{
					var psdOpts = obj.exportOptions;
				}
				else
				{
					var psdOpts = new ExportOptionsPhotoshop();
					
					// (merged layers)
					psdOpts.antiAliasing = true;
					psdOpts.editableText = false;
					psdOpts.embedICCProfile = true;
					psdOpts.imageColorSpace = ImageColorSpace.RGB;
					psdOpts.maximumEditability = false;
					psdOpts.writeLayers = false;
					psdOpts.resolution = 72;
				}
	
				sourceDoc.exportFile( outputFile, ExportType.PHOTOSHOP, psdOpts);
			}
			if(extension == ".ai")
			{
				if(obj.exportOptions)
				{
					var aiOpts = obj.exportOptions;
				}
				else
				{
					var aiOpts = new IllustratorSaveOptions();
					aiOpts.pdfCompatible = true;
					aiOpts.compressed = true;
					aiOpts.embedICCProfile = true;
					aiOpts.embedLinkedFiles = true;
					aiOpts.saveMultipleArtboards = false;
				}

				// here, saving "as" basically destroys the original document
				// we need to saveAs, then reopen original
				// this can be dangerous if one of the exported has the same name
				var sourceDocFullPath = sourceDoc.fullName;
				sourceDoc.saveAs( outputFile, aiOpts);
				sourceDoc.close(SaveOptions.DONOTSAVECHANGES);
				sourceDoc = app.open(sourceDocFullPath);
			}
		}	

		if((extension == ".png" || extension == ".svg" || extension == ".pdf"))
		{
			// restore "Create Sub-folders" setting if needed
			if(smartExportUICreateFoldersPreference_UserValue)
			{
				app.preferences.setIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference', 1);
			}
		}

		// if single JSON file needed for entire hierarchy, build here from resulting array
		if(obj.objArrFunction != undefined)
		{
			var objArrFunctionResults = obj.objArrFunction(resultObjArr);
			// option to return results instead?
			// return objArrFunctionResults;
		}

		return resultObjArr;
	}
}

// wrapper used to quickly export current artboard
Pslib.artboardToFile = function( obj )
{
	if(Pslib.isIllustrator)
	{
		if(!obj) obj = {};
		obj.pagesArr = undefined;
		obj.bypassXmpRange = true;
		return Pslib.artboardsToFiles( obj );
	}
}

// wrapper used to quickly export all artboards
Pslib.allArtboardsToFiles = function( obj )
{
	if(Pslib.isIllustrator)
	{
		if(!obj) obj = {};
		obj.pagesArr = "all";
		obj.bypassXmpRange = true;
		return Pslib.artboardsToFiles( obj );
	}
}

Pslib.createNewDocument = function( templateUri )
{
	if(Pslib.isIllustrator)
	{
		var newDoc;

		if(templateUri)
		{
			var template = new File(templateUri);
			if(template.exists)
			{
				newDoc =  app.open( templateUri );
			}
			else
			{
				// option to browse to .ait if needed here?
				alert("Template URI invalid!\n" + templateUri);
				return;
			}
		}
		else
		{
			var dp = new DocumentPreset();
			dp.colorMode = DocumentColorSpace.RGB;
			dp.width = 128;
			dp.height = 128;
			dp.previewMode = DocumentPreviewMode.PixelPreview;
			dp.rasterResolution = DocumentRasterResolution.ScreenResolution; // .HighResolution, .MediumResolution
			dp.units = RulerUnits.Pixels;
			dp.transparencyGrid = DocumentTransparencyGrid.TransparencyGridMedium; // .TransparencyGridDark

			// newDoc = app.documents.add( app.activeDocument.documentColorSpace);
			newDoc = app.documents.addDocument("Web", dp);
		}
		return newDoc;
	}
}

// select first art item found with on current artboard
Pslib.getArtboardItem = function( artboard, nameStr )
{
	if(Pslib.isIllustrator)
	{
		if(!artboard) { var artboard = Pslib.getActiveArtboard(); }
		if(!nameStr) { var nameStr = "#"; }

		var targetItem;
		var found = false;
		var doc = app.activeDocument;
		doc.selectObjectsOnActiveArtboard();
		var selection = doc.selection;
	
		if(selection.length)
		{
			for (var i = 0; i < selection.length; i++)
			{
				var item = selection[i];
	
				// if artboard has only one item, and item is a group
				if( i == 0 && selection.length == 1 && item.typename == "GroupItem")
				{
					// enter isolation mode
					item.isIsolated = true;
					var groupItems = item.pageItems;
					for (var j = 0; j < groupItems.length; j++)
					{
						var subItem = groupItems[j];
						if(subItem.name == nameStr)
						{
							targetItem = subItem;
							found = true;
							doc.selection = subItem;
							break;
						}
					}
	
					// exit isolation mode
					item.isIsolated = false;
				}
	
				else if(item.name == nameStr)
				{
					targetItem = item;
					found = true;
					doc.selection = item;
					break;
				}
			}
		}
		return targetItem;
	}
}

// photoshop only
Pslib.getArtboardSpecsInfo = function( obj )
{
    // return empty array if no document present
    if(!app.documents.length)
    {
        return [];
    }

    if(!obj)
    {
        var obj = { };
		// obj.artboards = [];
		// if(Pslib.isIllustrator) obj.artboards = app.activeDocument.artboards;

    }

    var doc = app.activeDocument;
    var originalActiveLayer = doc.activeLayer; // may not be an artboard!
    // var originalActiveLayerID = getActiveLayerID();

    if(!obj.artboards) obj.artboards = getArtboards();

    var docSpecs = [];
    var artboardSpecs = [];

    var docSpecs = Pslib.getXmpDictionary( app.activeDocument, { source: null, hierarchy: null, specs: null, custom: null }, false, false, false, obj.namespace ? obj.namespace : Pslib.XMPNAMESPACE);
    var docHasTags = !JSUI.isObjectEmpty(docSpecs);

    // provide solution for exporting only active artboard specs
    for(var i = 0; i < obj.artboards.length; i++)
    {
        // var artboard = selectByID(obj.artboards[i][0]); // from Pslib
        var artboard = makeActiveByIndex(obj.artboards[i][0], false); // from Pslib

        artboard = app.activeDocument.activeLayer;

        // skip if extension needed but not found
        if(obj.extension)
        {
            if( !artboard.name.hasSpecificExtension( obj.extension ) )
            {
                continue;
            }
        }

        // if(artboard.name.hasSpecificExtension( obj.extension ? obj.extension : ".png"))
        // {
            // alert(app.activeDocument.activeLayer.name);
            // var specs = obj.artboards ? obj.artboards : getArtboardSpecs(artboard, obj.parentFullName);
            var specs = getArtboardSpecs(artboard, obj.parentFullName);
            // alert(specs)
            // inject document tags if needed
            if(docHasTags)
            {
                // if no tags present, force document's
                if(!specs.hasOwnProperty("tags"))
                {             
                    specs.tags = docSpecs;
                }
                // if tags object present, loop through template structure and inject as needed
                else
                {
                    // source: null, hierarchy: null, specs: null, custom: null
                    // here we assume that if a value is present, it should take precedence
                    if(!specs.tags.hasOwnProperty("source"))
                    {
                       specs.tags.source = docSpecs.source;
                    }
                }
            }
            artboardSpecs.push(specs);
        // }

    }

    // restore initial activeLayer
    if(doc.activeLayer != originalActiveLayer) doc.activeLayer != originalActiveLayer;

    return artboardSpecs;
}

// var rectObj = { artboard: artboard, name: "#", tags: [ ["name", "value"], ["name", "value"] ], hex: "FB5008", opacity: 50, layer: LayerObject, sendToBack: true  };
// 
Pslib.addArtboardRectangle = function ( obj )
{
	if(!obj)
	{
		var obj = {};
	}

	if(Pslib.isIllustrator)
	{
		if(!obj.artboard) return;

		// switch to artboard coordinates *before* getting metrics
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
	
		var doc = app.activeDocument;
		var coords = Pslib.getArtboardCoordinates(obj.artboard);
	
		var rect = doc.pathItems.rectangle( coords.x, -coords.y, coords.x+coords.width, coords.y+coords.height );
		doc.selection = rect;
	
		var transp = new NoColor();
		rect.strokeColor = transp;
		rect.fillColor = obj.hex != undefined ? Pslib.hexToRGBobj(obj.hex) : transp;
		rect.opacity = obj.opacity != undefined ? obj.opacity : 0.65;

		rect.name = obj.name ? obj.name : "#";
	
		if(obj.tags)
		{
			Pslib.setTags( rect, obj.tags );
		}
	
		if(obj.layer)
		{
			if(typeof obj.layer == "string")
			{
				obj.layer = doc.layers.getByName(obj.layer);

				// if not found, fallback to default
				if(!obj.layer)
				{
					obj.layer = doc.layers.getByName("Placeholders");
				}
				if(!obj.layer)
				{
					obj.layer = doc.layers.getByName("placeholders");
				}
			}

			// send to back (of layer)
			if(obj.layer)
			{
				rect.move(obj.layer, ElementPlacement.PLACEATEND);
			}
		}

		// make object the last in selection
		if(obj.sendToBack)
		{
			rect.zOrder(ZOrderMethod.SENDTOBACK);
		}
	
		return rect;
	}
}

// get items with specific name from provided artboards collection
Pslib.getArtboardItems = function( artboardsArr, nameStr )
{
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length)
		{
			return;
		}

		if(!artboardsArr) { var artboardsArr = app.activeDocument.artboards; }
		if(!nameStr) { var nameStr = "#"; }

		var artboardItems = [];

		for (var i = 0; i < artboardsArr.length; i++)
		{
			var item = Pslib.getArtboardItem( artboardsArr[i], nameStr );
			if(item)
			{
				artboardItems.push(item);
			}
		}
		return artboardItems;
	}
}


// RGB hex functions from JSUI

// get array of normalized values from hex string
// "#f760e3" becomes [0.96862745098039,0.37647058823529,0.89019607843137,1];
Pslib.hexToRGB = function (hex)
{
	var color = hex.trim().replace('#', '');
	var r = parseInt(color.slice(0, 2), 16) / 255;
	var g = parseInt(color.slice(2, 4), 16) / 255;
	var b = parseInt(color.slice(4, 6), 16) / 255;
	return [r, g, b, 1];
};

// hex string to Photoshop/Illustrator color object
Pslib.hexToRGBobj = function ( hexStr )
{
    var hex = hexStr != undefined ? hexStr : "000000";

	// illustrator does not have a direct hexValue property
	if(Pslib.isIllustrator)
	{
		var color = new RGBColor();
		color.red = Pslib.HexToR(hex);
		color.green = Pslib.HexToG(hex);
		color.blue = Pslib.HexToB(hex);
		return color;
	}
	else if(Pslib.isPhotoshop)
	{
		var color = new SolidColor();
		color.rgb.hexValue = hex;
		return color;
	}

    return;
};

// RGB values to hexadecimal string: (255, 0, 128) becomes "FF0080"
Pslib.RGBtoHex = function(r, g, b, a)
{
	return Pslib.toHex(r) + Pslib.toHex(g) + Pslib.toHex(b) + (a != undefined ? JSUI.toHex(a) : "")
};

// Number to hex string (128 becomes "80")
Pslib.toHex = function(n)
{
	if (n == 0 || n == null || n == undefined || isNaN(n)) return "00";
	if(isNaN(n)) n = parseInt(n);
	n = Math.max(0, Math.min(n, 255));
	return ((1<<8)+n).toString(16).toUpperCase().slice(1);
};

Pslib.cutHex = function(h)
{
	if(h.charAt(0)=="#") h = h.substring(1,7); 
	else if(h.charAt(0)=="0" && h.charAt(1)=="x") h = h.substring(2,8); return h;
};

Pslib.HexToR = function(h) 
{
	return parseInt((Pslib.cutHex(h)).substring(0,2), 16);
};

Pslib.HexToG = function(h) 
{
	return parseInt((Pslib.cutHex(h)).substring(2,4), 16);
};

Pslib.HexToB = function(h)
{
	return parseInt((Pslib.cutHex(h)).substring(4,6), 16);
};

Pslib.HexToA = function(h)
{
	return parseInt((Pslib.cutHex(h)).substring(6,8), 16);
};

Pslib.getLayerColor = function(id)
{
	if(Pslib.isPhotoshop)
	{
		if(!id) id = app.activeDocument.activeLayer.id;
		var ref = new ActionReference(); 
		ref.putProperty( cTID("Prpr"), sTID('color')); 
		ref.putIdentifier(cTID( "Lyr " ), id );
		return typeIDToStringID(executeActionGet(ref).getEnumerationValue(sTID('color'))); 
	}
	else if(Pslib.isIllustrator)
	{
		if(!id)
		{
			id = app.activeDocument.activeLayer;
		}
		var layer = id;
		var color = new RGBColor();
		color = layer.color;
		// var hexStr = Pslib.RGBtoHex(color.red, color.green, color.blue);
	
		// return hexStr;
		return color;
	}
}

// Photoshop: Pslib.setLayerColor(doc.activeLayer.id, "red")
// Illustrator: Pslib.setLayerColor(doc.activeLayer, "FF0000")
Pslib.setLayerColor = function(id, colorStr)
{
	if(Pslib.isPhotoshop)
	{
		if(!id) id = app.activeDocument.activeLayer.id;
		else Pslib.selectLayerByID(id);

		switch (colorStr.toLowerCase()){
			case 'red': colorStr = 'Rd  '; break;
			case 'orange' : colorStr = 'Orng'; break;
			case 'yellow' : colorStr = 'Ylw '; break;
			case 'green' : colorStr = 'Grn '; break;
			case 'blue' : colorStr = 'Bl  '; break;
			case 'violet' : colorStr = 'Vlt '; break;
			case 'gray' : colorStr = 'Gry '; break;
			case 'none' : colorStr = 'None'; break;
			default : colorStr = 'None'; break;
		}
		
		var desc27 = new ActionDescriptor();
		var ref3 = new ActionReference();
		ref3.putEnumerated( cTID('Lyr '), cTID('Ordn'), cTID('Trgt') );
		desc27.putReference( cTID('null'), ref3 );
		var desc28 = new ActionDescriptor();
		desc28.putEnumerated( cTID('Clr '), cTID('Clr '), cTID(colorStr) );
		desc27.putObject( cTID('T   '), cTID('Lyr '), desc28 );
		executeAction( cTID('setd'), desc27, DialogModes.NO );
	}
	else if(Pslib.isIllustrator)
	{
		if(!colorStr) return;
		var layer = id ? id : app.activeDocument.activeLayer;
		layer.color = Pslib.hexToRGBobj(colorStr);
	}
}

// hack to allow Array.sort() to sort objects based on value of .assetArtboardID
Pslib.compareArtboardID = function( a, b )
{
    if ( a.assetArtboardID < b.assetArtboardID ){ return -1; }
    if ( a.assetArtboardID > b.assetArtboardID ){ return 1; }
    return 0;
}

// get these from JSUI if not included along with Pslib
if(typeof JSUI !== "object")
{
	String.prototype.trim = function()
	{
		return this.replace(/^[\s]+|[\s]+$/g,'');
	}

	// Lack of support for Set()/Array.filter() calls for hacks
	Array.prototype.indexOf = function(element)
	{
		for(var i = 0; i < this.length; i++)
		{
			if(this[i] == element) return i;
		}
		return -1;
	};

	// removes duplicates in array
	Array.prototype.getUnique = function()
	{
		var unique = [];
		for(var i = 0; i < this.length; i++)
		{
			var current = this[i];
			if(unique.indexOf(current) < 0) unique.push(current)
		}
		return unique;
	};

	// sort indexes
	Array.prototype.sortAscending = function()
	{
		return this.sort(function(a, b){return a - b});
	};

	Array.prototype.sortDescending = function()
	{
		return this.sort(function(a, b){return b - a});
	};

	// [1, 2, 3, 4, 8, 10, 11, 12, 15, 16, 17, 18, 29]
	// becomes "1-4,8,10-12,15-18,29"
	Array.prototype.getRanges = function()
	{
		var ranges = ""; // [];
		var rstart;
		var rend;
		for (var i = 0; i < this.length; i++)
		{
			rstart = this[i];
			rend = rstart;
			while (this[i + 1] - this[i] == 1)
			{
				rend = this[i + 1]; // increment the index if the numbers sequential
				i++;
			}
			ranges += ((rstart == rend ? rstart+'' : rstart + '-' + rend) + ( i+1 == this.length ? "" : "," ));
		}
		return ranges;
	};

	// [1, 2, 3, 4, 8, 10, 11, 12, 15, 16, 17, 18, 29]
	// becomes "1-4,8,10-12,15-18,29"
	Array.prototype.toSimplifiedString = function()
	{
		// if($.level) $.writeln(this);
		var str = "";
		var ranges = [];

		var range = [];

		for(var i = 0; i < this.length; i++)
		{	
			var num = this[i];

			// mixed array content safeguard: if not number, try to cast, skip if fails
			if(isNaN(num)) num = parseInt(num);
			if(isNaN(num) || num == 0) continue;
			
			range.push(num);

			// if next number in array is not an increment, push array and reset count
			// if(this[i+1] != undefined)
			// {
				if( (num+1) != this[i+1] )
				{
					ranges.push(range);
					// if(this[i+1] == this[this.length-1]) ranges.push( [this[i+1]] );
					// avoid duplication of last item in ranges!
					if(this[i+1] == this[this.length-1] && this[i+1] != this[i]) ranges.push( [this[i+1]] );
					range = [];
				}
			// }
		}

		// reformat string
		for(var j = 0; j < ranges.length; j++)
		{
			var currentRange = ranges[j];
			var start = currentRange[0];
			var end = currentRange[currentRange.length-1];

			str += (start == end ? start : (start + "-" + end));

			if(j != (ranges.length-1))
			{
				str += ",";
			}
		}

		return str.length ? str : this.toString();
	};

	// "1-4,8,10-12,15-18,29"
	// becomes [1, 2, 3, 4, 8, 10, 11, 12, 15, 16, 17, 18, 29]
	String.prototype.toRangesArr = function()
	{
		var arr = [];
		var str = this.trim();
		str = str.replace(/\s/g, "");
		var tmpArr = str.split(",");
		
		for(var i = 0; i < tmpArr.length; i++)
		{	
			var r = tmpArr[i];
			if(r == "") continue;
			if(r.match("-") != null)
			{
				var range = r.split("-");
				var start = parseInt(range[0]);
				var end = parseInt(range[1]);

				if(!isNaN(start) && !isNaN(end))
				{
					var rLength = end - start + 1;
					for(var r = 0; r < rLength; r++)
					{
						arr.push(start+r);
					}
				}
			}
			else
			{
				var intgr = parseInt(r);
				var hasInt = !isNaN(intgr);
				if(hasInt) arr.push(intgr);
			}
		}
		return arr.length ? arr.getUnique().sortAscending() : [];
	};

	// "0, 1, 2-3,4,5,10-12, 8, 29,30,31, 11, 12,65, 66, 178"
	// becomes "1-5,8,10-12,29-31,65-66,178"
	// does not support negative numbers 
	String.prototype.toRangesStr = function()
	{
		return this.toRangesArr().toSimplifiedString();
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

