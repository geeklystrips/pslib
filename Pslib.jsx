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
Pslib.version = 0.68;
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


	// Pslib.optimizeScriptingListenerCode = function()
	// {
	// 	Pslib.playAction("ScriptListener", "SLCFix");
	// }

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

	// sub-optimal (we can actually get this info without the layer being active)
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
		// bounds[0] = d.getUnitDoubleValue(sTID("top")).as('px');
		// bounds[1] = d.getUnitDoubleValue(sTID("left")).as('px');
		// bounds[2] = d.getUnitDoubleValue(sTID("right")).as('px');
		// bounds[3] = d.getUnitDoubleValue(sTID("bottom")).as('px');
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
				ar.putIndex(cTID("Lyr "), i);// 1-based!
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
				var str = Pslib.readFromFile(generatorConfigFile, "UTF-8");

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

            obj.x = bounds[1];
            obj.y = bounds[0];
            obj.width = bounds[2] - bounds[1];
            obj.height = bounds[3] - bounds[0];
        }
        catch(e)
        {
            if($.level) $.writeln("Error getting specs for arboard " + layer.name + " \n\n" + e); 

            // force minimal specs / document W x H
            obj.x = 0;
            obj.y = 0;
            obj.width = doc.width.as("px");
            obj.height = doc.height.as("px");
        }
            
        obj.parent = doc.name;
        obj.parentFullName = parentFullName.toString();

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
Pslib.isPsCS3 = (Pslib.isPhotoshop && app.version.match(/^10\./) != null);

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
Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "customMips", null ] ];
Pslib.storedAssetPropertyNamesArr = [ "assetName", "assetArtboardID", "assetID", "customMips" ];
Pslib.assetKeyConversionArr = [ [ "assetID", "id" ], [ "assetName", "name" ], [ "index", "page" ] ];

// #############  PER-LAYER METADATA FUNCTIONS

// default namespace
Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
Pslib.XMPNAMESPACEPREFIX = "gs:";

Pslib.SECONDARYXMPNAMESPACE = "http://www.geeklystrips.com/second/";
Pslib.SECONDARYXMPNAMESPACEPREFIX = "gss:";

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
	 if(ExternalObject.AdobeXMPScript != undefined)
	{
		ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	}

	// register custom namespace
	// not sure whether this is global to the session, or document-based
	XMPMeta.registerNamespace(Pslib.XMPNAMESPACE, Pslib.XMPNAMESPACEPREFIX);
	XMPMeta.registerNamespace(Pslib.SECONDARYXMPNAMESPACE, Pslib.SECONDARYXMPNAMESPACEPREFIX);
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
Pslib.setOrderedArray = function (xmp, propName, arr, namespace, secondaryNamespace)
{
	if(!xmp) return;
	// if(!app.documents.length){ return; }

	var namespace = namespace ? namespace : Pslib.XMPNAMESPACE;
	var secondaryNamespace = secondaryNamespace ? secondaryNamespace : Pslib.SECONDARYXMPNAMESPACE;
	var prefix = XMPMeta.getNamespacePrefix(namespace);
	var secondaryPrefix = XMPMeta.getNamespacePrefix(secondaryNamespace);

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
		xmp.appendArrayItem(namespace, propName, null); // <rdf:value> -- opportunity to include extra info or fallback value here
		// xmp.appendArrayItem(namespace, propName, null, undefined); // cannot get rid of <rdf:value> ?

		if($.level) $.writeln( "    <rdf:li rdf:parseType=\"Resource\">\n    <rdf:value/>" );

		for(var j = 0; j < arr[i].length; j++)
		{
			var subArr = arr[i][j];
			var qualifier = subArr[0];
			var value = subArr[1];

			xmp.setQualifier(namespace, propName+'['+(i+1)+']', secondaryNamespace, qualifier, value);
			if($.level) $.writeln( "    <"+secondaryPrefix+qualifier+">"+value+"</"+secondaryPrefix+qualifier+">" );
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
	if(!obj.secondaryNamespace) obj.secondaryNamespace = Pslib.SECONDARYXMPNAMESPACE;

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
            // JSUI.quickLog("deleted " + itemCount+ " array items");
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
        obj.xmp = Pslib.setOrderedArray(obj.xmp, obj.arrNameStr, seqArrayItems, obj.namespace, obj.secondaryNamespace);
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
	if(!obj.secondaryNamespace) obj.secondaryNamespace = Pslib.SECONDARYXMPNAMESPACE;
    if(!obj.getObjBool) obj.getObjBool = false;

	// if(!obj.allowNullValue) obj.allowNullValue = false;

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
			var value = obj.xmp.getQualifier(obj.namespace, obj.arrNameStr+"["+i+"]", obj.secondaryNamespace, qualifier).toString();
            value = decodeURI(value);
			// this makes sure an empty string is not returned as zero after auto-typing
			value = Pslib.autoTypeDataValue(value, false, false); // empty string allowed, null not allowed 

            if($.level) $.writeln("  "+qualifier+": " + value); // + "  " + (typeof value)); 

            if( value != undefined)
            {
				if( (value != "undefined") && (value != "null"))
				{
					itemObj[qualifier] = value;
					itemArr.push([ qualifier, value]);
					// looks like customMips gets converted to 0 here?
				}
            }
        }
        resultsArr.push(obj.getObjBool ? itemObj : itemArr);
    }
	// JSUI.stopTimer();

	return resultsArr;
}

// "Fonts" bag
Pslib.getDocFonts = function( xmp )
{
	if(Pslib.isIllustrator)
	{
		if(!xmp) xmp = Pslib.getXmp(app.activeDocument);

		var property = "Fonts";
		var property_NS = "http://ns.adobe.com/xap/1.0/t/pg/"; // "xmpTpg:"
		var qualifier_NS = "http://ns.adobe.com/xap/1.0/sType/Font#"; // "stFnt:"
		var qualifiers = [ "fontName", "fontFamily", "fontFace", "fontType", "versionString", "composite", "fontFileName" ];

		var arr = Pslib.getLeafNodesObj(xmp, property_NS, property, qualifier_NS, qualifiers);

		return arr;
	}
}

// get linked/placed items
Pslib.getDocPlacedItems = function( xmp )
{
	if(!xmp) xmp = Pslib.getXmp(app.activeDocument);

	// "Ingredients" bag: placed items
	if(Pslib.isPhotoshop)
	{
		var property = "Ingredients"; 
		var property_NS = "http://ns.adobe.com/xap/1.0/mm/"; // "xmpMM:"
		var qualifier_NS = "http://ns.adobe.com/xap/1.0/sType/ResourceRef#"; // "stRef:"
		var qualifiers = [ "linkForm", "filePath", "DocumentID" ];

		var arr = Pslib.getLeafNodesObj(xmp, property_NS, property, qualifier_NS, qualifiers);

		return arr;
	}
	// incomplete for now!
	// // <xmpMM:Manifest>
	// // <rdf:Seq>
	// // 		<rdf:li rdf:parseType="Resource">
	// // 		<stMfs:linkForm>EmbedByReference</stMfs:linkForm>
	// //		 	<stMfs:reference rdf:parseType="Resource">
	// //		 	   <stRef:filePath>/full/path/to/image.png</stRef:filePath>
	// //		 	   <stRef:documentID>0</stRef:documentID>
	// //		 	   <stRef:instanceID>0</stRef:instanceID>
	// //		 	</stMfs:reference>
	// //  	</rdf:li>
	// else if(Pslib.isIllustrator)
	// {
	// 	// xmpMM:Manifest
	// 		// stMfs:linkForm>
	// 			// stMfs:reference

	// 	var property = "Manifest"; 

	// 	var property_NS = "http://ns.adobe.com/xap/1.0/mm/"; // "xmpMM:"
	// 	var qualifier_NS = "http://ns.adobe.com/xap/1.0/sType/ManifestItem#"; // "stMfs:"

	// 	var qualifiers = [ "filePath", "documentID", "instanceID" ]; // if documentID and instanceID are both 0, file is fully embedded (?)

	//  this will need to be adapted for custom structs
	// 	var arr = Pslib.getLeafNodesObj(xmp, property_NS, property, qualifier_NS, qualifiers);

	// 	return arr;
	// }
}

// "TextLayers" bag (Photoshop only)
Pslib.getDocTextLayers = function( xmp )
{
	if(Pslib.isPhotoshop)
	{
		if(!xmp) xmp = Pslib.getXmp(app.activeDocument);

		var property = "TextLayers"; 
		var property_NS = "http://ns.adobe.com/photoshop/1.0/"; // "photoshop:"
		var qualifier_NS = property_NS; // "photoshop:"
		var qualifiers = [ "LayerName", "LayerText" ];
	
		var arr = Pslib.getLeafNodesObj(xmp, property_NS, property, qualifier_NS, qualifiers);
	
		return arr;
	}
}



// convert list of bidimensional qualifiers-value arrays to individual objects from XMP
// getting fonts listed in illustrator document XMP
	// var xmp = Pslib.getXmp(app.activeDocument);
	// var property = "Fonts";
	// var xmpTpg_NS = "http://ns.adobe.com/xap/1.0/t/pg/";
	// var stFnt_NS = "http://ns.adobe.com/xap/1.0/sType/Font#";
	// var qualifiers = [ "fontName", "fontFamily", "fontFace", "fontType", "versionString", "composite", "fontFileName" ]; // quickest when structure is fully known

	// var fontsObj = Pslib.getLeafNodesObj(xmp, xmpTpg_NS, property, stFnt_NS, qualifiers);

Pslib.getLeafNodesObj = function(xmp, ns, property, leafNs, qualifiersArr)
{
	if(!xmp) return;
	if(!ns) return;
	if(!property) return;
	if(!leafNs) return;
	if(!qualifiersArr) return;

    var arr = Pslib.getLeafNodesArr(xmp, ns, property, leafNs, qualifiersArr);
    var objArr = [];

    for(var i = 0; i < arr.length; i++ )
    {
		var obj = {};
        var item = arr[i];

        if(item instanceof Array)
        {
			// a string first AND an array next usually means Struct
			if(typeof item[0] == "string" && item[1] instanceof Array)
			{

				var objFromArr = item[1].convertToObject( true, false );
				obj[item[0]] = objFromArr;
			}
			else
			{
				// convert to set of key-value pairs
				obj = item.convertToObject( true, false );
				// obj[item[0]] = objFromArr;
			}

        } 
		objArr.push(obj);
    }

    return objArr;
}

Pslib.getLeafNodesArr = function(xmp, ns, property, leafNs, qualifiersArr) //, subQualifiersArr)
{
	if(!xmp) return;
	if(!ns) return;
	if(!property) return;
	if(!leafNs) return;
	if(!qualifiersArr) return;

    var biDimArr = [];
    var propertyExists = xmp.doesPropertyExist(ns, property);

    if(propertyExists)
    {
        var leafNsPrefix = XMPMeta.getNamespacePrefix(leafNs);
        if(!leafNsPrefix)
        {
            return;
        }

		// var itemArr = [];
        var itemsCount = xmp.countArrayItems(ns, property);
        for(var i = 1; i <= itemsCount; i++)
        {
			var itemArr = [];

            for(var q = 0; q < qualifiersArr.length; q++)
            {
                var qualifier = qualifiersArr[q];
				var qualifierPath;
				var leafNodeStr;

				if(qualifier instanceof Array)
				{
					// var itemArr = [];
					if(typeof qualifier[0] == "string" && qualifier[1] instanceof Array)
					{
						var arrQualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier[0]);
						var qualifiersItemsCount = xmp.countArrayItems(ns, arrQualifierPath);

						for(var s = 1; s <= qualifiersItemsCount; s++)
						{
							if($.level) $.writeln("");
							var qualifiersItemsArr = qualifier[1];
            				var subItemArr = [];

							for(var sq = 0; sq < qualifiersItemsArr.length; sq++)
							{
								var subQualifier = qualifiersItemsArr[sq];
								var subArrQualifierPath = arrQualifierPath+"["+s+"]/"+leafNsPrefix+subQualifier;

								var subPropertyExists = xmp.doesPropertyExist(ns, subArrQualifierPath);
								if(subPropertyExists)
								{
									var subLeafNodeStr = xmp.getProperty(ns, subArrQualifierPath).toString();
									if(subLeafNodeStr != undefined)
									{
										subItemArr.push([subQualifier, subLeafNodeStr]);
									}
								}
								else 
								{
									// if($.level) $.writeln("Property not found:\tsubArrQualifierPath: " + subArrQualifierPath);
								}
							}
							itemArr.push(subItemArr);
						}
					}
				}
				else
				{
					// default for getting items Bag 
					qualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier);

					var subPropertyExists = xmp.doesPropertyExist(ns, qualifierPath);
					if(subPropertyExists)
					{
						leafNodeStr = xmp.getProperty(ns, qualifierPath).toString();

						if(leafNodeStr != undefined)
						{
							itemArr.push([qualifier, leafNodeStr]);
						}
					}
				}
				// biDimArr.push(itemArr);
            }
			biDimArr.push(itemArr);
        }    
    }
	return biDimArr;
}

// target one specific artboard in ordered array
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
    if(!obj.secondaryNamespace) obj.secondaryNamespace = Pslib.SECONDARYXMPNAMESPACE;
    // if(!obj.getObjBool) obj.getObjBool = false; // always getting objects

    var docXmpArtboardsSpecs = Pslib.getOrderedArrayItems( { xmp: obj.xmp, arrNameStr: obj.arrNameStr, arr: obj.arr, namespace: obj.namespace, secondaryNamespace: obj.secondaryNamespace, getObjBool: true});
	
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
	if(propValue == null) return;
	if(propValue == "null") return;
	if(!allowEmptyStringBool && propValue == "") return;

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
Pslib.getXMPfromFile = function( filepath, type )
{
	if(!type) type = XMPConst.UNKNOWN;
    try {
        if(filepath){ filepath = new File(filepath); }
        var f = filepath ? filepath : File.openDialog("Choose file to get XMP data from");
        if(!f) { if($.level) $.writeln("Invalid file"); return; }

        if($.level) $.writeln("Getting XMP data from " + f.fsName);

        if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript')

		// get file type
		var fileTypeCONST = type != undefined ? type : Pslib.getXMPConstFileType(f.fsName);
		// if($.level) $.writeln("fileTypeCONST: "+fileTypeCONST);

        // var xmpFile = new XMPFile(f.fsName, fileTypeCONST, XMPConst.OPEN_FOR_READ);
        var xmpFile = new XMPFile(f.fsName, fileTypeCONST, XMPConst.OPEN_ONLY_XMP);
        xmp = xmpFile.getXMP();
        // if($.level) $.writeln( xmp.serialize());
		xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);
        return xmp;
    } catch (e) { if($.level) $.writeln( "Error: \n\n" + e); return false; }
	return true;
}


// write xmp to media file / update media file xmp
// Confirmed: .putXMP() does not replace the existing object (updates + adds content)
Pslib.writeXMPtoMediaFile = function( filepath, xmp, type )
{
    try {
		if(!xmp) return false;
		if(filepath){ filepath = new File(filepath); }
        var f = filepath ? filepath : File.openDialog("Choose file to put XMP string to");
        if(!f) { if($.level) $.writeln("Invalid file"); return; }

        if($.level) $.writeln("Embedding XMP data to " + f.fsName);

		if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript')

		// get file type
		var fileTypeCONST = type != undefined ? type : Pslib.getXMPConstFileType(f.fsName);
		// if($.level) $.writeln("fileTypeCONST: "+fileTypeCONST);

		var xmpFile = new XMPFile(f.fsName, fileTypeCONST, XMPConst.OPEN_FOR_UPDATE);
		xmpFile.putXMP(xmp);
		xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);
	} catch (e) { if($.level) $.writeln( "Error: \n\n" + e); return false; }
	return true;
}

Pslib.writeToFile = function(file, str, encoding)
{
	if(!file) return false;
	file = (file instanceof String) ? File(file) : file;
	if(!encoding) encoding = "utf8";

	if(!file.parent.exists) { file.parent.create(); }
	if(file.exists) { file.remove(); }

	file.open("w");
	file.encoding = encoding;
	file.write(str); 
	file.close();

	return file.exists;
}

Pslib.readFromFile = function(file, encoding)
{
	if(!file) return false;
	if(!encoding) encoding = "utf8";
	file.open("r");
	file.encoding = encoding;
	var str = file.read();
	file.close();
	
	return str;
}


// write xmp to media sidecar file (.xmp)
Pslib.writeXMPtoSidecarFile = function( filepath, xmp )
{
	return Pslib.writeToFile(filepath, xmp.serialize());
}


// XMPFileObj.closeFile(closeFlags)

Pslib.getXMPConstFileType = function(file)
{
	var type = XMPConst.UNKNOWN; 
	if(!file) return type;
	var extension = file.getFileExtension();

	switch(extension)
	{
		case ".psd" : { type = XMPConst.FILE_PHOTOSHOP; break; }
		case ".ai" : { type = XMPConst.FILE_ILLUSTRATOR; break; }
		case ".pdf" : { type = XMPConst.FILE_PDF; break; }
		case ".png" : { type = XMPConst.FILE_PNG; break; }
		case ".jpg" : { type = XMPConst.FILE_JPEG; break; }
		case ".jpeg" : { type = XMPConst.FILE_JPEG; break; }
		case ".tif" : { type = XMPConst.FILE_TIFF; break; }
		case ".tiff" : { type = XMPConst.FILE_TIFF; break; }
		case ".indd" : { type = XMPConst.FILE_INDESIGN; break; }
		case ".xml" : { type = XMPConst.FILE_XML; break; }
		case ".svg" : { type = XMPConst.FILE_XML; break; }
		case ".ps" : { type = XMPConst.FILE_POSTSCRIPT; break; }
		case ".eps" : { type = XMPConst.FILE_EPS; break; }
		case ".txt" : { type = XMPConst.FILE_TEXT; break; }
		default: break;
	}
	return type;
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
	if(!app.documents.length) return;
	if(Pslib.isPhotoshop)
	{
		var doc = app.activeDocument;
		
		if(!layerObject) layerObject = doc.activeLayer;
		if(layerObject != doc.activeLayer) doc.activeLayer = layerObject;

		var isArtboard = false;

		// an artboard is a group/layerset internally
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
		if(makeVisibleBool == undefined) makeVisibleBool = false; 
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

Pslib.getSpecsForSelectedArtboards = function(onlyIDs)
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
				var artboardID = layerDesc.getInteger(cTID('LyrI'));
				// if only fetching IDs, just push int to array and skip the rest
				if(onlyIDs)
				{
					artboards.push(artboardID);
					continue;
				}
				var artboardName = layerDesc.getString(sTID ("name"));
				var artboard = executeActionGet(r).getObjectValue(p),
					artboardRect = artboard.getObjectValue(sTID("artboardRect")),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom'))
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
		var placeholder;
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
				var tags = Pslib.getTags(placeholder, [ ["assetID", null], ["customMips", null] ]);
				if(tags.length)
				{
					specsObj = Pslib.arrayToObj( tags, specsObj );
				}
			}
			artboardsCoords.push(specsObj);
		}

		if(initialSelection) doc.selection = initialSelection;

		// JSUI.quickLog(artboardsCoords);
		return artboardsCoords;
	}
}

// returns array of artboard object specs
// { 
	// name: string, 	// artboard name
	// index: int, 		// Photoshop: index in artboards array; Illustrator: artboard index
	// id: int,			// Photoshop: artboard persistent layer ID; Illustrator: artboard index
	// x: int, 
	// y: int, 
	// width: int, 
	// height: int
// }

Pslib.getSpecsForAllArtboards = function(onlyIDs)
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

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
				var artboardID = layerDesc.getInteger(cTID('LyrI'));
				// if only fetching IDs, just push int to array and skip the rest
				if(onlyIDs)
				{
					artboards.push(artboardID);
					continue;
				}
				var artboardName = layerDesc.getString(sTID ("name"));
				var artboard = executeActionGet(r).getObjectValue(p),
					artboardRect = artboard.getObjectValue(sTID("artboardRect")),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom'))
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

Pslib.getAllArtboards = function()
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;
	var artboards = [];

	if(Pslib.isPhotoshop)
	{
		// get artboard IDs only
		// var specs = Pslib.getSpecsForAllArtboards();
		var specs = Pslib.getSpecsForAllArtboards(true); // faster
		
		for(var i = 0; i < specs.length; i++)
		{
			// artboards.push(Pslib.getArtboardReferenceByID(specs[i].id));
			if($.level) $.writeln(i+" ID: " + specs[i] );
			var artboardRef = Pslib.getArtboardReferenceByID(specs[i]);
			artboards.push(artboardRef);
		}
	}
	else if(Pslib.isIllustrator)
	{
		// Document.artboards is not a typical Array 
		for(var i = 0; i < doc.artboards.length; i++)
		{
			artboards = doc.artboards[i];
		}
	}
	return artboards;
}

// wrappers for quick photoshop artboard IDs
Pslib.getSelectedArtboardIDs = function()
{
	return Pslib.getSpecsForSelectedArtboards(true);
}

Pslib.getAllArtboardIDs = function()
{
	return Pslib.getSpecsForAllArtboards(true);
}

// get more complete data set for artboards collection 

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
						// let's not go further here if Object.prototype function
						if(keyValuePairs[key] instanceof Function)
						{
							continue;
						}
						if (key.charAt(0) == '_' || key == "reflect" || key == "Components" || key == "typename")
						{
							continue;			
						}
						if(keyValuePairs[key] != undefined)
						{
							var value = keyValuePairs[key];
							if(value != undefined)
							{
								// if(typeof value != "function")
								// {
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
								// }
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
	if(!app.documents.length) return;
	var doc = app.activeDocument;
	var artboard;

	if(Pslib.isIllustrator)
	{
		var i = doc.artboards.getActiveArtboardIndex();
		artboard = doc.artboards[i];
	}
	else if(Pslib.isPhotoshop)
	{
		if(!Pslib.isArtboard())
		{
			if (!Pslib.selectParentArtboard()) return;
			if(Pslib.isArtboard()) artboard = doc.activeLayer;
		}
		else
		{
			artboard = doc.activeLayer;
		}
	}
	return artboard;
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
			artboardNames.push(artboards[i].name.trim());
		}
		return artboardNames;
	}
}

// get Photoshop layer reference without selecting (can be an artlayer / group / artboard)
Pslib.getLayerReferenceByID = function( id )
{
    if(Pslib.isPhotoshop)
	{
        var r = new ActionReference();    
        r.putIdentifier(sTID("layer"), id);
        return executeActionGet(r);
    }
}

// get Photoshop artboard reference without selecting (must be an artboard)
Pslib.getArtboardReferenceByID = function( id )
{
    if(Pslib.isPhotoshop)
	{
        var r = new ActionReference();    
        r.putIdentifier(sTID("layer"), id);
        var isArtboard = false;
        try { isArtboard = executeActionGet(r).getBoolean(sTID("artboardEnabled")); }catch(e){ }
        if(isArtboard) return executeActionGet(r);
    }
}

// get simple coordinates from layer object (assuming raster)
Pslib.getLayerObjectCoordinates = function(layer)
{
	var coords = {};

	if(Pslib.isPhotoshop)
	{
		if(!layer)
		{
			return coords;
		}

		coords.name = layer.name.trim();

		var b = layer.bounds;
		if(!b) return coords;
	
		coords.x = b[0].as('px');
		coords.y = b[1].as('px');
		coords.width = b[2].as('px') - b[0].as('px');
		coords.height = b[3].as('px') - b[1].as('px');
	
		coords.isSquare = coords.width == coords.height;
		coords.isPortrait = coords.width < coords.height;
		coords.isLandscape = coords.width > coords.height;
	}

	return coords;
}


// quickly accessible basic info for all of a document's artboards
Pslib.getArtboardCollectionCoordinates = function()
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;
	var artboardObjArr = [];

	if(Pslib.isPhotoshop)
	{
		artboardObjArr = Pslib.getSpecsForAllArtboards();
	}
	else if(Pslib.isIllustrator)
	{
		var artboards = doc.artboards;
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
	
		for(var i = 0; i < artboards.length; i++)
		{
			var coords = Pslib.getArtboardCoordinates( artboards[i] );
			var obj = { name: coords.name, id: i, width: coords.width, height: coords.height, x: coords.x, y: coords.y };
			artboardObjArr.push(obj);
		}
	
	}

	return artboardObjArr;
}

// basic get full artboard collection coordinates
Pslib.artboardCollectionCoordsToJsonFile = function( file, obj )
{
	if(!app.documents.length) return;
	if(!obj) obj = {}
    var doc = app.activeDocument;
	var docNameNoExt = doc.name.getFileNameWithoutExtension();
    var assetsUri = docNameNoExt.getAssetsFolderLocation( undefined, undefined, true); // create directory if not present

	var artboardCoords = Pslib.getArtboardCollectionCoordinates();
	obj.assets = artboardCoords;

	var jsonFile = file ? file : new File(assetsUri + "/" + docNameNoExt + ".json");
	var jsonStr = JSON.stringify(obj, null, "\t");
	Pslib.writeToFile(jsonFile, jsonStr);

	return obj;
}

// get document bounds for artboard geometry offset calculations
// along with some other configuration specs if needed
Pslib.getDocumentSpecs = function( advanced )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	var specs = { };
	if(Pslib.isPhotoshop)
	{
		specs.width = doc.width.as('px');
        specs.height = doc.height.as('px');

		// Document.mode in this context should be DocumentMode.RGB
		// but could be DocumentMode.GRAYSCALE or DocumentMode.INDEXEDCOLOR 
		// because of third party tools weirdness
		specs.mode = doc.mode.toString();

		// equivalent to illustrator's get metrics from .cropBox?
		specs.bitsPerChannel = 8;

		if(advanced)
		{
			switch(doc.bitsPerChannel)
			{
				case BitsPerChannelType.EIGHT : { specs.bitsPerChannel = 8; break;}
				case BitsPerChannelType.ONE : { specs.bitsPerChannel = 1; break;}
				case BitsPerChannelType.SIXTEEN : { specs.bitsPerChannel = 16; break;}
				case BitsPerChannelType.THIRTYTWO : { specs.bitsPerChannel = 32; break;}
				default : { specs.bitsPerChannel = 8; break;}
			}
			
			//
			// XMP content
			//

			// get fonts info

			// bitmap items
			
			// smart links
		}

	}
	else if(Pslib.isIllustrator)
	{
		var b = doc.visibleBounds;
		// specs.topLeft = [ b[0], b[1] ];
		// specs.bottomRight = [ b[2], b[3] ];


		specs.width = Math.abs(Math.ceil(b[2]) - Math.floor(b[0]));
		specs.height = Math.abs(Math.floor(b[3]) - Math.ceil(b[1]));

		specs.topLeft = [ Math.floor(b[0]), Math.ceil(b[1]) ];
		specs.bottomRight = [ Math.ceil(b[2]), Math.floor(b[0]) ];

		// get metrics from .cropBox as extra set of references
		var cb = doc.cropBox;
		specs.cropBoxTopLeft = [ Math.floor(cb[0]), Math.ceil(cb[1]) ];
		specs.cropBoxBottomRight = [ Math.ceil(cb[2]), Math.floor(cb[0]) ];

		specs.cropBoxWidth = Math.abs(Math.ceil(cb[2]) - Math.floor(cb[0]));
		specs.cropBoxHeight = Math.abs(Math.floor(cb[3]) - Math.ceil(cb[1]));

				// Document.pageOrigin
		specs.pageOrigin = doc.pageOrigin;
		specs.pageOriginX = doc.pageOrigin[0];
		specs.pageOriginY = doc.pageOrigin[1];

		if(advanced)
		{
			
			specs.mode = doc.documentColorSpace.toString(); // DocumentColorSpace.RGB // DocumentColorSpace.CMYK
		
			// color profile

			// get count for
			// fonts 
			// specs.fontsCount = doc.fonts.length;
			// symbols 
			specs.symbolsCount = doc.symbols.length;
			// graphic styles
			// swatches 
			specs.swatchesCount = doc.swatches.length;
		}
	}
	return specs;
}

// basic get artboard bounds
Pslib.getArtboardBounds = function( id )
{
    if(Pslib.isPhotoshop)
	{
        var r = Pslib.getArtboardReferenceByID(id);

        if(r)
        {
            // var name = r.getString(sTID ("name"));
            // JSUI.quickLog(name);

            var d = r.getObjectValue(sTID("artboard")).getObjectValue(sTID("artboardRect"));
            var bounds = new Array();
            // bounds[0] = d.getUnitDoubleValue(sTID("top"));
            // bounds[1] = d.getUnitDoubleValue(sTID("left"));
            // bounds[2] = d.getUnitDoubleValue(sTID("right"));
            // bounds[3] = d.getUnitDoubleValue(sTID("bottom"));
            bounds[0] = d.getUnitDoubleValue(sTID("top")).as('px');
            bounds[1] = d.getUnitDoubleValue(sTID("left")).as('px');
            bounds[2] = d.getUnitDoubleValue(sTID("right")).as('px');
            bounds[3] = d.getUnitDoubleValue(sTID("bottom")).as('px');

            return bounds;
        }
    }
    else if(Pslib.isIllustrator)
    {
        // assume "id" is an artboard object
        if(!id) { var id = Pslib.getActiveArtboard(); }
        var artboard = id;
        var rect = artboard.artboardRect;
        return rect;
    }
}

// quick artboard info fetch (important: artboard does not need to be active)
// illustrator uses artboard object
// photoshop expects integer for artboard ID
Pslib.getArtboardCoordinates = function( artboard )
{
	if(Pslib.isIllustrator)
	{
		if(!artboard)
		{ 
			var artboard = Pslib.getActiveArtboard();
		}

		if(app.coordinateSystem != CoordinateSystem.ARTBOARDCOORDINATESYSTEM) app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

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
		// for the next few steps, we need to work with layer IDs
		var id;
		var r;
		var coords = {};

		if(!artboard)
		{ 
			var layer = app.activeDocument.activeLayer;
			if(!Pslib.isArtboard(layer))
			{
				return {};
			}
			id = layer.id;
		}
		else if(typeof artboard == "number")
		{
			id = artboard;
		}
		else
		{
			return {};
		}

        r = Pslib.getArtboardReferenceByID(id);

        if(r)
        {
            var d = r.getObjectValue(sTID("artboard")).getObjectValue(sTID("artboardRect"));
            var bounds = new Array();
            bounds[0] = d.getUnitDoubleValue(sTID("top"));
            bounds[1] = d.getUnitDoubleValue(sTID("left"));
            bounds[2] = d.getUnitDoubleValue(sTID("right"));
            bounds[3] = d.getUnitDoubleValue(sTID("bottom"));

            coords.name = r.getString(sTID("name")).trim();
            coords.id = id;
            coords.x = bounds[1];
            coords.y = bounds[0];
		    coords.width = bounds[2] - bounds[1];
		    coords.height = bounds[3] - bounds[0];
            // coords.x = bounds[1].as('px');
            // coords.y = bounds[0].as('px');
		    // coords.width = bounds[2].as('px') - bounds[1].as('px');
		    // coords.height = bounds[3].as('px') - bounds[0].as('px');

            coords.rect = bounds;
		    coords.centerX = coords.x + coords.width/2;
		    coords.centerY = coords.y - coords.height/2;

            // advanced logic for which we don't have to make the artboard active
            coords.isSquare = coords.width == coords.height;
            coords.isPortrait = coords.width < coords.height;
            coords.isLandscape = coords.width > coords.height;
            coords.hasIntegerCoords = coords.x == Math.round(coords.x) && coords.y == Math.round(coords.y) && coords.width == Math.round(coords.width) && coords.height == Math.round(coords.height);

			// // advanced stuff, photoshop only
			// var dt = r.getObjectValue(sTID("artboard"));
			// coords.presetName = dt.getString(sTID('artboardPresetName'));
			// coords.backgroundType = dt.getString(sTID('artboardBackgroundType'));

			// var color = new SolidColor();
			// if(coords.backgroundType != 3)
			// {
			// 	color = dt.getObjectValue(sTID('color'));
	
			// 	var red = color.getUnitDoubleValue(sTID("red"));
			// 	var green = color.getUnitDoubleValue(sTID("grain")); // don't look!
			// 	var blue = color.getUnitDoubleValue(sTID("blue"));
	
			// 	color = new SolidColor();
			// 	color.rgb.red = red;
			// 	color.rgb.green = green;
			// 	color.rgb.blue = blue;

			// 	coords.backgroundColor = color.rgb.hexValue;
			// }

            return coords;
		}
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

		specs.isPow2 = specs.width.isPowerOf2() && specs.height.isPowerOf2();
		specs.isMult4 = specs.width.isMult4() && specs.width.isMult4();
		specs.isMult8 = specs.width.isMult8() && specs.width.isMult8();
		specs.isMult16 = specs.width.isMult16() && specs.width.isMult16();
		specs.isMult32 = specs.width.isMult32() && specs.width.isMult32();

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
	else if(Pslib.isPhotoshop)
	{
		var coords = {};

		if(typeof artboard == "number")
		{
			var id = artboard;
			coords = Pslib.getArtboardCoordinates(id);

			var r = Pslib.getArtboardReferenceByID(id);

			var dt = r.getObjectValue(sTID("artboard"));
			coords.presetName = dt.getString(sTID('artboardPresetName'));
			coords.backgroundType = dt.getString(sTID('artboardBackgroundType'));

			var color = new SolidColor();
			if(coords.backgroundType != 3)
			{
				color = dt.getObjectValue(sTID('color'));

				var red = color.getUnitDoubleValue(sTID("red"));
				var green = color.getUnitDoubleValue(sTID("grain")); // don't look!
				var blue = color.getUnitDoubleValue(sTID("blue"));

				color = new SolidColor();
				color.rgb.red = red;
				color.rgb.green = green;
				color.rgb.blue = blue;
				
				coords.backgroundColor = color.rgb.hexValue;
			}

			var specs = coords;

			specs.isPow2 = specs.width.isPowerOf2() && specs.height.isPowerOf2();
			specs.isMult4 = specs.width.isMult4() && specs.width.isMult4();
			specs.isMult8 = specs.width.isMult8() && specs.width.isMult8();
			specs.isMult16 = specs.width.isMult16() && specs.width.isMult16();
			specs.isMult32 = specs.width.isMult32() && specs.width.isMult32();

			return specs;
		}
	}
}


Pslib.updateArtboardBackgroundTransparent = function()
{
	if(!app.documents.length) return false;
	var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
    {
        // if(!obj.id) obj.id = doc.activeLayer.id;

		var coords = Pslib.getArtboardCoordinates(doc.activeLayer.id);
		var obj = { id: doc.activeLayer.id, width: coords.width, height: coords.height, hex: "transparent"};
		Pslib.resizeArtboard( obj );
	}
	else if(Pslib.isIllustrator)
	{
		// get / create artboard rectangle, set color
		// var item = Pslib.getArtboardItem(artboard, "#");
		var item = Pslib.getArtboardItem();
		if(!item)
		{
			// var rectObj = { artboard: artboard, name: "#", tags: [ ["name", artboard.name], ["index", indexNum], ["page", pageNum], ["assetID", ""] ], hex: undefined, opacity: undefined, layer: doc.layers.getByName("Placeholders"), sendToBack: true };
			item = Pslib.addArtboardRectangle();
		}
		else if(item)
		{
			// var colorObj = new NoColor()// typeof hexStr == "string" ? Pslib.hexToRGBobj(hexStr) : hexStr;
			// item.fillColor = colorObj;

			var transp = new NoColor();
			item.strokeColor = transp;
			item.fillColor = transp;
			item.opacity = 100;
		}
	}
	return true;
}

// color rectangle placeholder 
Pslib.updateArtboardBackgroundColor = function( hexStr, create )
{
	if(hexStr == undefined) return false;
    if(!app.documents.length) return false;
	var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
    {
        // if(!obj.id) obj.id = doc.activeLayer.id;
		// var artboard = Pslib.getActiveArtboard();
        var coords = Pslib.getArtboardCoordinates(doc.activeLayer.id);

		var obj = { id: doc.activeLayer.id, width: coords.width, height: coords.height, hex: hexStr};
		Pslib.resizeArtboard( obj );
	}
	else if(Pslib.isIllustrator)
	{
		// get / create artboard rectangle, set color
		// var item = Pslib.getArtboardItem(artboard, "#");
		var item = Pslib.getArtboardItem();
		if(!item && create)
		{
			// var rectObj = { artboard: artboard, name: "#", tags: [ ["name", artboard.name], ["index", indexNum], ["page", pageNum], ["assetID", ""] ], hex: undefined, opacity: undefined, layer: doc.layers.getByName("Placeholders"), sendToBack: true };
			item = Pslib.addArtboardRectangle( { hex: hexStr });
		}
		else if(item)
		{
			var colorObj = typeof hexStr == "string" ? Pslib.hexToRGBobj(hexStr) : hexStr;
			item.fillColor = colorObj;
			item.opacity = 100;
		}
	}
	return true;
}

// illustrator set artboard origin (?)
// app.activeDocument.artboards[0].rulerOrigin = [0,0];

// minimum info needed: { width: 100, height 100 }
// var obj = { id: 14, x: 100, y: 200, width: 256, height: 128, anchor: 5 }; // photoshop
// var obj = { index: 14, x: 100, y: 200, width: 256, height: 128, anchor: 5, scaleArtwork: true }; // illustrator
// TODO: easy update artboard background color (or force to transparent)
Pslib.resizeArtboard = function( obj )
{
    if(!obj) return false;
    if(!app.documents.length) return false;
    if(!(obj.width || obj.height)) return false;

	var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
    {
        if(!obj.id) obj.id = doc.activeLayer.id;
    
        var specs = Pslib.getArtboardSpecs(obj.id);
    
        if(obj.x == undefined) obj.x = specs.x;
        if(obj.y == undefined) obj.y = specs.y;
        if(!obj.width) obj.width = specs.width;
        if(!obj.height) obj.height = specs.height;
        if(obj.anchor == undefined) obj.anchor = 7; // top left

        // deltas 
        var wDelta = obj.width - specs.width;
        var hDelta = obj.height - specs.height;

        // delta offsets: extra pixel goes at the bottom and on the right if odd delta is divided in two
        var wDelta1stHalf = (wDelta % 2 == 0) ? wDelta/2 : Math.floor(wDelta/2);
        // var wDelta2ndHalf = (wDelta % 2 == 0) ? wDelta/2 : Math.ceil(wDelta/2);

        var hDelta1stHalf = (wDelta % 2 == 0) ? hDelta/2 : Math.floor(hDelta/2);
        // var hDelta2ndHalf = (wDelta % 2 == 0) ? hDelta/2 : Math.ceil(hDelta/2);

        // anchor
        //	7	8	9
        //	4	5	6
        //	1	2	3

        switch(obj.anchor)
		{
            case 7 : { break; }
			case 8 : { obj.x -= wDelta1stHalf; break; }
			case 9 : { obj.x -= wDelta; break; }

			case 4 : { obj.y -= hDelta1stHalf; break; }
			case 5 : { obj.x -= wDelta1stHalf; obj.y -= hDelta1stHalf; break; }
			case 6 : { obj.x -= wDelta; obj.y -= hDelta1stHalf; break; }

			case 1 : { obj.y -= hDelta; break; }
			case 2 : { obj.x -= wDelta1stHalf; obj.y -= hDelta; break; }
			case 3 : { obj.x -= wDelta; obj.y -= hDelta; break; }

			default : { break; }
		}

        var descriptor = new ActionDescriptor();
        var descriptor2 = new ActionDescriptor();
        var descriptor3 = new ActionDescriptor();
        var descriptor4 = new ActionDescriptor();
        var list = new ActionList();
        var reference = new ActionReference();
        reference.putEnumerated( sTID( "layer" ), sTID( "ordinal" ), sTID( "targetEnum" ));
        descriptor.putReference( sTID( "null" ), reference );

        descriptor3.putDouble( sTID( "top" ), obj.y );
        descriptor3.putDouble( sTID( "left" ), obj.x );
        descriptor3.putDouble( sTID( "right" ), obj.x + obj.width );
        descriptor3.putDouble( sTID( "bottom" ), obj.y + obj.height );
    
        descriptor2.putObject( sTID( "artboardRect" ), sTID( "classFloatRect" ), descriptor3 );
        descriptor2.putList( sTID( "guideIDs" ), list );
    
        descriptor2.putString( sTID( "artboardPresetName" ), specs.presetName );
    
		if(obj.hex)
		{
			if(obj.hex == "transparent")
			{
				specs.backgroundType = 3;
			}
			else
			{
				specs.backgroundType = 4;
				specs.backgroundColor = obj.hex;
			}
		}
        // only handle color object if backgroundType is 4!
        if(specs.backgroundType == 4)
        {
            var red, green, blue = 0;
         
            // get color details from existing color object
            var rgbColorObj = Pslib.hexToRGBobj(specs.backgroundColor);
            red = rgbColorObj.rgb.red;
            green = rgbColorObj.rgb.green;
            blue = rgbColorObj.rgb.blue;
    
            descriptor4.putDouble( sTID( "red" ), red );
            descriptor4.putDouble( sTID( "grain" ), green ); // don't ask!
            descriptor4.putDouble( sTID( "blue" ), blue );
            descriptor2.putObject( sTID( "color" ), sTID( "RGBColor" ), descriptor4 );
        }
    
        descriptor2.putInteger( sTID( "artboardBackgroundType" ), specs.backgroundType ); // 3 == transparent, 4 == custom RGB
        descriptor.putObject( sTID( "artboard" ), sTID( "artboard" ), descriptor2 );
        executeAction( sTID( "editArtboardEvent" ), descriptor, DialogModes.NO );
        return true;
    }
    else if(Pslib.isIllustrator)
    {   
		if(obj.index == undefined) obj.index = doc.artboards.getActiveArtboardIndex();
		var artboard = doc.artboards[obj.index];
        var specs = Pslib.getArtboardSpecs(artboard);
    
        if(obj.x == undefined) obj.x = specs.x;
        if(obj.y == undefined) obj.y = specs.y;
        if(!obj.width) obj.width = specs.width;
        if(!obj.height) obj.height = specs.height;
        if(obj.anchor == undefined) obj.anchor = 7; // top left

        // deltas 
        var wDelta = obj.width - specs.width;
        var hDelta = obj.height - specs.height;

        // delta offsets: extra pixel goes at the bottom and on the right if odd delta is divided by two
        var wDelta1stHalf = (wDelta % 2 == 0) ? wDelta/2 : Math.floor(wDelta/2);
        // var wDelta2ndHalf = (wDelta % 2 == 0) ? wDelta/2 : Math.ceil(wDelta/2);

        var hDelta1stHalf = (wDelta % 2 == 0) ? hDelta/2 : Math.floor(hDelta/2);
        // var hDelta2ndHalf = (wDelta % 2 == 0) ? hDelta/2 : Math.ceil(hDelta/2);

        // anchor
        //	7	8	9
        //	4	5	6
        //	1	2	3

        switch(obj.anchor)
		{
            case 7 : { break; }
			case 8 : { obj.x -= wDelta1stHalf; break; }
			case 9 : { obj.x -= wDelta; break; }

			case 4 : { obj.y += hDelta1stHalf; break; }
			case 5 : { obj.x -= wDelta1stHalf; obj.y += hDelta1stHalf; break; }
			case 6 : { obj.x -= wDelta; obj.y += hDelta1stHalf; break; }

			case 1 : { obj.y += hDelta; break; }
			case 2 : { obj.x -= wDelta1stHalf; obj.y += hDelta; break; }
			case 3 : { obj.x -= wDelta; obj.y += hDelta; break; }

			default : { break; }
		}

		artboard.artboardRect = [ obj.x, obj.y, obj.x + obj.width, obj.y - obj.height ];

		if(obj.scaleArtwork)
		{
			var xScaleFactor = obj.width / specs.width;
			var yScaleFactor = obj.height / specs.height;

			// if(doc.artboards.getActiveArtboardIndex() != obj.index) doc.artboards.setActiveArtboardIndex(obj.index);
			doc.selectObjectsOnActiveArtboard();
			Pslib.scaleArtboardArtwork(xScaleFactor, yScaleFactor, obj.anchor, true);
		}

		return true;
    }
}

// scale artboard by factor (2.0 == 200%)
Pslib.scaleArtboard = function( num, obj )
{
	var scale = 1.0;
	if(!obj) obj = {};

	if(typeof num == "object")
	{
		obj = num;
	}
	else if(typeof num == "number")
	{
		scale = num;
	}

	var coords = Pslib.getArtboardCoordinates();
	obj.width = Math.round(coords.width * scale);
	obj.height = Math.round(coords.height * scale);

	if(obj.x == undefined) obj.x = coords.x;
	if(obj.y == undefined) obj.y = coords.y;
	if(!obj.anchor) obj.anchor = Pslib.getAnchorRefFromNum(5);

	return Pslib.resizeArtboard( obj );
}

// illustrator only
// Pslib.scaleArtboardArtwork(200, 200) // force w & h @ 200 pixels 
// Pslib.scaleArtboardArtwork(2.0, 2.0, Transformation.TOPLEFT, true); // 200%
Pslib.scaleArtboardArtwork = function (width, height, anchor, factorBool)
{
    if(!width) return false;
    var success = false;

    if(!height) height = width;
    if(!anchor) anchor = Pslib.getAnchorRefFromNum(5);

    if(typeof anchor == "number") anchor = Pslib.getAnchorRefFromNum(anchor);

    if(Pslib.isPhotoshop)
    {

    }
    else if(Pslib.isIllustrator)
    {
        var doc = app.activeDocument;
        var originalSelection = doc.selection;
        var artboard = Pslib.getActiveArtboard();

        var coords = Pslib.getArtboardCoordinates(artboard);
        doc.selectObjectsOnActiveArtboard();
        var selection = doc.selection;

        if(!selection.length) return;

        // pixels
        var wScale = width / coords.width;
        var hScale = height / coords.height;

        if(factorBool)
        {
            wScale *= coords.width; // 2.0 means 200%
            hScale *= coords.height;
        }

        if(selection.length > 0) 
        {
            for (var i = 0; i < selection.length; i++) 
            {
				// changePositions: Boolean, optional (Whether to effect art object positions and orientations)
				// changeFillPatterns: Boolean, optional (Whether to transform fill patterns)
				// changeFillGradients: Boolean, optional (Whether to transform fill gradients)
				// changeStrokePattern: Boolean, optional (Whether to transform stroke patterns)
				// changeLineWidths: Number (double), optional (The amount to scale line widths)
				// scaleAbout: Transformation, optional (The point to use as anchor, to transform about)

				// pageItem.resize(scaleX_DOUBLE, scaleY_DOUBLE, changePositions_BOOL, changeFillPatterns_BOOL, changeFillGradients_BOOL, changeStrokePattern_BOOL, changeLineWidths_BOOL, scaleAbout_Transformation )
                selection[i].resize (wScale*100, hScale*100, true, true, true, true, wScale*100, anchor);
            }
        }

        // restore original selection
        doc.selection = originalSelection;
        success = true;
    }
    return success;
}

// Pslib.scaleArtboardArtwork(2.0, 2.0, Transformation.TOPLEFT, true); // 200%
Pslib.scaleArtboardArtworkPercent = function (scaleX, scaleY, anchor)
{
	if(!scaleX && !scaleY) return false;
	if(!scaleY) scaleY = scaleX;
	scaleX = scaleX / 100;
	scaleY = scaleY / 100;
	if(anchor == undefined) anchor = Pslib.getAnchorRefFromNum(5);

    return Pslib.scaleArtboardArtwork(scaleX, scaleY, anchor, true);
}

// Pslib.scaleArtboardArtwork(2.0, 2.0, Transformation.TOPLEFT, true); // 200%
Pslib.scaleArtboardArtworkPixels = function (width, height, anchor)
{
    return Pslib.scaleArtboardArtwork(width, height, anchor, false);
}

// get projected mips count, with optional target multiple
Pslib.getMipsCount = function(coords, multNum)
{
	if(typeof coords == "number" && multNum == undefined)
	{
		multNum = coords;
		coords = Pslib.getArtboardCoordinates();
	}
	if(!coords) coords = Pslib.getArtboardCoordinates();
	var maxV = Math.max(coords.width, coords.height);
	var hasMult = !isNaN(multNum);

	var mCount = 0;
	var minV = maxV;
	if(hasMult)
	{
		// if(minV.isMultOf(multNum)) mCount = 1; // 1 if mip0 counts, it won't in this case
		if(minV.isMultOf(multNum)) mCount = 0;
	}

	while(minV > 1)
	{
		minV /= 2;
		if(hasMult)
		{
			if(minV.isMultOf(multNum)) mCount++;
			else return mCount;
		}
		else mCount++;
	}

	return mCount;
}

// also needs function to reverse process (halve artboard size?)
Pslib.removeMipsLayout = function()
{
	Pslib.resizeArtboardHalfWidth( undefined, true );

	var placeholder = Pslib.getArtboardItem();
	if(placeholder)
	{
		Pslib.removeTags( placeholder, ["customMips"] );
	}
}

// duplicate artboard artwork, prepare for manually optimized pixel art
Pslib.createMipsLayout = function(scaleStylesBool, resizeArtboardBool, silentBool, multNum)
{
	if(!app.documents.length) return false;
	if(resizeArtboardBool == undefined) resizeArtboardBool = false;
	if(silentBool == undefined) silentBool = false;
	if(multNum == undefined) multNum = 4;

	var doc = app.activeDocument;
	var artboard = Pslib.getActiveArtboard(); 
	var coords = Pslib.getArtboardSpecs();
	// var indexNum =

	var mips = Pslib.getMipsCount(coords, multNum);
	if(mips == 0) return false;
	if(Pslib.isIllustrator)
	{
		doc.selectObjectsOnActiveArtboard();
		var selection = doc.selection;
		var placeholder = Pslib.getArtboardItem();

		if(placeholder)
		{
			// check for existing tag, abort if present
			if(Pslib.getTags(placeholder, [ ["customMips", null] ]).length)
			{
				if(!silentBool) alert("Custom mips tag already present!");
				return false;
			}
		}
		else
		{
			// placeholder = Pslib.addArtboardRectangle( { artboard: artboard, tags: [ ["name", artboard.name], ["index", coords.index], ["page", coords.page], ["assetID", ""] ] }); // , layer: doc.layers.getByName("Placeholders") } );
			// , sendToBack: true

			var artboard = Pslib.getActiveArtboard();
            var indexNum = doc.artboards.getActiveArtboardIndex();
            var pageNum = indexNum+1;
			var layer;
			try{ layer = doc.layers.getByName("Placeholders"); }
			catch(e){}
            var rectObj = { artboard: artboard, name: "#", tags: [ ["name", artboard.name], ["index", indexNum], ["page", pageNum], ["assetID", ""] ], hex: undefined, opacity: undefined, layer: layer, sendToBack: true };
            var placeholder = Pslib.addArtboardRectangle( rectObj );
 
            doc.selection = placeholder;
		}

		for(var i = 0; i < selection.length; i++)
		{
			var itemTop = selection[i].top;
			var itemLeft = selection[i].left;

			var wScale = ((coords.width/2) / coords.width) * 100;
			var hScale = ((coords.height/2) / coords.height) * 100;

			var referenceLeft = coords.x;

			var divisionValue = 2;
			var offsetX = (coords.width / divisionValue);
			var cumulativeArtboardWidths = coords.width;

			for(var j = 0; j < mips; j++)
			{
				// ignore placeholder, teehee
				if(selection[i].name == "#") continue;

				var duplicate = selection[i].duplicate();

				offsetX = Math.round(itemLeft / divisionValue);

				// pageItem.resize(scaleX_DOUBLE, scaleY_DOUBLE, changePositions_BOOL, changeFillPatterns_BOOL, changeFillGradients_BOOL, changeStrokePattern_BOOL, changeLineWidths_BOOL, scaleAbout_Transformation); // Transformation.DOCUMENTORIGIN
				// duplicate.resize (wScale, hScale, true, true, true, scaleStylesBool, wScale, Pslib.getAnchorRefFromNum(7));
				duplicate.resize (wScale, hScale, scaleStylesBool, scaleStylesBool, scaleStylesBool, scaleStylesBool, wScale, Transformation.TOPLEFT);

				referenceLeft = (cumulativeArtboardWidths + offsetX);
				duplicate.left = referenceLeft;
				duplicate.top = (itemTop / divisionValue);

				// for next loop
				cumulativeArtboardWidths += Math.round(coords.width / divisionValue);
				wScale /= 2; 
				hScale /= 2; 
				divisionValue *= 2;
			}
		}

		if(resizeArtboardBool)
		{
			// var obj = { width: 128, height: 128, anchor: 5, scaleArtwork: true };
			// Pslib.resizeArtboard( obj );

			var resizeObj = { width: coords.width * 2, anchor: 7, scaleArtwork: false };
			Pslib.resizeArtboard( resizeObj );

			// also take care of resizing placeholder
			if(placeholder)
			{
				Pslib.resizeSelectedItemToArtboardBounds();
				Pslib.setTags( placeholder, [ ["customMips", true] ]);
			}
		}

		// restore initial selection
		doc.selection = selection;

		return true;
	}
	else if(Pslib.isPhotoshop)
	{
		// needs precision solution 
		// duplicate artboard content, rasterize, then dupe?

		return false;
	}
}

// auto-select parent artboard, no matter the current nested level, with optional warning
Pslib.selectParentArtboard = function( layer, warnBool )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(!layer) layer = doc.activeLayer;
		if(doc.activeLayer != layer) doc.activeLayer = layer;

		// if layer parent is active document, there is no use going any further
		if(layer.parent == doc) return false;

		// if current layer is not an artboard, and its parent is not the active document
		// loop through parents all the way to the root
		if(!Pslib.isArtboard(layer) && layer.parent != doc)
		{
			if(warnBool) alert("Not an artboard!");
			while(layer.parent != doc)
			{
				layer = layer.parent;
				doc.activeLayer = layer;
				if(Pslib.isArtboard(layer)) return true;
			}
		}
		return false;
	}
}

// quick wrappers for halfing/doubling artboard widths (with option to resize placeholder if found)
Pslib.resizeArtboardHalfWidth = function( coords, resizePlaceholderBool )
{
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) return false;

		if(!coords) coords = Pslib.getArtboardCoordinates();

		var resizeObj = { width: Math.round(coords.width * 0.5), anchor: 7, scaleArtwork: false };
		Pslib.resizeArtboard( resizeObj );

		if(resizePlaceholderBool)
		{
			var placeholder = Pslib.getArtboardItem();
			if(placeholder)
			{
				Pslib.resizeSelectedItemToArtboardBounds();
			}
		}

		return true;
	}
}

Pslib.resizeArtboardDoubleWidth = function( coords, resizePlaceholderBool )
{
	if(!app.documents.length) return false;
	if(!coords) coords = Pslib.getArtboardCoordinates();

	var resizeObj = { width: coords.width * 2.0, anchor: 7, scaleArtwork: false };

	Pslib.resizeArtboard( resizeObj );

	if(Pslib.isIllustrator)
	{	
		if(resizePlaceholderBool)
		{
			var placeholder = Pslib.getArtboardItem();
			if(placeholder)
			{
				Pslib.resizeSelectedItemToArtboardBounds();
			}
		}

		return true;
	}
	// else if(Pslib.isPhotoshop)
	// {
	// 	Pslib.resizeArtboard( resizeObj );
	// 	return true;
	// }
}

Pslib.resizeSelectedItemToArtboardBounds = function( coords )
{
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) return false;
		var doc = app.activeDocument;

		var selection = doc.selection;
		if(!selection.length) return false;
		var item = selection[0];

		if(app.coordinateSystem != CoordinateSystem.ARTBOARDCOORDINATESYSTEM) app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
		if(!coords) coords = Pslib.getArtboardCoordinates();

		item.width = coords.width;
		item.height = coords.height;
		item.left = coords.x;
		item.top = coords.y;

		return true;
	}
}

// returns default AnchorPosition.MIDDLECENTER for Photoshop, Transformation.CENTER for Illustrator
Pslib.getAnchorRefEnum = function ( str, defaultValue )
{
	var refEnum = null;

	if(typeof str == "number")
	{
		if((str > 0) && (str < 10))
		{
			// safely assume we want 1-9 grid number
			return Pslib.getAnchorNum(str);
		}
	}

	if(typeof str != "string")
	{
		if(typeof str == "object")
		{
			str = str.toString();
		}
	}

	if(defaultValue != undefined) refEnum = defaultValue;
	
	switch(str)
	{
		case ('AnchorPosition.TOPLEFT' || 'Transformation.TOPLEFT') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.TOPLEFT : (Pslib.isIllustrator ? Transformation.TOPLEFT : 7);
			break;
		}
		case ('AnchorPosition.TOPCENTER' || 'Transformation.TOP') :
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.TOPCENTER : (Pslib.isIllustrator ? Transformation.TOP : 8);
			break;
		}
		case ('AnchorPosition.TOPRIGHT' || 'Transformation.TOPRIGHT') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.TOPRIGHT : (Pslib.isIllustrator ? Transformation.TOPRIGHT : 9);
			break;
		}
		case ('AnchorPosition.MIDDLELEFT' || 'Transformation.LEFT') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.MIDDLELEFT : (Pslib.isIllustrator ? Transformation.LEFT : 4);
			break;
		}
		case ('AnchorPosition.MIDDLECENTER' || 'Transformation.CENTER') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.MIDDLECENTER : (Pslib.isIllustrator ? Transformation.CENTER : 5);
			break;
		}
		case ('AnchorPosition.MIDDLERIGHT' || 'Transformation.RIGHT') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.MIDDLERIGHT : (Pslib.isIllustrator ? Transformation.RIGHT : 6);
			break;
		}
		case ('AnchorPosition.BOTTOMLEFT' || 'Transformation.BOTTOMLEFT') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.BOTTOMLEFT : (Pslib.isIllustrator ? Transformation.BOTTOMLEFT : 1);
			break;
		}
		case ('AnchorPosition.BOTTOMCENTER' || 'Transformation.BOTTOM') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.BOTTOMCENTER : (Pslib.isIllustrator ? Transformation.BOTTOM : 2);
			break;
		}
		case ('AnchorPosition.BOTTOMRIGHT' || 'Transformation.BOTTOMRIGHT') : 
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.BOTTOMRIGHT : (Pslib.isIllustrator ? Transformation.BOTTOMRIGHT : 3);
			break;
		}
		case ('Transformation.DOCUMENTORIGIN') : 
		{
			refEnum = JSUI.isIllustrator ? Transformation.DOCUMENTORIGIN : 5;
			break;
		}
		default : // center / document origin
		{
			refEnum = Pslib.isPhotoshop ? AnchorPosition.MIDDLECENTER : (Pslib.isIllustrator ? Transformation.CENTER : 5);
			break;
		}
	}
	return refEnum;
};


// easily get anchor reference number from string patterns like "TOPLEFT" 
// or actual Photoshop AnchorPosition enum instance
//
//	7	8	9
//	4	5	6
//	1	2	3
//
Pslib.getAnchorNum = function ( str, defaultNum )
{
	var num = null;
	if(str == undefined) return null;

	if(defaultNum != undefined) num = defaultNum;

	if(typeof str != "string")
	{
		if(typeof str == "object")
		{
			str = str.toString();
			// this.alert("AnchorPosition enum! " + str);
		}
	}
	
	var lowerCstr = str.toString().toLowerCase();

	if(Pslib.isPhotoshop)
	{
		if(lowerCstr.match("anchorposition.") != null)
		{
			switch(str)
			{
				case 'AnchorPosition.TOPLEFT' : 
				{
					num = 7;
					break;
				}
				case 'AnchorPosition.TOPCENTER' :
				{
					num = 8;
					break;
				}
				case 'AnchorPosition.TOPRIGHT' : 
				{
					num = 9;
					break;
				}
				case 'AnchorPosition.MIDDLELEFT' : 
				{
					num = 4;
					break;
				}
				case 'AnchorPosition.MIDDLECENTER' : 
				{
					num = 5;
					break;
				}
				case 'AnchorPosition.MIDDLERIGHT' : 
				{
					num = 6;
					break;
				}
				case 'AnchorPosition.BOTTOMLEFT' : 
				{
					num = 1;
					break;
				}
				case 'AnchorPosition.BOTTOMCENTER' : 
				{
					num = 2;
					break;
				}
				case 'AnchorPosition.BOTTOMRIGHT' : 
				{
					num = 3;
					break;
				}
				default : // center
				{
					num = 5;
					break;
				}
			}
		}
	}
	else if(Pslib.isIllustrator)
	{
		if(lowerCstr.match("transformation.") != null)
		{
			switch(str)
			{
				case 'Transformation.TOPLEFT' : 
				{
					num = 7;
					break;
				}
				case 'Transformation.TOP' :
				{
					num = 8;
					break;
				}
				case 'Transformation.TOPRIGHT' : 
				{
					num = 9;
					break;
				}
				case 'Transformation.LEFT' : 
				{
					num = 4;
					break;
				}
				case 'Transformation.CENTER' : 
				{
					num = 5;
					break;
				}
				case 'Transformation.RIGHT' : 
				{
					num = 6;
					break;
				}
				case 'Transformation.BOTTOMLEFT' : 
				{
					num = 1;
					break;
				}
				case 'Transformation.BOTTOM' : 
				{
					num = 2;
					break;
				}
				case 'Transformation.BOTTOMRIGHT' : 
				{
					num = 3;
					break;
				}
				case 'Transformation.DOCUMENTORIGIN' : 
				{
					num = 5;
					break;
				}
				default : // center
				{
					num = 5;
					break;
				}
			}
		}
	}

	return num;
};

Pslib.getAnchorRefFromNum = function ( num, defaultNum )
{
	var num = 5;
	if(defaultNum != undefined) defaultNum = 5;
	var ref = Pslib.isPhotoshop ? AnchorPosition.MIDDLECENTER : Transformation.CENTER;

	if(Pslib.isPhotoshop)
	{
		switch(num)
		{
			case 7 : { ref = AnchorPosition.TOPLEFT; break; }
			case 8 : { ref = AnchorPosition.TOPCENTER; break; }
			case 9 : { ref = AnchorPosition.TOPRIGHT; break; }

			case 4 : { ref = AnchorPosition.MIDDLELEFT; break; }
			case 5 : { ref = AnchorPosition.MIDDLECENTER; break; }
			case 6 : { ref = AnchorPosition.MIDDLERIGHT; break; }

			case 1 : { ref = AnchorPosition.BOTTOMLEFT; break; }
			case 2 : { ref = AnchorPosition.BOTTOMCENTER; break; }
			case 3 : { ref = AnchorPosition.BOTTOMRIGHT; break; }

			default : { ref = AnchorPosition.MIDDLECENTER; break; }
		}
	}
	else if(Pslib.isIllustrator)
	{
		switch(num)
		{
			case 7 : { ref = Transformation.TOPLEFT; break; }
			case 8 : { ref = Transformation.TOP; break; }
			case 9 : { ref = Transformation.TOPRIGHT; break; }

			case 4 : { ref = Transformation.LEFT; break; }
			case 5 : { ref = Transformation.CENTER; break; }
			case 6 : { ref = Transformation.RIGHT; break; }

			case 1 : { ref = Transformation.BOTTOMLEFT; break; }
			case 2 : { ref = Transformation.BOTTOM; break; }
			case 3 : { ref = Transformation.BOTTOMRIGHT; break; }

			case 0 : { ref = Transformation.DOCUMENTORIGIN; break; }

			default : { ref = Transformation.CENTER; break; }
		}
	}

	return ref;
};

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
// if getItems, returns array of overlapping items
// illustrator needs actual artboard object, photoshop requires the layer ID for the target artboard
Pslib.getItemsOverlapArtboard = function( itemsArr, artboard, getItems )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;
	var overlaps = false;

	if(Pslib.isIllustrator)
	{
		if(!artboard) var artboard = Pslib.getActiveArtboard();
		if(!itemsArr) var itemsArr = doc.selection ? doc.selection : undefined;
		if(!itemsArr) return;

		if(getItems) var overlapsArr = [];

		var artboardCoords = Pslib.getArtboardCoordinates(artboard);

		var abx1 = artboardCoords.x;
		var abx2 = artboardCoords.x + artboardCoords.width;
		var aby1 = artboardCoords.y;
		var aby2 = artboardCoords.y + artboardCoords.height;

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
	// for Photoshop, itemsArr is a collection of layer objects
	else if(Pslib.isPhotoshop)
	{
		// expects artboard as layer ID (int)
		if(!artboard) var artboard = Pslib.getActiveArtboard().id;
		if(!itemsArr) var itemsArr = doc.activeLayer ? doc.activeLayer : undefined;
		if(!itemsArr) return;

		if(getItems) var overlapsArr = [];

		var artboardCoords = Pslib.getArtboardCoordinates(artboard);

		var abx1 = artboardCoords.x;
		var abx2 = artboardCoords.x + artboardCoords.width;
		var aby1 = artboardCoords.y;
		var aby2 = artboardCoords.y + artboardCoords.height;

		// function returns true if a single item in collection overlaps artboard geometry
		for(var i = 0; i < itemsArr.length; i++)
		{
			var item = itemsArr[i];
			var itemCoords = Pslib.getLayerObjectCoordinates(item);

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

// wrapper used to quickly output current artboard to file
// default: PSD
Pslib.artboardToFile = function( obj )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if(Pslib.isIllustrator)
	{
		if(!obj) obj = {};
		if(!obj.extension) obj.extension = ".psd";

		obj.bypassXmpRange = true;
		var placeholderCreated = false;
		var selection = app.selection[0];

		// obj.pagesArr = undefined; // active artboard
		// if .psd, include a placeholder rectangle to force canvas dimensions

		// 
		if(obj.extension == ".psd")
		{
			var activeIndex = doc.artboards.getActiveArtboardIndex();
			var artboard = Pslib.getActiveArtboard();

			if(obj.pagesArr == undefined)
			{
				// activeIndex = doc.artboards.getActiveArtboardIndex();
				artboard = doc.artboards[activeIndex];			
				obj.pagesArr = [activeIndex+1];
			}

			// if target index does not match active artboard, make sure it does
			if(obj.pagesArr.toString() != (activeIndex+1).toString())
			{
				doc.selection = null;
				var index = parseInt(obj.pagesArr.toString());
				// var index = obj.pagesArr[0]-1;
				if(!isNaN(index))
				{
					index -= 1;
					doc.artboards.setActiveArtboardIndex(index);
					artboard = doc.artboards[index];
				}
			}

			var placeholder;
			// placeholder = Pslib.getArtboardItem(artboard, "#");

			placeholder = Pslib.addArtboardRectangle( { hex: "transparent", name: "#" } ); // specs ignored
			placeholderCreated = true;
	
			// if(!placeholder)
			// {
			// 	// cannot assume placeholder has same bounds as artboard
			// 		// get placeholder, compare bounds
			// 	// placeholder = Pslib.addArtboardRectangle( { hex: "FF1080", name: "OHHAI", opacity: 100} ); // specs ignored
			// 	placeholder = Pslib.addArtboardRectangle( "FF1080" ); // specs ignored
			// 	placeholderCreated = true;
			// 	// should also check for any visible geometry outside of artboard bounds
			// 		//
			// 	// check for locked items?
			// }
			// else
			// {
			// 	// validate existing 
			// 	var bounds = placeholder.visibleBounds;
			// 	var artboardBounds = artboard.artboardRect;
			// 	JSUI.quickLog(bounds, "\nplaceholder bounds:");
			// 	JSUI.quickLog(artboardBounds, "\nartboard bounds:");
			// }	

			// validate actual content bounds
			// add temporary clippling path if necessary

		}

		// remove placeholder if created
		// if(placeholderCreated) placeholder.remove();

		if(selection != null)
		{
			app.selection = selection;
		}

		return Pslib.artboardsToFiles( obj );
	}
	else if(Pslib.isPhotoshop)
	{

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
			dp.transparencyGrid = DocumentTransparencyGrid.TransparencyGridMedium; // .TransparencyGridDark // this seems ignored

			// newDoc = app.documents.add( app.activeDocument.documentColorSpace);
			newDoc = app.documents.addDocument("Web", dp);
		}
		return newDoc;
	}
}

// export entire document to single image (default ".png")
// should also support SVG, PDF output for illustrator
Pslib.documentToFile = function( obj )
{
	if(!app.documents.length) return;
	if(!obj) obj = {};
	var doc = app.activeDocument;

	var extension = ".png";
	var outputFile;

	// // if destination file object provided, get format 
	// if(obj.file)
	// {
	// 	extension = obj.file.getFileExtension();
	// 	outputFile = obj.file;
	// }
	// else
	// {
	// 	outputFile = obj.file;
	// }
	
	// automatically create -assets folder
	//if(!obj.file) 
	outputFile = new File( doc.name.getAssetsFolderLocation( undefined, false, true, true) + "/" + doc.name.getFileNameWithoutExtension() + extension );
	if(outputFile.exists) outputFile.remove();

	if(Pslib.isIllustrator)
	{
		//
		// if only PNG, 
		// using Document.imageCapture() for this could potentially replace all of the following?
		//

		// Export For Screens cannot just export the document
		// it comes as an option when exporting artboards

		// here is a hack for a successful full-document export
		// in a context where an artboard has the same name as the document

		var docNameNoExt = doc.name.getFileNameWithoutExtension();
		var assetsUri = docNameNoExt.getAssetsFolderLocation( undefined, undefined, true); // create directory if not present
		outputFile = new File(assetsUri + "/" + docNameNoExt + ".png");

		var activeArtboardIndex = doc.artboards.getActiveArtboardIndex();
	
		// if match found, we may have a conflict with saving document as PNG with same name.
		var artboardNameIndex = -1;

		// first check if artboard with document name is present in artboard collection
		var names = Pslib.getArtboardNames();
		var namesStr = names.join(" ");
		var docNameNoExt = doc.name.getFileNameWithoutExtension();

		if(namesStr.match(docNameNoExt)) // quick match, not the friendliest on perfs
		{
			for(var i = 0; i < names.length; i++)
			{
				if(names[i] == docNameNoExt)
				{
					artboardNameIndex = i;
				}
			}
		}

		var tempArtboard;
		if(artboardNameIndex > -1)
		{
			// if match found, assume document image will replace artboard image
			// otherwise a solution would be to temporarily rename the artboard before exporting and renaming it back
			// this may affect correspondance
		}
		else
		{
			// if we don't have a match, create temporary artboard to delete afterward
			var artboardsCount = doc.artboards.length;
			tempArtboard = doc.artboards.add( [ 0, 0, 1, -1 ] ); // [x1, y1, x2, y2]
	
			// tempArtboard.name = "TEMP_" + (Math.random() * 1000).toString(16);
			tempArtboard.name = docNameNoExt;
			doc.artboards.setActiveArtboardIndex(artboardsCount);
			var rectangle = Pslib.addArtboardRectangle(); // if you need a color reference
			// should we also delete 
			artboardNameIndex = artboardsCount; // last 
		}
	
		// User's local "Create Sub-folders" setting from Export For Screens dialog (will create "1x" subfolder if true)
		var smartExportUICreateFoldersPreference_UserValue = app.preferences.getIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference');
		if(smartExportUICreateFoldersPreference_UserValue)
		{   
			app.preferences.setIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference', 0);
		}
	
		var exportOptions = new ExportForScreensItemToExport();
		exportOptions.artboards = artboardNameIndex+1; // no way to force "none" / null / undefined
		exportOptions.document = true;
	
		var formatType = ExportForScreensType.SE_PNG24;
		var formatOptions = new ExportForScreensOptionsPNG24();

		// ExportForScreensOptionsPNG24.scaleTypeValue (default 1.0)
	
		doc.exportForScreens(assetsUri, formatType, formatOptions, exportOptions, "");
	
		// we can use this info to get a functional offset for image extraction
		var docSpecs = Pslib.getDocumentSpecs();
		// JSUI.quickLog(docSpecs);
	
		var docAssetsJson = Pslib.artboardCollectionCoordsToJsonFile(undefined, docSpecs);
		// JSUI.quickLog(docAssetsJson);
	
		// check if document width/height smaller than artboard geometry
		// output PNG may be smaller than artboard because of visible bounds
		// *** if single artboard, get bounds from .cropBox
	
		// get .visibleBounds is contained in artboard
		// if true, artboard geometry can be used safely
	
		// restore "Create Sub-folders" setting if needed
		if(smartExportUICreateFoldersPreference_UserValue)
		{
			app.preferences.setIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference', 1);
		}
	
		if(tempArtboard)
		{
			tempArtboard.remove();
			doc.artboards.setActiveArtboardIndex(activeArtboardIndex);
		}

		return outputFile;
	}
	else if(Pslib.isPhotoshop)
	{
		var opts;
		if(extension == ".png")
		{
			var opts = new ExportOptionsSaveForWeb();
			opts.PNG8 = false;
			opts.transparency = 1;
			opts.format = SaveDocumentType.PNG;
			doc.exportDocument(outputFile, ExportType.SAVEFORWEB, opts);
		}

		return outputFile;
	}
}


// select first art item found with on current artboard
Pslib.getArtboardItem = function( artboard, nameStr )
{
	if(!app.documents.length) return;

	if(!nameStr) { var nameStr = "#"; }
	if(!artboard) { var artboard = Pslib.getActiveArtboard(); }
	
	var doc = app.activeDocument;
	var targetItem;

	if(Pslib.isPhotoshop)
	{
		// if(doc.activeLayer != artboard)
		// {
		// 	doc.activeLayer = artboard;
		// }

		var artboardLayers = artboard.layers;
		if(artboardLayers)
		{
			for(var i = 0; i < artboardLayers.length; i++)
			{
				artboardLayer = artboardLayers[i];
				if(artboardLayer.typename == "ArtLayer")
				{
					// if shape layer
					if(artboardLayer.kind == LayerKind.SOLIDFILL)
					{
						if(artboardLayer.name == nameStr)
						{
							targetItem = artboardLayer;
							break;
						}
					}
				}
			}
		}
	}
	else if(Pslib.isIllustrator)
	{
		var found = false;

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
	}
	return targetItem;
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

// basic visual geometry covering artboard bounds
// should have an option for checking if exists (.mustBeUnique ?)
// var rectObj = { artboard: artboard, name: "#", tags: [ ["name", "value"], ["name", "value"] ], hex: "FB5008", opacity: 50, layer: LayerObject, sendToBack: true  };
Pslib.addArtboardRectangle = function ( obj )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;
	
	if(!obj)
	{
		obj = { hex: "transparent" };
	}

	// if(typeof obj.hex == "object")
	// {
	// 	// assume color object
	// 	// obj = { hex: JSUI.colorFillToHex(obj.hex) };
	// 	obj = { hex: obj.hex };
	// }

	// if string, assume Hexadecimal value if string passed as first argument
	if(typeof obj == "string")
	{
		obj = { hex: obj };
	}

	// then validate that hex string has six digits, override if needed
	if(typeof obj.hex == "string")
	{
		if(obj.hex != "transparent")
		{
			if(obj.hex.length != 6)
			{
				obj.hex = "000000";
			}
		}
	}

	var rectangle;

	if(Pslib.isIllustrator)
	{
		if(!obj.artboard) obj.artboard = Pslib.getActiveArtboard(); //return;

		// switch to artboard coordinates *before* getting metrics
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

		var coords = Pslib.getArtboardCoordinates(obj.artboard);

		if(obj.mustBeUnique)
		{
			rectangle = Pslib.getArtboardItem();
		}
		else
		{
			rectangle = doc.pathItems.rectangle( coords.x, -coords.y, coords.x+coords.width, coords.y+coords.height );
		}

		if(!rectangle) return
		doc.selection = rectangle;
	
		var transp = new NoColor();
		rectangle.strokeColor = transp;
		var colorObj = transp;

		if(typeof obj.hex == "string")
		{
			// JSUI.quickLog(obj.hex, "hex is string! ");

			if(obj.hex == "transparent")
			{
				rectangle.fillColor = transp;
			}
			else
			{
				colorObj = Pslib.hexToRGBobj(obj.hex);
				// JSUI.quickLog(colorObj, "illustrator color fill " + obj.hex + " " + typeof obj.hex );
			}

		}
		else if(typeof obj.hex == "object")
		{
			colorObj = obj.hex; // assume color object
		}

		rectangle.fillColor = colorObj;

		// rectangle.opacity = obj.opacity != undefined ? obj.opacity : 66;

		rectangle.name = obj.name ? obj.name : "#";
	
		if(obj.tags)
		{
			Pslib.setTags( rectangle, obj.tags );
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
				rectangle.move(obj.layer, ElementPlacement.PLACEATEND);
			}
		}

		// make object the last in selection
		if(obj.sendToBack)
		{
			// this seems to fail if layer does not have have any items (?)
			try
			{
				rectangle.zOrder(ZOrderMethod.SENDTOBACK);
			}
			catch(e)
			{
				// alert(e);
			}
		}
	}
	else if(Pslib.isPhotoshop)
	{
		// if int, cast as artboard ID
		if(typeof obj == "number")
		{
			obj = { artboard: obj }
		}
		// if layer id provided, select artboard by layer ID
		if(obj.artboard)
		{
			Pslib.selectLayerByID(obj.artboard, false);
			// if(!Pslib.isArtboard(doc.activeLayer)) return;
		}

		if(!Pslib.isArtboard(doc.activeLayer))
		{
			if (!Pslib.selectParentArtboard()) return;
		}
		
		var artboard = doc.activeLayer;

		if(obj.hex == undefined) obj.hex = "880088";
		// alert("obj.hex typeof " + (typeof obj.hex));
		
		var colorObj = typeof obj.hex == "string" ? Pslib.hexToRGBobj(obj.hex) : obj.hex;
	
		// get artboard size
		// var coords = Pslib.getArtboardCoordinates(obj.artboard);
		var coords = Pslib.getArtboardCoordinates(artboard.id);

		// // fails
		// if(obj.sendToBack)
		// {	
		// 	var tmpSetRefLayer = artboard.artLayers.add();
		// }

		if(obj.mustBeUnique)
		{
			// find out if one of the children layers is a managed rectangle already
			var artboardLayers = artboard.layers;
			for(var i = 0; i < artboardLayers.length; i++)
			{
				artboardLayer = artboardLayers[i];
				if(artboardLayer.typename == "ArtLayer")
				{
					// if shape layer
					if(artboardLayer.kind == LayerKind.SOLIDFILL)
					{
						if(artboardLayer.name == "#")
						{
							rectangle = artboardLayer;
							break;
						}
					}
				}
			}
		}

		// if no pre existing reference rectangle, create new
		if(!rectangle)
		{
			// scripting listener capture
			var idmake = sTID( "make" );
			var desc252 = new ActionDescriptor();
			var idnull = sTID( "null" );
				var ref6 = new ActionReference();
				var idcontentLayer = sTID( "contentLayer" );
				ref6.putClass( idcontentLayer );
			desc252.putReference( idnull, ref6 );
			var idusing = sTID( "using" );
				var desc253 = new ActionDescriptor();
				var idtype = sTID( "type" );
				var desc254 = new ActionDescriptor();
				var idcolor = sTID( "color" );
					var desc255 = new ActionDescriptor();
					var idred = sTID( "red" );
					desc255.putDouble( idred, colorObj.rgb.red ); // red
					var idgrain = sTID( "grain" ); 
					desc255.putDouble( idgrain, colorObj.rgb.green ); // green
					var idblue = sTID( "blue" );
					desc255.putDouble( idblue, colorObj.rgb.blue ); // blue
				var idRGBColor = sTID( "RGBColor" );
				desc254.putObject( idcolor, idRGBColor, desc255 );
			var idsolidColorLayer = sTID( "solidColorLayer" );
			desc253.putObject( idtype, idsolidColorLayer, desc254 );
			var idshape = sTID( "shape" );
				var desc256 = new ActionDescriptor();
				var idunitValueQuadVersion = sTID( "unitValueQuadVersion" );
				desc256.putInteger( idunitValueQuadVersion, 1 );
				var idtop = sTID( "top" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idtop, idpixelsUnit, coords.y );
				var idleft = sTID( "left" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idleft, idpixelsUnit, coords.x );
				var idbottom = sTID( "bottom" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idbottom, idpixelsUnit, coords.y + coords.height );
				var idright = sTID( "right" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idright, idpixelsUnit, coords.x + coords.width );
				var idtopRight = sTID( "topRight" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idtopRight, idpixelsUnit, 0.000000 );
				var idtopLeft = sTID( "topLeft" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idtopLeft, idpixelsUnit, 0.000000 );
				var idbottomLeft = sTID( "bottomLeft" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idbottomLeft, idpixelsUnit, 0.000000 );
				var idbottomRight = sTID( "bottomRight" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc256.putUnitDouble( idbottomRight, idpixelsUnit, 0.000000 );
			var idrectangle = sTID( "rectangle" );
			desc253.putObject( idshape, idrectangle, desc256 );
			var idstrokeStyle = sTID( "strokeStyle" );
				var desc257 = new ActionDescriptor();
				var idstrokeStyleVersion = sTID( "strokeStyleVersion" );
				desc257.putInteger( idstrokeStyleVersion, 2 );
				var idstrokeEnabled = sTID( "strokeEnabled" );
				desc257.putBoolean( idstrokeEnabled, false );
				var idfillEnabled = sTID( "fillEnabled" );
				desc257.putBoolean( idfillEnabled, true );
				var idstrokeStyleLineWidth = sTID( "strokeStyleLineWidth" );
				var idpixelsUnit = sTID( "pixelsUnit" );
				desc257.putUnitDouble( idstrokeStyleLineWidth, idpixelsUnit, 0.000000 );
				var idstrokeStyleLineDashOffset = sTID( "strokeStyleLineDashOffset" );
				var idpointsUnit = sTID( "pointsUnit" );
				desc257.putUnitDouble( idstrokeStyleLineDashOffset, idpointsUnit, 0.000000 );
				var idstrokeStyleMiterLimit = sTID( "strokeStyleMiterLimit" );
				desc257.putDouble( idstrokeStyleMiterLimit, 100.000000 );
				var idstrokeStyleLineCapType = sTID( "strokeStyleLineCapType" );
				var idstrokeStyleLineCapType = sTID( "strokeStyleLineCapType" );
				var idstrokeStyleButtCap = sTID( "strokeStyleButtCap" );
				desc257.putEnumerated( idstrokeStyleLineCapType, idstrokeStyleLineCapType, idstrokeStyleButtCap );
				var idstrokeStyleLineJoinType = sTID( "strokeStyleLineJoinType" );
				var idstrokeStyleLineJoinType = sTID( "strokeStyleLineJoinType" );
				var idstrokeStyleMiterJoin = sTID( "strokeStyleMiterJoin" );
				desc257.putEnumerated( idstrokeStyleLineJoinType, idstrokeStyleLineJoinType, idstrokeStyleMiterJoin );
				var idstrokeStyleLineAlignment = sTID( "strokeStyleLineAlignment" );
				var idstrokeStyleLineAlignment = sTID( "strokeStyleLineAlignment" );
				var idstrokeStyleAlignCenter = sTID( "strokeStyleAlignCenter" );
				desc257.putEnumerated( idstrokeStyleLineAlignment, idstrokeStyleLineAlignment, idstrokeStyleAlignCenter );
				var idstrokeStyleScaleLock = sTID( "strokeStyleScaleLock" );
				desc257.putBoolean( idstrokeStyleScaleLock, false );
				var idstrokeStyleStrokeAdjust = sTID( "strokeStyleStrokeAdjust" );
				desc257.putBoolean( idstrokeStyleStrokeAdjust, false );
				var idstrokeStyleLineDashSet = sTID( "strokeStyleLineDashSet" );
					var list4 = new ActionList();
				desc257.putList( idstrokeStyleLineDashSet, list4 );
				var idstrokeStyleBlendMode = sTID( "strokeStyleBlendMode" );
				var idblendMode = sTID( "blendMode" );
				var idnormal = sTID( "normal" );
				desc257.putEnumerated( idstrokeStyleBlendMode, idblendMode, idnormal );
				var idstrokeStyleOpacity = sTID( "strokeStyleOpacity" );
				var idpercentUnit = sTID( "percentUnit" );
				desc257.putUnitDouble( idstrokeStyleOpacity, idpercentUnit, 100.000000 );
				var idstrokeStyleContent = sTID( "strokeStyleContent" );
					var desc258 = new ActionDescriptor();
					var idcolor = sTID( "color" );
						var desc259 = new ActionDescriptor();
						var idred = sTID( "red" );
						desc259.putDouble( idred, 0.000000 );
						var idgrain = sTID( "grain" );
						desc259.putDouble( idgrain, 0.000000 );
						var idblue = sTID( "blue" );
						desc259.putDouble( idblue, 0.000000 );
					var idRGBColor = sTID( "RGBColor" );
					desc258.putObject( idcolor, idRGBColor, desc259 );
				var idsolidColorLayer = sTID( "solidColorLayer" );
				desc257.putObject( idstrokeStyleContent, idsolidColorLayer, desc258 );
				var idstrokeStyleResolution = sTID( "strokeStyleResolution" );
				desc257.putDouble( idstrokeStyleResolution, 144.000000 );
			var idstrokeStyle = sTID( "strokeStyle" );
			desc253.putObject( idstrokeStyle, idstrokeStyle, desc257 );
			var idcontentLayer = sTID( "contentLayer" );
			desc252.putObject( idusing, idcontentLayer, desc253 );
			var idlayerID = sTID( "layerID" );
			desc252.putInteger( idlayerID, 5 ); // ArtLayer type?
			executeAction( idmake, desc252, DialogModes.NO );

			rectangle = app.activeDocument.activeLayer;
			rectangle.name = obj.name ? obj.name : "#";
		}

		if(obj.opacity != undefined) rectangle.opacity = obj.opacity;

		if(obj.sendToBack)
		{
			// // moving a layer to the back of a layerset is tricky
			// // not there yet
			// try
			// {
			// 	// rectangle.move(tmpSetRefLayer, ElementPlacement.PLACEAFTER);

			// 	// var artboardLayers = artboard.layers;
			// 	// for(var i = 0; i < artboardLayers.length; i++)
			// 	// {
			// 	// 	artboardLayer = artboardLayers[i];
			// 	// 	if(artboardLayer.typename == "ArtLayer")
			// 	// 	{
			// 	// 		// if shape layer
			// 	// 		if(artboardLayer.kind == LayerKind.SOLIDFILL)
			// 	// 		{
			// 	// 			if(artboardLayer.name == "#")
			// 	// 			{
			// 	// 				rectangle = artboardLayer;
			// 	// 				break;
			// 	// 			}
			// 	// 		}
			// 	// 	}
			// 	// }

			// }
			// catch(e)
			// {
			// 	// alert(e);
			// }
		}

		if(obj.tags)
		{
			Pslib.setXmpProperties(rectangle, obj.tags, obj.namespace ? obj.namespace : Pslib.XMPNAMESPACE);
		}
	}
	return rectangle;
}

// add rectangles to all artboards
// hexStr = "transparent"
Pslib.addArtboardRectangles = function ( arr, hexStr, randomize, unique )
{
	if(!app.documents.length) return;
	if(randomize == undefined) randomize = 0;
	// if(!obj) obj = {};
	// if(hexStr == undefined) hexStr = "ff00ff";

	if((typeof arr == "string") && (hexStr == undefined))
	{
		hexStr = arr;
		arr = Pslib.getSpecsForAllArtboards();
	}

	if(hexStr == undefined) hexStr = "transparent";
	if(!arr)
	{
		// arr = Pslib.getSpecsForAllArtboards(true);
		arr = Pslib.getSpecsForAllArtboards();
	}

	var doc = app.activeDocument;
	var rectArr = [];
	var initialArtboard;

	if(Pslib.isIllustrator)
	{
		// initialArtboard = Pslib.getArtboardIndex( Pslib.getActiveArtboard() );
		initialArtboard = doc.artboards.getActiveArtboardIndex();

		for(var i = 0; i < arr.length; i++)
		{
			var artboardIndex = arr[i].id;
			if(artboardIndex == undefined) continue;

			var artboard = doc.artboards[artboardIndex];
			doc.artboards.setActiveArtboardIndex(artboardIndex);

			// var rgbObj = randomize ? JSUI.randomizeRGBColor(hexStr, randomize) : JSUI.hexToRGBobj(hexStr);

			var rgbObj = JSUI.randomizeRGBColor(hexStr, randomize);

			// //
			// // fails with "transparent"
			// //
			// // convert HSB to better control RGB variations
			// // if(hexStr == "transparent") hexStr = [1, 1, 1]
			// var hsbArr = Pslib.RGBtoHSB( Pslib.hexToRGB(hexStr) );
			// JSUI.quickLog(hsbArr, "hsbArr:");

			// var hue = hsbArr[0];
			// var sat = hsbArr[1];
			// var bri = hsbArr[2];

			// hue = JSUI.randomizeFloat( hue, 360, randomize );
			// bri = JSUI.randomizeFloat( bri, 100, randomize );
			// // var hue = Math.max(randomize * ( hue * Math.random() ), 360);

			// // sat = JSUI.randomizeFloat( sat, 100, randomize );
			// // bri = JSUI.randomizeFloat( bri, 100, randomize );

			// var modifiedRgbArr = Pslib.HSBtoRGB( [ hue, sat, bri ] );
			// var rgbObj = Pslib.RGBToColorObj(modifiedRgbArr);

			// JSUI.quickLog("\thue: " + hue);
			// JSUI.quickLog("\tbri: " + bri);


			// var hex = JSUI.HexToR(hexStr)+JSUI.HexToG(hexStr)+JSUI.HexToB(hexStr);			
			// var hex = JSUI.colorFillToHex(rgbObj);
			var obj = { artboard: artboard, mustBeUnique: unique, hex: rgbObj, sendToBack: true };
			var rect = Pslib.addArtboardRectangle( obj );
			rectArr.push(rect);
		}

		doc.artboards.setActiveArtboardIndex(initialArtboard);
	}
	else if(Pslib.isPhotoshop)
	{
		initialArtboard = doc.activeLayer;

		for(var i = 0; i < arr.length; i++)
		{
			var artboard = arr[i].id;
			// var rgbObj = randomize ? JSUI.randomizeRGBColor(hexStr, randomize) : JSUI.hexToRGBobj(hexStr);
			var rgbObj = JSUI.randomizeRGBColor(hexStr, randomize);
			var obj = { artboard: artboard, mustBeUnique: unique, hex: rgbObj, sendToBack: true };
			var rect = Pslib.addArtboardRectangle( obj );
			if(unique)
			{
				// Pslib.updateArtboardBackgroundColor(hexStr, create) // for setting artboard background itself
				Pslib.updateFillColor( rect, rgbObj ); // reference ectangle
			}
			rectArr.push(rect);
		}

		if(initialArtboard) doc.activeLayer = initialArtboard;
	}

    return rectArr;
}

Pslib.removeArtboardRectangles = function ( arr, nameStr )
{
	if(!app.documents.length) return;

	var doc = activeDocument;

	if(!arr)
	{
		arr = Pslib.getSpecsForAllArtboards( true );
	}

	// if(nameStr)
	// {
	// 	nameStr = "#";
	// }

	// var items = Pslib.getArtboardItems( arr, nameStr );

	// JSUI.quickLog(items);

	if(Pslib.isPhotoshop)
	{
		for(var i = 0; i < arr.length; i++)
		{
			// var arr = arr[i];
			Pslib.selectLayerByID(arr[i]);
			var rectangle = Pslib.getArtboardItem( doc.activeLayer, nameStr);
			if(rectangle)
			{
				// JSUI.quickLog("Removing " + item.name);

				try
				{
					// JSUI.quickLog(arr[i]+" removing " + rectangle.name);
					doc.activeLayer = rectangle;
					rectangle.remove();
				}
				catch(e)
				{
					// if layer object is the last one left, this won't work 
					// just set its opacity to zero
					// rectangle.opacity = 0;
					rectangle.visible = false;
					// JSUI.quickLog(arr[i] + "\n\n"+e);

				}
			}
			else
			{
				// JSUI.quickLog(arr[i]+" No rectangle found.");
			}

		}
		return;
	}
	else if(Pslib.isIllustrator)
	{

	}
}

// get RGB value of active object as hex string
Pslib.getFillColor = function ( asColorObj )
{
	if(!app.documents.length) return;

	var doc = activeDocument;
	var hexStr;

	if(Pslib.isPhotoshop)
	{
		var layer = doc.activeLayer;

		if(layer.typename == "ArtLayer")
		{
			// if shape layer, proceed
			if(layer.kind == LayerKind.SOLIDFILL)
			{
				var ref = new ActionReference();
				ref.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
				var desc = executeActionGet(ref);
		
				var adjs = desc.getList(cTID('Adjs'));
				var clrDesc = adjs.getObjectValue(0);
				var color = clrDesc.getObjectValue(cTID('Clr '));
		
				var r = Math.round(color.getDouble(cTID('Rd  ')));
				var g = Math.round(color.getDouble(cTID('Grn ')));
				var b = Math.round(color.getDouble(cTID('Bl  ')));
		
				hexStr = Pslib.RGBtoHex(r, g, b);
			}
		}
		else if(Pslib.isArtboard(layer))
		{
			// if active layer is an artboard, change harvesting method
			var specs = Pslib.getArtboardSpecs(layer.id);
			hexStr = specs.backgroundColor;
		}
	}
	else if(Pslib.isIllustrator)
	{
		if(!doc.selection) return;
		item = doc.selection[0];

		var color = item.fillColor;
		var r = color.fillColor.red;
		var g = color.fillColor.green;
		var b = color.fillColor.blue;

		hexStr = Pslib.RGBtoHex(r, g, b);
	}
	if(hexStr == undefined) return;
	else return asColorObj ? Pslib.hexToRGBobj(hexStr) : hexStr;
}

Pslib.updateFillColor = function( item, hexStr )
{
	if(!app.documents.length) return;
	if(!hexStr) return;

	var doc = activeDocument;
	var initialSelection;
	
	if(Pslib.isPhotoshop)
	{
		var layer = doc.activeLayer;
		if(!item) item = layer;

		if(doc.activeLayer != item) 
		{
			initialSelection = layer;
			doc.activeLayer = item;
		}

		if(layer.typename == "ArtLayer")
		{
			// if shape layer, proceed
			if(layer.kind == LayerKind.SOLIDFILL)
			{
				// update layer's fill value
				if(hexStr == "transparent")
				{
					var currentColor = Pslib.getFillColor();
					item.fillOpacity = 0;
					hexStr = currentColor;
				}
				else 
				{
					// if fully transparent, assume we want it opaque
					if(item.fillOpacity == 0)
					{
						item.fillOpacity = 100;
					}
				}

				// if hexStr is already SolidColor, get hex value 
				if(typeof hexStr == "object")
				{
					hexStr = hexStr.rgb.hexValue;
				}

				var sColor =  new SolidColor;
				sColor.rgb.hexValue = hexStr;

				var desc = new ActionDescriptor();
					var ref = new ActionReference();
					ref.putEnumerated( sTID('contentLayer'), cTID('Ordn'), cTID('Trgt') );
				desc.putReference( cTID('null'), ref );
					var fillDesc = new ActionDescriptor();
						var colorDesc = new ActionDescriptor();
						colorDesc.putDouble( cTID('Rd  '), sColor.rgb.red );
						colorDesc.putDouble( cTID('Grn '), sColor.rgb.green );
						colorDesc.putDouble( cTID('Bl  '), sColor.rgb.blue );
					fillDesc.putObject( cTID('Clr '), cTID('RGBC'), colorDesc );
				desc.putObject( cTID('T   '), sTID('solidColorLayer'), fillDesc );
				executeAction( cTID('setd'), desc, DialogModes.NO );

				// restore selection
				if(initialSelection) 
				{
					doc.activeLayer = initialSelection;
				}
			}
		}
		else if(Pslib.isArtboard(layer))
		{
			if(typeof hexStr == "object")
			{
				hexStr = hexStr.rgb.hexValue;
			}
			
			Pslib.updateArtboardBackgroundColor( hexStr );
		}
		return true;
	}
	else if(Pslib.isIllustrator)
	{        
		if(!item) 
		{
			if(!doc.selection.length) return;
			item = doc.selection[0];
		}
		if(!item) return;

		// doc.selection = item;

		var transp = new NoColor();

		if(doc.selection != item) 
		{
			initialSelection = doc.selection[0];
			doc.selection = item;
			item = doc.selection[0];
		}

		if(hexStr == "transparent")
		{
			item.strokeColor = transp;
			item.fillColor = transp;
		}
		else 
		{
			colorObj = Pslib.hexToRGBobj(hexStr);
			item.fillColor = colorObj;

			// if fully transparent, assume we want it opaque at this point
			if(item.fillOpacity == 0)
			{
				item.fillOpacity = 100;
			}
		}



		// var artboard = arr[i];
		// var obj = { artboard: artboard, mustBeUnique: true, hex: rgbObj, sendToBack: true };
		// return asColorObj ? Pslib.hexToRGBobj(hexStr) : hexStr;
		return true;
	}

	// 	if(artboardLayer.typename == "ArtLayer")
	// 	{
	// 		// if shape layer
	// 		if(artboardLayer.kind == LayerKind.SOLIDFILL)
	// 		{
}

// this will make a Photoshop shape layer or artboard background fully transparent
// illustrator artwork item fillColor strokeColor
Pslib.makeFillTransparent = function( item )
{
	return Pslib.updateFillColor(item, "transparent");
}

Pslib.makeAllArtboardBackgroundsTransparent = function( artboards )
{
	if(!app.documents.length) return;
	// if(!hexStr) return;

	var doc = app.activeDocument;

	var coords = Pslib.getArtboardCollectionCoordinates();
	// var rectangles = Pslib.addArtboardRectangles(coords, "transparent", 0, add); // overrides existing backgrounds

	if(Pslib.isPhotoshop)
	{
		var activeLayer = doc.activeLayer;
		for(var i = 0; i < coords.length; i++)
		{
			var artboard = Pslib.selectLayerByID(coords[i].id);
			if(artboard)
			{
				Pslib.makeFillTransparent(artboard);
			}
		}
		if(activeLayer == doc.activeLayer) doc.activeLayer = activeLayer;
	}
	else if(Pslib.isIllustrator)
	{
		var selection = doc.selection;

		for(var i = 0; i < doc.artboards.length; i++)
		{
			var artboard = doc.artboards[i];
			if(artboard)
			{
				doc.artboards.setActiveArtboardIndex(i);
				doc.selectObjectsOnActiveArtboard();
				var placeholder = Pslib.getArtboardItem();

				Pslib.updateFillColor(placeholder, "transparent");
			}
		}

		if(selection) doc.selection = selection;

		// return Pslib.updateFillColor(item, "transparent");
	}


	// return rectangles;
	return;
}


Pslib.colorAllArtboardBackgrounds = function( hexStr )
{
	if(!app.documents.length) return;
	if(!hexStr) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var activeLayer = doc.activeLayer;
		var coords = Pslib.getArtboardCollectionCoordinates();
		for(var i = 0; i < coords.length; i++)
		{
			var artboard = Pslib.selectLayerByID(coords[i].id);
			// Pslib.makeFillTransparent(artboard);
			Pslib.updateFillColor(artboard, hexStr);
		}
		if(activeLayer == doc.activeLayer) doc.activeLayer = activeLayer;
	}
	else if(Pslib.isIllustrator)
	{
		// var placeholders = Pslib.getArtboardItems( doc.artboards );
		// // // alert(placeholders.length);
		// for(var i = 0; i < placeholders.length; i++)
		// {
		// 	var item = placeholders[i];

		// 	JSUI.quickLog(i+" bounds: " + item.visibleBounds);
		// 	doc.selection = item;
		// 	item = doc.selection[0];

		// 	Pslib.updateFillColor(item, hexStr);
		// 	JSUI.quickLog(i+" placeholder color updated");
			
		// }
		// return true;
		
		// var artboards = Pslib.getAllArtboards();

		// for(var i = 0; i < placeholders.length; i++)
		// {
		// 	var artboard = artboards[i];
		// 	// app.activeDocument.selection = item;

		// 	Pslib.updateFillColor(item, hexStr);

		// 	JSUI.quickLog(i+" placeholder color updated");
		// }

		// var coords = Pslib.getArtboardCollectionCoordinates();
		// for(var i = 0; i < coords.length; i++)
		// {
		// 	var artboard = app.activeDocument.artboards[coords[i].index];
		// 	if(artboard)
		// 	{
		// 		// Pslib.makeFillTransparent(artboard);
		// 		Pslib.updateFillColor(artboard, hexStr);
		// 	}

		// }
		var selection = doc.selection;
		for(var i = 0; i < doc.artboards.length; i++)
		{
			var artboard = doc.artboards[i];
			if(artboard)
			{
				doc.artboards.setActiveArtboardIndex(i);
				doc.selectObjectsOnActiveArtboard();
				var placeholder = Pslib.getArtboardItem();

				Pslib.updateFillColor(placeholder, hexStr);
			}
		}
		if(selection) doc.selection = selection;
	}
	return;
}


// get items with specific name from provided artboards collection
Pslib.getArtboardItems = function( artboardsArr, nameStr )
{
	if(!app.documents.length) return;
	if(!nameStr) { nameStr = "#"; }
	var doc = app.activeDocument;

	var artboardItems = [];

	if(Pslib.isPhotoshop)
	{
		if(!artboardsArr) { artboardsArr = Pslib.getAllArtboards(); }

		for(var j = 0; j < artboardsArr.length; j++)
		{
			var targetItem = Pslib.getArtboardItem( artboardsArr[j], nameStr );
			if(targetItem) artboardItems.push(targetItem);
		}

	}
	else if(Pslib.isIllustrator)
	{
		if(!artboardsArr) { artboardsArr = doc.artboards; }

		for (var i = 0; i < artboardsArr.length; i++)
		{
			var item = Pslib.getArtboardItem( artboardsArr[i], nameStr );
			if(item)
			{
				artboardItems.push(item);
			}
		}
	}
	return artboardItems;
}

Pslib.getArtboardsCount = function()
{
    if(!app.documents.length) return false;
    var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
	{
		// get artboard IDs as array, if length is zero
        var count = Pslib.getSpecsForAllArtboards(true).length;
        return count; 
    }
    else if(Pslib.isIllustrator)
	{
		return doc.artboards.length;
	}
}

// illustrator context always has at least one artboard, photoshop does not.
Pslib.documentHasArtboards = function()
{
	return Pslib.getArtboardsCount().length > 0;
}

// get document selection bounds
// doc.selection.bounds is problematic if selection not present
Pslib.getSelectionBounds = function ()
{
    if(!app.documents.length) return false;
    var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
        var selectionBounds;
        
        try
        {
            selectionBounds = doc.selection.bounds;
        }
        catch(e)
        {
        }
        return selectionBounds;
    }
}


// quick check for match between active layer and document selection
Pslib.selectionBoundsMatchesLayer = function ()
{
    if(!app.documents.length) return false;
    var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
        var layerBounds = doc.activeLayer.bounds;
        var selectionBounds = Pslib.getSelectionBounds();
        return selectionBounds == undefined ? false : (selectionBounds.toString() == layerBounds.toString());
    }
}


// RGB hex functions from JSUI

// get array of normalized values from hex string
// "#f760e3" becomes [0.96862745098039,0.37647058823529,0.89019607843137,1];
Pslib.hexToRGB = function (hex)
{
	if(hex == "transparent") hex = "000000"
	var color = hex.trim().replace('#', '');
	var r = parseInt(color.slice(0, 2), 16) / 255;
	var g = parseInt(color.slice(2, 4), 16) / 255;
	var b = parseInt(color.slice(4, 6), 16) / 255;
	return [r, g, b, 1];
}

// hex string to Photoshop/Illustrator color object
// "#f760e3" becomes SolidColor/RGBColor{ red:,green:, blue:  }
Pslib.hexToRGBobj = function ( hexStr )
{
    var hex = hexStr != undefined ? hexStr : "000000";

	// illustrator does not have a direct hexValue property
	if(Pslib.isIllustrator)
	{
		if(hexStr == "transparent") return new NoColor();
		var color = new RGBColor();

		color.red = Pslib.HexToR(hex);
		color.green = Pslib.HexToG(hex);
		color.blue = Pslib.HexToB(hex);
		return color;
	}
	else if(Pslib.isPhotoshop)
	{
		var color = new SolidColor();
		if(hexStr == "transparent") return color;
		color.rgb.hexValue = hex;
		return color;
	}

    return;
}

// array to color object
Pslib.RGBToColorObj = function ( rgb )
{
	if(Pslib.isIllustrator)
	{
		var color = new RGBColor();
		color.red = rgb[0];
		color.green = rgb[1];
		color.blue = rgb[2];
		return color;
	}
	else if(Pslib.isPhotoshop)
	{
		var color = new SolidColor();
		color.rgb.red = rgb[0];
		color.rgb.green = rgb[1];
		color.rgb.blue = rgb[2];
		return color;
	}

    return;
}

// RGB values to hexadecimal string: (255, 0, 128) becomes "FF0080"
Pslib.RGBtoHex = function(r, g, b, a)
{
	return Pslib.toHex(r) + Pslib.toHex(g) + Pslib.toHex(b) + (a != undefined ? JSUI.toHex(a) : "")
}

// Number to hex string (128 becomes "80")
Pslib.toHex = function(n)
{
	if (n == 0 || n == null || n == undefined || isNaN(n)) return "00";
	if(isNaN(n)) n = parseInt(n);
	n = Math.max(0, Math.min(n, 255));
	return ((1<<8)+n).toString(16).toUpperCase().slice(1);
}

Pslib.cutHex = function(h)
{
	if(h.charAt(0)=="#") h = h.substring(1,7); 
	else if(h.charAt(0)=="0" && h.charAt(1)=="x") h = h.substring(2,8); return h;
}

Pslib.HexToR = function(h) 
{
	return parseInt((Pslib.cutHex(h)).substring(0,2), 16);
}

Pslib.HexToG = function(h) 
{
	return parseInt((Pslib.cutHex(h)).substring(2,4), 16);
}

Pslib.HexToB = function(h)
{
	return parseInt((Pslib.cutHex(h)).substring(4,6), 16);
}

Pslib.HexToA = function(h)
{
	return parseInt((Pslib.cutHex(h)).substring(6,8), 16);
}


//
// standalone color conversion snippets
// RGB << >> HSL << >> HSB 
//

Pslib.RGBtoHSB = function( rgbArr )
{
    var arr = Pslib.RGBtoHSL(rgbArr); 
    arr = Pslib.HSLtoHSB(arr);

    return arr;
}

Pslib.RGBtoHSL = function( rgbArr )
{
    if(!rgbArr) return;
    if(!rgbArr.length) return;

    var r = rgbArr[0];
    var g = rgbArr[1];
    var b = rgbArr[2];

    var cmin = Math.min(r,g,b);
    var cmax = Math.max(r,g,b);
    var delta = cmax - cmin;

    var h = 0;
    var s = 0;
    var l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    
    h = Math.round(h * 60);
        
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [ h, s, l ];
}

Pslib.HSLtoHSB = function( hslArr )
{
    if(!hslArr) return;
    if(!hslArr.length) return;

    var h = hslArr[0];
    var s = hslArr[1] / 100;
    var l = hslArr[2] / 100;

    var nV = l + s * Math.min(l, (1-l));
    var sV = (nV == 0) ? nV : (2 * (1 - (l/nV))); 

    return [ h, sV*100, nV*100 ];
}

Pslib.HSBtoRGB = function( hsbArr )
{
    var hslArr = Pslib.HSBtoHSL(hsbArr);
    return Pslib.HSLtoRGB(hslArr);
}

Pslib.HSBtoHSL = function( hsbArr, convert )
{
    if(!hsbArr) return;
    if(!hsbArr.length) return;

    var h = hsbArr[0];
    var s = hsbArr[1] / 100;
    var b = hsbArr[2] / 100;

    var l = b * (1 - s/2);
    var nS = (l == 0 || l == 1) ? 0 : ((b - l) / Math.min(l, 1-l));

    return [ h, nS*100, l*100 ];
}

Pslib.HSLtoRGB = function( hslArr )
{
    if(!hslArr) return;
    if(!hslArr.length) return;

    var h = hslArr[0];
    var s = hslArr[1];
    var l = hslArr[2];

    s /= 100;
    l /= 100;
    
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c/2;
    var r = 0;
    var g = 0;
    var b = 0;

    if (0 <= h && h < 60)
    {
        r = c; 
        g = x; 
        b = 0;  
    } 
    else if (60 <= h && h < 120)
    {
        r = x; 
        g = c; 
        b = 0;
    }
    else if (120 <= h && h < 180)
    {
        r = 0; 
        g = c; 
        b = x;
    } 
    else if (180 <= h && h < 240)
    {
        r = 0; 
        g = x; 
        b = c;
    } 
    else if (240 <= h && h < 300)
    {
        r = x; 
        g = 0; 
        b = c;
    }
    else if (300 <= h && h < 360)
    {
        r = c; 
        g = 0; 
        b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return [ r, g, b ];
}

//
//
//


// layer palette item color 
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

//
//
//
// ScriptingListener plugin 
Pslib.activateScriptingListener = function()
{
	if(Pslib.isPhotoshop)
	{
		try
		{
			var d = new ActionDescriptor; 
			d.putBoolean(cTID('Log '), true);
			executeAction(sTID("AdobeScriptListener ScriptListener"), d, DialogModes.NO);
		}
		catch(e)
		{
			var msg = "Error activating ScriptingListener plugin\n\n"; 
			if($.level) { $.writeln(msg+e); }
			alert(msg+e);
		}
	}
}

Pslib.deactivateScriptingListener = function()
{
	if(Pslib.isPhotoshop)
	{
		try
		{
			var d = new ActionDescriptor; 
			d.putBoolean(cTID('Log '), false);
			executeAction(sTID("AdobeScriptListener ScriptListener"), d, DialogModes.NO);
		}
		catch(e)
		{
			var msg = "Error deactivating ScriptingListener plugin\n\n";
			if($.level) { $.writeln(msg+e); }
			alert(msg+e);
		}
	}
}

// only use this if you know what you're doing!
Pslib.runScript = function( scriptFile )
{
	if(!scriptFile) return;
	try
	{
		// if(Pslib.isPhotoshop)
		// {
			if(!(scriptFile instanceof File))
			{
				scriptFile = new File(scriptFile);
			}
			if(!scriptFile.exists) return false;
			$.evalFile (scriptFile);
			return true;
		// }
		// else if(Pslib.isIllustrator)
		// {
		// 	// app.doScript(name, set, false); 
		// }
	}
	catch(e)
	{
		var msg = "Error running script \"" + scriptFile.fsName +"\""; 
		alert(msg+e);
	}
}

// this seems to hang apps 
Pslib.playAction = function( set, name )
{
	if(!set || !name) return;
	try
	{
		if(Pslib.isPhotoshop)
		{
			var idPly = cTID( "Ply " );
			var d = new ActionDescriptor();
			var idnull = cTID( "null" );
			var ref = new ActionReference();
			var idActn = cTID( "Actn" );
			ref.putName( idActn, name );
			var idASet = cTID( "ASet" );
			ref.putName( idASet, set );
			d.putReference( idnull, ref );
			executeAction( idPly, d, DialogModes.NO );
		}
		else if(Pslib.isIllustrator)
		{
			app.doScript(name, set, false); 
		}
	}
	catch(e)
	{
		var msg = "Error playing action \"" + name +"\" from actionset \""+set+"\"\n\n"; 
		alert(msg+e);
	}
}

Pslib.writeActionFileFromString = function( actionSetContentStr, actionSetName, actionName, loadPlayRemove ) //, load, play, remove )
{
	if(!actionSetContentStr || !actionSetName || !actionName) return false;
	// filename is the actual name of the actionset

	if(Pslib.isPhotoshop)
	{
		var f = new File( Folder.temp + "/_temp-PHSP-"+actionSetName+".atn");
		Pslib.writeToFile(f, actionSetContentStr);

		if(loadPlayRemove)
		{
			// app.loadAction(f);
			// Pslib.playAction( set, actionSetName);
			// f.remove();
			// app.unloadAction(actionSetName);
		}
		return true;
	}
	else if(Pslib.isIllustrator)
	{
		var f = new File( Folder.temp + "/_temp-ILST-"+actionSetName+".aia");
		Pslib.writeToFile(f, actionSetContentStr);

		if(loadPlayRemove)
		{
			try{
				app.loadAction(f);
			}catch(e){ alert(e); }

			return;

			// Pslib.playAction( actionSetName, actionName);
			// f.remove();
			// app.unloadAction(actionSetName);
		}
		return true
	}
}


// // some edge cases require you to install an action from file and remove it
// Pslib.runTempActionFromFile = function(  )
// {
// 	if(Pslib.isPhotoshop)
// 	{
// 		// .atn

// 	}
// 	else if(Pslib.isIllustrator)
// 	{
// 		// .aia
// 	}
// }


// // set up document for ui dev
// // executeMenuCommand can hang illustrator! it's best to use an action instead.
// Pslib.setupDocumentForRGBartboards = function( setupDocument )
// {
// 	if(!app.documents.length) return;
// 	var doc = app.activeDocument;

// 	if(Pslib.isIllustrator)
// 	{	
// 		try
// 		{
// 			// these events are not scriptable 
// 			if(doc.documentColorSpace == DocumentColorSpace.CMYK)
// 			{
// 				app.executeMenuCommand("doc-color-rgb");
// 			}

// 			app.executeMenuCommand("ruler");
// 			app.executeMenuCommand("videoruler");

// 			app.executeMenuCommand("raster");

// 			// app.executeMenuCommand("showTransparencyGrid"); // this one fails...?
// 			// set up color profile via string?

// 			if(setupDocument)
// 			{
// 				app.executeMenuCommand("document");
// 			}
			
// 			return true;
// 		}
// 		catch(e)
// 		{
// 			var msg = "Error playing action \"" + name +"\" from actionset \""+set+"\"\n\n"; 
// 			alert(msg+e);
// 		}
// 	}
// }


//
// these may need to live as their own extension 
//

// useful for XMP property dictionary conversion and correspondance, 
// as well as working with XMP struct fields
// bidimensional array to object (expects simple data types by default)
// arr = [ ["name1", "value1"], ["name2", "value2"]]
// returns { name1: "value1", name2: "value2"}
// 
// a unidimensional array should also be supported
// when expecting a object to work with
// arr = [ "name1", "name2", "name3"]
// returns { name1: undefined, name2: undefined, name3: undefined }
Array.prototype.convertToObject = function( allowNullOrUndef, recursive )
{
	if(!this.length) return {};
	var obj = {};

	for(var i = 0; i < this.length; i++)
	{
		var item = this[i];
		var isArray = (item instanceof Array);

		// if array is unidimensional, force value to null
		if(!isArray)
		{
			var property = item;
			obj[property] = null; 
		}
		// bidimensional+
		else if ( isArray )
		{
			var property = this[i][0];

			// safeguard: if not a string, abort
			if(!(typeof property == "string"))
			{
				continue;
			}

			var value = this[i][1];
	
			var isUndef = value == undefined;
			var isNull = value == null;
	
			// if undefined or null, only store if allowed
			if(isUndef || isNull)
			{
				if(allowNullOrUndef)
				{
					obj[property] = value; 
				}
			}
			// recursive object is allowed if recursive arg
			else if(typeof value === "object")
			{
				if(recursive)
				{
					obj[property] = value; 
				}
				continue;
			}
			else
			{
				obj[property] = value; 
			}
		}
	}
	return obj;
}

// simple data types object to bidimensional array
// obj = { name1: "value1", name2: "value2"}
// returns [ ["name1", "value1"], ["name2", "value2"]]
Object.prototype.convertToArray = function( allowNullOrUndef )
{
	if(!this) return [];
	var arr = [];

	for (var key in this)
	{
		// let's not go any further here if function
		if(this[key] instanceof Function)
		{
			continue;
		}
		// watch out for reserved keywords and internal stuff
		else if (key.charAt(0) == '_' || key == "reflect" || key == "Components" || key == "typename")
		{
			continue;			
		}
		else
		{
			var property = key;
			var value = this[key];

			var isUndef = value == undefined;
			var isNull = value == null;
			if(isUndef || isNull)
			{
				if(allowNullOrUndef)
				{
					arr.push( [ property, value ] );
				}
			}
			else
			{
				arr.push( [ property, value ] );
			}
		}
	}

	return arr;
}

// swap property names when found in bidimensional/tridimensional array
// affects first item for each set, a third item is allowed, may be useful for presentation purposes
//
// var originalArr = [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ];
// var converterArr = [ [ "source", "gitUrl" ], [ "destination", "relativeExportLocation" ] ]; 
// var newArr =  originalArr.convertTags(converterArr); // yields [ [ "gitUrl", "~/file.psd"], [ "range", "1-8"], [ "relativeExportLocation", "./images"] ];
//
// then convert back with reversed flag, and content should match precisely
// var reconvertedArr = newArr.convertTags(converterArr, true); // yields [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ]
Array.prototype.convertTags = function( converter, reversed )
{
	if(!this) return [];
	var newArr = [];

	for(var i = 0; i < this.length; i++)
	{
		var item = this[i];
		var matched = false;

		for(var j = 0; j < converter.length; j++)
		{
			var convItem = converter[j];
			if(item[0] == (reversed ? convItem[1] : convItem[0]))
			{
				var newItem = reversed ? [ convItem[0], item[1] ] : [ convItem[1], item[1] ];
				if(item.length == 3) newItem.push( item[2] );
				newArr.push( newItem );

				matched = true;
				break;
			}
		}
		if(!matched) newArr.push( item );
	}

	return newArr;
}



//
//
// these are mirrored from JSUI if not included along with Pslib
if(typeof JSUI !== "object")
{
	// only if JSON lib present
	if(typeof JSON === "object")
	{
		Object.prototype.isEmpty = function()
		{
			return JSON.stringify(this) === '{\n\n}';
		}
	}

	String.prototype.trim = function()
	{
		return this.replace(/^[\s]+|[\s]+$/g,'');
	}

	Number.prototype.isMultOf = function(m)
	{
		if(m == undefined || isNaN(m))
		{
			return;
		}
		var n = this.valueOf();
		return (Math.ceil(n/m) * m == n);
	};

	// get extension pattern ".ext"
	String.prototype.getFileExtension = function()
	{
		var match = this.trim().match(/\.[^\\.]+$/);
		return match != null ? match[0].toLowerCase() : null; // null if no match
	};

	// boolean indicating if string contains a ".ext" pattern
	String.prototype.hasFileExtension = function()
	{
		return this.getFileExtension() != null;
	};


	// Lack of support for Set()/Array.filter() calls for hacks
	Array.prototype.indexOf = function(element)
	{
		for(var i = 0; i < this.length; i++)
		{
			if(this[i] == element) return i;
		}
		return -1;
	};
	
	// prototyping Array.map() functionality
	Array.prototype.map = function(callback) {
		var arr = [];
		for (var i = 0; i < this.length; i++)
			arr.push(callback(this[i], i, this));
		return arr;
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

