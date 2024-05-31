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

	(0.68)
	- several undocumented functions
	- experimenting with XMP ordered array to sync individual arbitrary tags/properties to document
	- syncing is not fast enough to be associated with a document or selection event, it should be specifically invoked when needed
	- Pslib.getLayerReferenceByID() can fetch complex information such as smartobject transform and XMP properties without actually selecting layer objects


	KNOWN BUGS
	- rangesArray method duplicating last index if is active artboard and/or last in array or range (?)
*/



if (typeof Pslib !== "object") {
    Pslib = {};
}

// library version
Pslib.version = 0.85;

Pslib.isPhotoshop = app.name == "Adobe Photoshop";
Pslib.isIllustrator = app.name == "Adobe Illustrator";
Pslib.isInDesign = app.name == "Adobe InDesign";
Pslib.isBridge = app.name == "Adobe Bridge";

Pslib.isWindows = $.os.match(/windows/i) == "Windows";
Pslib.isPs64bits = Pslib.isPhotoshop ? (Pslib.isWindows ? BridgeTalk.appVersion.match(/\d\d$/) == '64' : true) : false; // macOS assumed x64
Pslib.isx64version = Pslib.isWindows ? BridgeTalk.appVersion.match(/\d\d$/) == '64' : true;

if(Pslib.isPhotoshop)
{
	// these functions are often required when working with code obtained using the ScriptingListener plugin
	cTID = function(s) {return app.charIDToTypeID(s);}
	sTID = function(s) {return app.stringIDToTypeID(s);}
	tSID = function(t) {return app.typeIDToStringID(t);}

	// Pslib.optimizeScriptingListenerCode = function()
	// {
	// 	Pslib.playAction("ScriptListener", "SLCFix");
	// }

	// 
	function selectByID(id, add) {
		Pslib.selectLayerByID(id, add);
	};
	
	// from xbytor
	function getActiveLayerID() {
		Pslib.getActiveLayerID();
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
			// if($.level) $.writeln("EXCEPTION: ", e);
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
				// if($.level) $.writeln("Error parsing generator.js");
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
            // if($.level) $.writeln("Error getting specs for arboard " + layer.name + " \n\n" + e); 

            // force minimal specs / document W x H
            obj.x = 0;
            obj.y = 0;
            obj.width = doc.width.as("px");
            obj.height = doc.height.as("px");
        }
            
        obj.parent = doc.name;
        obj.parentFullName = parentFullName.toString();

    	// get object-level XMP

        var dictionary = Pslib.getXmpDictionary( layer.id, { assetID: null, source: null, hierarchy: null, specs: null, custom: null }, false, false, false, namespace ? namespace : Pslib.XMPNAMESPACE);
      
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


        // if($.level) $.writeln("LayerID " + obj.index + ": " + obj.name + " (w:" + obj.width +" h:" + obj.height + ") (x:" + obj.x +" y:" + obj.y + ")" ); //"  rect: " + obj.artboardRect);
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
	tSID = function(){};

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
Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "customMips", null ], [ "nineSlice", null ], [ "profile", null ] ];
// Pslib.storedAssetPropertyNamesArr = [ "assetName", "assetArtboardID", "assetID", "customMips" ];
Pslib.storedAssetPropertyNamesArr = [ "name", "id", "assetID", "customMips", "nineSlice", "profile" ];
Pslib.assetKeyConversionArr = [ [ "assetID", "aid" ], [ "assetName", "name" ], [ "index", "page" ] ]; // conflicts with .id and .index

// required qualifiers (artboard not considered for syncing if assetID not present)
// Pslib.requiredAssetQualifiers = [ [ "assetID", null ] ];
Pslib.requiredAssetQualifiers = Pslib.assetKeyValuePairs;

// #############  PER-LAYER METADATA FUNCTIONS

// default namespace
Pslib.XMPNAMESPACE = "http://www.geeklystrips.com/";
Pslib.XMPNAMESPACEPREFIX = "gs:";

Pslib.SECONDARYXMPNAMESPACE = "http://www.geeklystrips.com/second/";
Pslib.SECONDARYXMPNAMESPACEPREFIX = "gss:";

// Pslib.THIRDXMPNAMESPACE = "http://www.geeklystrips.com/third/";
// Pslib.THIRDXMPNAMESPACEPREFIX = "gst:";

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

// if Photoshop-version specific colors
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
	if(ExternalObject.AdobeXMPScript == undefined)
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
	// if ExternalObject.AdobeXMPScript not present, hardcode namespace to exif
	Pslib.XMPNAMESPACE = "http://ns.adobe.com/exif/1.0/";
}

// load XMP
Pslib.loadXMPLibrary = function()
{
   if (!ExternalObject.AdobeXMPScript)
   {
      try
	{
        //  if($.level) $.writeln("Loading XMP Script Library");
         ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	  return true;
      }
	catch (e)
	{
        //  if($.level) $.writeln("Error loading XMP Script Library\n" + e);
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
	//    if($.level) $.writeln("Unloading XMP Script Library");
         ExternalObject.AdobeXMPScript.unload();
         ExternalObject.AdobeXMPScript = undefined;
	   return true;
      }
      catch(e)
      {
        //  if($.level) $.writeln("Error unloading XMP Script Library\n" + e);
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
				// if given number as target instead of Document or Layer object, 
				// assume Layer ID and use faster method
				if(typeof target == "number") 
				{
					xmp = Pslib.getXmpByID( target );
				}
				else
				{
					xmp = new XMPMeta(target.xmpMetadata.rawData );
				}
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
			// if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\"");
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
			// if($.level) $.writeln("Metadata property could not be deleted from target \"" + target.name + "\"");
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

			if(Pslib.isPhotoshop) { if(typeof target == "number") Pslib.setXmpByID(target, xmp.serialize()); else target.xmpMetadata.rawData = xmp.serialize(); }
			else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
				
			return true;
		}
		catch( e )
		{
			// if($.level) $.writeln("Metadata properties could not be removed from target \"" + target.name + "\"");
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
// if target XMPMeta, 
Pslib.setXmpProperties = function (target, propertiesArray, namespace)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var target = (target == undefined ? ( Pslib.isIllustrator ? app.activeDocument : app.activeDocument.activeLayer) : target);
		var prop;
		var val;
		var xmp;

		var isXmpMetaObj = target instanceof XMPMeta;
		
		if(isXmpMetaObj)
		{
			xmp = target;
		}
		else
		{
			// access metadata
			try
			{
				if(Pslib.isIllustrator || Pslib.isPhotoshop )
				{
					xmp = Pslib.getXmp(target);
				}
				else if(Pslib.isInDesign)
				{
					xmp = target.metadataPreferences;
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
	   
		}

		// loop through array properties and assign them
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
				}
				// if property found and value different, update
				else if(propertyExists && decodeURI(xmp.getProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop).toString()) != val.toString() )
				{
					xmp.setProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop, val);
				}
			} 
			catch( e )
			{
				var msg = "Could not place metadata property on provided target.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			    return false;
			}
		}

		if(!isXmpMetaObj)
		{
			// apply and serialize
			if(Pslib.isPhotoshop) { if(typeof target == "number") Pslib.setXmpByID(target, xmp.serialize()); else target.xmpMetadata.rawData = xmp.serialize(); }
			else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
			else if(Pslib.isInDesign) target.metadataPreferences = xmp.serialize();
			// if($.level) $.writeln("Provided properties were successfully added to object \"" + target.name + "\"");
		}

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

		var isXmpMetaObj = target instanceof XMPMeta;
		
		if(isXmpMetaObj)
		{
			xmp = target;
			foundXMP = true;
		}
		else
		{
			try
			{
				xmp = Pslib.getXmp(target);
				foundXMP = true;
			} catch( e ) 
			{
				xmp = new XMPMeta(  );
			}
		}

		if(foundXMP)
		{
			for (var i = 0; i < propertiesArray.length; i++)
			{	
				prop = propertiesArray[i][0];
				val = undefined;
				
				try
				{
					var propertyExists = xmp.doesPropertyExist(namespace ? namespace : Pslib.XMPNAMESPACE, prop);
					
					if(propertyExists)
					{
						val = decodeURI(xmp.getProperty(namespace ? namespace : Pslib.XMPNAMESPACE, prop));
						updatedArray.push([propertiesArray[i][0], val]);
					}
					else
					{
						updatedArray.push([propertiesArray[i][0], null]);
					}
				} 
				catch( e )
				{

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

		if(Pslib.isPhotoshop && (typeof target == "number"))
		{
			xmp = Pslib.getXmpByID( target );
		}
		else
		{
			if(target instanceof XMPMeta)
			{
				xmp = target;
			}
			else
			{
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
			}
		}

		if(Pslib.isInDesign)
		{
			if ( xmp === undefined )
			{
				// if($.level) $.writeln("XMP metadata could not be found for target \"" + target.name + "\".\nCreating new XMP metadata container.");
				return null;
			}
		}
	
		// XMPConst.ITERATOR_JUST_CHILDREN	XMPConst.ITERATOR_JUST_LEAFNODES	XMPConst.ITERATOR_JUST_LEAFNAMES	XMPConst.ITERATOR_INCLUDE_ALIASES
		var xmpIter = xmp.iterator(XMPConst.ITERATOR_JUST_CHILDREN, namespace ? namespace : Pslib.XMPNAMESPACE, "");
		var next = xmpIter.next();

		// if($.level) $.writeln("\nGetting list of XMP properties for XMP namespace " + (nsprefix ? nsprefix : Pslib.XMPNAMESPACEPREFIX) + "\n");
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

// "lighter" version of Pslib.getPropertiesArray()
// 	can deal with existing xmp object instead of getting it from a target
// 		- assumes simple strings, numbers or booleans (return array of formatted objects)
// 		- TODO: support strings with limited special characters, AKA instance of stFnt:versionString, with ";" as delimiter
// 		<stFnt:versionString>Version 2.106;PS 2.000;hotconv 1.0.70;makeotf.lib2.5.58329</stFnt:versionString>
Pslib.getAllNsPropertiesArray = function (xmp, namespace, asObj, sortByPropertyName)
{
	// TODO: update for XMPMeta Object suppport
	if(!xmp) xmp = Pslib.getXmp(app.activeDocument, false);
	if(!xmp) return;
	// if(!namespace) namespace = Pslib.SECONDARYXMPNAMESPACE;
	if(!namespace) namespace = Pslib.XMPNAMESPACE;
	var nsprefix = XMPMeta.getNamespacePrefix(namespace);
	if(!nsprefix) return [];

	// get existing array from dedicated namespace
	var existingProperties = [];

	var xmpIter = xmp.iterator(XMPConst.ITERATOR_JUST_CHILDREN, namespace, "");
	var next = xmpIter.next();

	while (next)
	{
		var propName = next.path.replace( nsprefix, "" ); 
		var propValue = decodeURI(next);

		// if properties were added by a visual editor, 
		// it's likely we have %20 and %2520 weirdness in the mix
		var hasEncodedSpace = propValue.match("%20");
		var hasEncodedDblQuote = propValue.match("%22");
		var hasEncodedPercent = propValue.match("%25");

		if(hasEncodedSpace || hasEncodedDblQuote || hasEncodedPercent)
		{
			var doubleDecoded = decodeURI(propValue);
			propValue = doubleDecoded;
		}

		var obj = {};
		if(asObj)
		{
			// sanitize property names for JSON format
			var linePropertiesArr = propValue.split(",");
			var semiColumn = false;

			// at this point if linePropertiesArr is empty, try with ";" delimiter
			if(!linePropertiesArr.length)
			{
				linePropertiesArr = propValue.split(";");
				semiColumn = linePropertiesArr.length > 0;
			}

			if(semiColumn && asObj)
			{
				obj[propName] = linePropertiesArr;
			}

			for(var i = 0; i < linePropertiesArr.length; i++)
			{

				if(semiColumn && asObj)
				{
					continue;
				}

				var propItem = linePropertiesArr[i];
				var itemArr = semiColumn ? propItem.split(" ") : propItem.split(":");

				if(itemArr.length == 1 && !asObj)
				{
					obj[propName] = propValue;
					continue;
				}

				var hasItemArrInd0 = (itemArr.length > 0) ? (itemArr[0] != undefined) : false;
				var itemProp = hasItemArrInd0 ? itemArr[0].trim() : propName;
				
				var hasItemArrInd1 = (itemArr.length > 1) ? (itemArr[1] != undefined) : false;
				var itemValue = propValue;
				try
				{
					var itemValue = semiColumn ? (hasItemArrInd1 ? itemArr[1].trim() : itemProp) : itemArr[1].trim();
				}
				catch(e)
				{
					var itemValue = propValue;
				}

				if(itemProp != undefined && itemValue != undefined)
				{
					// silently add quotes for JSON formatting
					// supports strings, numbers and booleans (no arrays at this level)
					itemProp = "\""+itemProp+"\"";
					var valAsNum = Number(itemValue);

					// safeguard for actual value of zero stored as string!
					if(itemValue === "0")
					{
						itemValue = 0;
					}
					else
					{
						var valIsNum = itemValue != 0 ? !isNaN(valAsNum) : false;
						var valLower = (typeof itemValue == "string") ? itemValue.toLowerCase() : "";
						var valIsBool = valLower == "true" || valLower == "false";
						itemValue = valIsNum ? valAsNum : (valIsBool ? valLower == "true" : itemValue);
					}

					// force fix specific forms of double quotes left in there
					itemProp = itemProp.replace(/\"\"/g, "\"");
					itemProp = itemProp.replace(/\\\""/g, "\"");
					itemProp = itemProp.replace(/\"/g, "");
					if(!valIsNum && !valIsBool)
					{
						itemValue = itemValue.replace(/\"\"\"/g, "\"");
						itemValue = itemValue.replace(/\"\"/g, "\"");
						itemValue = itemValue.replace(/\\\""/g, "\"");

						if(asObj)
						{
							itemValue = itemValue.replace(/\"\\\""/g, "");
							itemValue = itemValue.replace(/\\\"\""/g, "");
						}
					}

					if(asObj) obj[itemProp] = itemValue;
				}
				else
				{
					if(asObj) obj[itemProp] = itemValue;
				}
			}
		}
		
		existingProperties.push( asObj ? obj : [propName, propValue]);
		next = xmpIter.next();
	}

	// option for sorting?
    if(sortByPropertyName) existingProperties = existingProperties.sort( sortByPropertyName );
	return existingProperties;
}


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

	var isXmpMetaObj = target instanceof XMPMeta;

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

    // fetch XMP values -- automatically handles getting XMP via layer ID
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
		
		if(Pslib.isPhotoshop)
		{
			// if metadata found, replace by empty packet
			var emptyXmp = new XMPMeta();
			if(typeof target == "number")
			{
				Pslib.setXmpByID(target, emptyXmp.serialize());
			}
			else
			{
				target.xmpMetadata.rawData = xmp.serialize();
			}
		}
			
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


// namespace conversion (document or target)
Pslib.swapXmpNamespace = function( target, ns, prefix, newNs, newPrefix, silent )
{
    if(!app.documents.length) return;
    if(!target) target = app.activeDocument;

    // may have to eventually check for document filetype?
    var xmp = Pslib.getXmp( target, false );

    // dump namespace collection to string
    // var namespaces = XMPMeta.dumpNamespaces();

    // cheap version: directly replace tags from XMP string!
    var allPreviousProperties = Pslib.getAllNsPropertiesArray(xmp, ns, false);
    var allNewProperties = Pslib.getAllNsPropertiesArray(xmp, newNs, false);

    // if nothing to convert, return as is
    // if(!allPreviousProperties.length)
    if(!allPreviousProperties.length)
    {
       if(!silent) JSUI.alert(ns + "\n\nNo properties belonging to this namespace found to work with!");
        return false;
    }

	// if properties belonging to both namespaces are found, warn user
	if( allPreviousProperties.length && allNewProperties.length )
	{
		if(!silent) 
		{
			// here we could validate that there are no matches
			var conflicts = [];

			for (var i = 0; i < allPreviousProperties.length; i++)
			{
				var pproperty = allPreviousProperties[i][0];

				for (var n = 0; n < allNewProperties.length; n++)
				{
					var nproperty = allNewProperties[n][0];
					if(pproperty == nproperty)
					{
						conflicts.push(pproperty);
					}
				}
			}

			if(conflicts.length)
			{
				var ns1PropertiesStr = ns + "\n  "+prefix +" "+ allPreviousProperties.join("\n  "+prefix+" ");
				var ns2PropertiesStr = newNs + "\n  "+newPrefix +" "+ allNewProperties.join("\n  "+newPrefix+" ");
				var confirmMsg = "Existing properties found for both namespaces.\nProceed?\n\n" + ns1PropertiesStr + "\n\n" + ns2PropertiesStr;
				var confirmObj = { message: confirmMsg, label: "Merge", title: "Potential Namespace Conflict" };
				if(!JSUI.confirm( confirmObj ))
				{
					return false;
				}

				var confirmKeepNewNSmsg = "Accept new?";
				var confirmKeepObj = { message: confirmKeepNewNSmsg, label: "Keep New", title: "Confirm" }
				if(JSUI.confirm( confirmKeepObj ))
				{
					// remove original conflicting properties to keep new
					for(var i = 0; i < conflicts.length; i++)
					{
						xmp.deleteProperty(ns, conflicts[i]);
						// JSUI.quickLog("deleted "+prefix+conflicts[i]);
					}
				}
				else
				{
					// remove new conflicting properties to keep older ones
					for(var i = 0; i < conflicts.length; i++)
					{
						xmp.deleteProperty(newNs, conflicts[i]);
						// JSUI.quickLog("deleted "+newPrefix+conflicts[i]);
					}
				}

			}
		}
		else
		{
			return false;
		}
	}

	if(allPreviousProperties.length)
	{
		var xmpStr = xmp.serialize();

		var xmlnsDef = 'xmlns:'+prefix.replace(':', '')+'=\"'+ns+'\"';
		var openingTag = '<'+prefix;
		var closingTag = '</'+prefix;

		var hasDefinition = (xmpStr.match(xmlnsDef) != null);
		var hasOpeningTag = xmpStr.match(openingTag) != null;
		var hasClosingTag = xmpStr.match(closingTag) != null;

		if(hasDefinition)
		{
			var defMatch = new RegExp( xmlnsDef, 'g' );
			xmpStr = xmpStr.replace(defMatch, 'xmlns:'+newPrefix.replace(':', '')+'=\"'+newNs+'\"');

			if(hasOpeningTag && hasClosingTag)
			{
				var openingTagMatch = new RegExp( openingTag, 'g' );
				xmpStr = xmpStr.replace(openingTagMatch, '<'+newPrefix);

				var closingTagMatch = new RegExp( closingTag, 'g' );
				xmpStr = xmpStr.replace(closingTagMatch, '</'+newPrefix);
			}

			// JSUI.quickLog(xmpStr);
			xmp = new XMPMeta(xmpStr);
			if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
			else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
		}
	}
    else
    {
        if(!silent) JSUI.alert(newNs + "\n\nNamespace already present in target XMP.\nResolve any existing conflicts and try again.");
        return false;
    }
    
    // var allNsProperties = Pslib.getAllNsPropertiesArray(xmp, ns, false);
    // JSUI.quickLog(allNsProperties);

    // should also account for layer-based XMP

        // check definitions

        // check for collisions with root properties
 
        // if any collision detected, show user?

    // make sure to register new namespace
        // XMPMeta.registerNamespace(newNs, newPrefix);


    // safer version: get list of existing properties

    // once done, delete original namespace
    // XMPMeta.deleteNamespace (namespaceURI)

    return xmp;
}

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
			// if($.level) $.writeln(msg + "\n" + e);
			else alert(msg + "\n" + e);
			return false;
		}
	   
		var path = path == undefined ? File.saveDialog() : path;
		if(path != null)
		{
		   var file = new File(path);

		if(file.exists)
		{
			// if($.level) $.writeln("\nFile already present. Prompting user for permission to replace.");
			// if file exists, present the user with the option to replace it
			if(confirm ("Do you wish to overwrite this file?\n\n" + file.fsName, true, "Replace file?"))
			{
				try
				{
					// if($.level) $.writeln("Removing file:\n" + file.fsName );
					file.remove();	
				}
				catch(e)
				{
					// if($.level) $.writeln("\nCould not remove file. Please verify that it is not open by a different process.");
					return false;
				}
			}
			else
			{
				// if($.level) $.writeln("User opted not to replace the file.");
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
			// if($.level) $.writeln("Adding: " + pair[0] + "," + pair[1]);
			propertiesArray.push([pair[0], pair[1] ]);
		}
	}
	
	if(propertiesArray.length)
	{
		success = Pslib.setXmpProperties(target, propertiesArray, namespace ? namespace : Pslib.XMPNAMESPACE);
	}
	return success;
};

// get full document path
// if document not saved yet, control for a default system location
//  docFullPath.toString().match(app.path) != null
Pslib.getDocumentPath = function(doc)
{
	if(!app.documents.length) return;
	if(!doc) doc = app.activeDocument;
	if(app.activeDocument != doc) app.activeDocument = doc;

	var docFullPath;
	var matchesSystem = false;

	if(Pslib.isPhotoshop)
	{
		try
		{
			// this returns the full active document path without building a histogram 
			// (also bypasses 'document not saved' exception)

			var r = new ActionReference();
			r.putProperty(cTID('Prpr'), cTID('FilR'));
			r.putEnumerated(cTID('Dcmn'), cTID('Ordn'), cTID('Trgt'));
			var d = executeActionGet(r);

			docFullPath = d.hasKey(cTID('FilR')) ? d.getPath(cTID('FilR')) : undefined;
		}
		catch(e)
		{

		}
	}
	else if(Pslib.isIllustrator)
	{
		// var doc = doc != undefined ? doc : app.activeDocument;
		// if(app.activeDocument != doc) app.activeDocument = doc;

		docFullPath = doc.fullName; // check for file object?
		matchesSystem = docFullPath.toString().match( app.path) != null;

		// return matchesSystem ? undefined : docFullPath;
	}
	else if(Pslib.isInDesign)
	{
		try
		{
			docFullPath = doc.fullName;
			matchesSystem = docFullPath.toString().match( app.path ) != null;
		}
		catch(e){}

		// return matchesSystem ? undefined : docFullPath;
	}

	// control for anything that isn't a File Object
	if( typeof docFullPath == "object" )
	{
		if( !(docFullPath instanceof File) )
		{
			return undefined;
		}
	}

	// return matchesSystem ? undefined : docFullPath;
	return docFullPath;
}

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
// 		itemValueStr is needed because only having qualifiers seems to make an array invalid (?)
Pslib.setOrderedArray = function (xmp, propName, arr, namespace, secondaryNamespace, itemValueStr)
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

	// xmp.setProperty(namespace, propName, null, XMPConst.ARRAY_IS_ALTERNATIVE);
	xmp.setProperty(namespace, propName, null, XMPConst.ARRAY_IS_ORDERED);
	if($.level) $.writeln( "\n<"+prefix+propName+">\n  <rdf:Seq/>" ); 

	for(var i = 0; i < arr.length; i++)
	{
		// if item does not have a *value*, the entire array may be considered invalid and be ignored
		// var artboardNameStr = "Artboard" + ab.id.toString().zeroPad(3);
		// var contentStr = "id:"+ab.id+","+( Pslib.isIllustrator ? "page:"+(ab.id+1)+"," : "" )+"name:"+ab.name;
		var contentStr = "";
		var resetValueStr = false;
		if(itemValueStr == undefined)
		{
			resetValueStr = true;
			contentStr += "item:"+(i+1);

			// in order for the placeholder info to exist, we must iterate through qualifiers array 
			// before the .appendArrayItem() operation
	
			for(var j = 0; j < arr[i].length; j++)
			{
				var subArr = arr[i][j];
				var qualifier = subArr[0];
				var value = subArr[1];
				
				if(value != undefined)
				{
					contentStr += ","+qualifier+":"+value;
					if(qualifier == "id")
					{
						if(Pslib.isIllustrator)
						{
							contentStr += ",page:"+(value+1);
						}
					}
				}
			}
			itemValueStr = contentStr;
		}
		else
		{
			// contentStr = itemValueStr;
		}

		xmp.appendArrayItem(namespace, propName, itemValueStr); 
		if($.level) $.writeln( "    <rdf:li rdf:parseType=\"Resource\">\n      <rdf:value>"+itemValueStr+"</rdf:value>" );

		if(resetValueStr) itemValueStr = undefined;

		for(var j = 0; j < arr[i].length; j++)
		{
			var subArr = arr[i][j];
			var qualifier = subArr[0];
			var value = subArr[1];

			// ignore if width, height, x or y
			if(qualifier == "width" || qualifier == "height" || qualifier == "x" || qualifier == "y")
			{
				continue;
			}

			xmp.setQualifier(namespace, propName+'['+(i+1)+']', secondaryNamespace, qualifier, value);
			if($.level) $.writeln( "      <"+secondaryPrefix+qualifier+">"+value+"</"+secondaryPrefix+qualifier+">" );

			// if(qualifier == "id")
			// {
			// 	if(Pslib.isIllustrator)
			// 	{
			// 		// contentStr += ",page:"+(value+1);
			// 		xmp.setQualifier(namespace, propName+'['+(i+1)+']', secondaryNamespace, "page", (value+1));
			// 		if($.level) $.writeln( "      <"+secondaryPrefix+"page>"+(value+1)+"</"+secondaryPrefix+"page>" );
			// 	}
			// }
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

	// required qualifiers
    if(!obj.requiredQualifiers) obj.requiredQualifiers = Pslib.requiredAssetQualifiers; // default:  [ [ "assetID", null ] ];
    if(!obj.converter) obj.converter = Pslib.assetKeyConversionArr; // default is empty array, no conversion
    if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
	// if(!obj.secondaryNamespace) obj.secondaryNamespace = Pslib.SECONDARYXMPNAMESPACE;
	if(!obj.secondaryNamespace) obj.secondaryNamespace = obj.namespace;

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
                // if(artboardObj.name) itemArr.push(["assetName", artboardObj.name]);
                // if(artboardObj.id) itemArr.push(["assetArtboardID", artboardObj.id]);
				// *** simplifying for readability / merging with inherent artboard coordinates properties
                if(artboardObj.name) itemArr.push(["name", artboardObj.name]);
                if(artboardObj.id) itemArr.push(["id", artboardObj.id]); // PHSP: persistent Layer ID for artboard (local to document)   ILST: artboard index (zero-based, likely changes often)

				// passively push width, height, x & y 
				// these should not end up as qualifiers, so we will have to ignore them on the other side
				if(artboardObj.width != undefined) itemArr.push(["width", artboardObj.width]);
				if(artboardObj.height != undefined) itemArr.push(["height", artboardObj.height]);
				if(artboardObj.x != undefined) itemArr.push(["x", artboardObj.x]);
				if(artboardObj.y != undefined) itemArr.push(["y", artboardObj.y]);

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

    // reorder array based on value of property "assetArtboardID"
    // seqArrayItems = seqArrayItems.sort( Pslib.compareArtboardID );
    seqArrayItems = seqArrayItems.sort( Pslib.compareId );

    if(seqArrayItems.length)
    {
        // JSUI.quickLog("Pushing " + seqArrayItems.length + " item"+(seqArrayItems.length > 1 ? "s" : "")+" to \"" + obj.arrNameStr + "\"");
        obj.xmp = Pslib.setOrderedArray(obj.xmp, obj.arrNameStr, seqArrayItems, obj.namespace, obj.secondaryNamespace); //, "artboard");
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
	// if(!obj.secondaryNamespace) obj.secondaryNamespace = Pslib.SECONDARYXMPNAMESPACE;
	if(!obj.secondaryNamespace) obj.secondaryNamespace = obj.namespace;
    if(!obj.getObjBool) obj.getObjBool = false;

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
        // if($.level) $.writeln("\n"+obj.arrNameStr+"["+i+"]"); 
        for(var j = 0; j < obj.arr.length; j++)
        {
            var qualifier = (obj.arr[j] instanceof Array) ? obj.arr[j][0] : obj.arr[j];
			var value = obj.xmp.getQualifier(obj.namespace, obj.arrNameStr+"["+i+"]", obj.secondaryNamespace, qualifier).toString();
            value = decodeURI(value);
			// this makes sure an empty string is not returned as zero after auto-typing
			value = Pslib.autoTypeDataValue(value, false, false); // empty string allowed, null not allowed 

            if( value != undefined)
            {
				if( (value != "undefined") && (value != "null"))
				{
					// if($.level) $.writeln("  "+qualifier+": " + value); // + "  " + (typeof value)); 

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

// get <xmpTPg:Fonts> bag as array
Pslib.getDocFonts = function( xmp )
{
	if(Pslib.isIllustrator)
	{
		if(!xmp) xmp = Pslib.getXmp(app.activeDocument);

		var property = "Fonts";
		var property_NS = "http://ns.adobe.com/xap/1.0/t/pg/"; // "xmpTpg:"
		var qualifier_NS = "http://ns.adobe.com/xap/1.0/sType/Font#"; // "stFnt:"
		var qualifiers = [ "fontName", "fontFamily", "fontFace", "fontType", "versionString", "composite", "fontFileName" ];

		var arr = Pslib.getLeafNodesArr(xmp, property_NS, property, qualifier_NS, qualifiers);

		return arr;
	}
}

// get <xmpTPg:SwatchGroups> seq of nested structs as array
Pslib.getDocSwatches = function( xmp )
{
	if(Pslib.isIllustrator)
	{
		if(!xmp) xmp = Pslib.getXmp(app.activeDocument);

		var property = "SwatchGroups";
		var property_NS = "http://ns.adobe.com/xap/1.0/t/pg/"; // "xmpTpg:"
		var qualifier_NS = "http://ns.adobe.com/xap/1.0/g/"; // "xmpG:"
		
		//  should account for "cyan", "magenta", "yellow", "black"
		var qualifiers = [ "groupName", "groupType", ["Colorants", ["swatchName", "mode", "type", "tint", "red", "green", "blue" ]] ]; 
		var arr = Pslib.getLeafNodesArr(xmp, property_NS, property, qualifier_NS, qualifiers);

		return arr;
	}
}

// get <xmpMM:Manifest> linked/placed items as array
Pslib.getDocPlacedItems = function( xmp )
{
	if(!xmp) xmp = Pslib.getXmp(app.activeDocument);
	var arr = [];

	// "Ingredients" bag: placed items
	var property = "Ingredients"; 
	var property_NS = "http://ns.adobe.com/xap/1.0/mm/"; // "xmpMM:"
	var qualifier_NS = "http://ns.adobe.com/xap/1.0/sType/ResourceRef#"; // "stRef:"
	var qualifiers = [ "linkForm", "filePath", "DocumentID" ];

	var arr = Pslib.getLeafNodesArr(xmp, property_NS, property, qualifier_NS, qualifiers);

	if(Pslib.isPhotoshop)
	{
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
	else if(Pslib.isIllustrator)
	{
		// xmpMM:Manifest
			// stMfs:linkForm>
				// stMfs:reference

		property = "Manifest"; 
		property_NS = "http://ns.adobe.com/xap/1.0/mm/"; // "xmpMM:"
		qualifier_NS = "http://ns.adobe.com/xap/1.0/sType/ManifestItem#"; // "stMfs:"
		qualifiers = [ "filePath", "documentID", "instanceID" ]; // if documentID and instanceID are both 0, file is fully embedded (?)

		//  this will need to be adapted for custom structs
		var manifestArr = Pslib.getLeafNodesArr(xmp, property_NS, property, qualifier_NS, qualifiers);
		for(var i = 0; i < manifestArr.length; i++)
		{
			arr.push(manifestArr[i]);
		}

		return arr;
	}
}

// get <photoshop:TextLayers> bag as array of objects
Pslib.getDocTextLayers = function( xmp )
{
	if(Pslib.isPhotoshop)
	{
		if(!xmp) xmp = Pslib.getXmp(app.activeDocument);

		var property = "TextLayers"; 
		var property_NS = "http://ns.adobe.com/photoshop/1.0/"; // "photoshop:"
		var qualifier_NS = property_NS; // "photoshop:"
		var qualifiers = [ "LayerName", "LayerText" ];
	
		var arr = Pslib.getLeafNodesArr(xmp, property_NS, property, qualifier_NS, qualifiers);
	
		return arr;
	}
}

// // convert list of bidimensional qualifiers-value arrays to individual objects from XMP
// // getting fonts listed in illustrator document XMP
// // var xmp = Pslib.getXmp(app.activeDocument);
// // var property = "Fonts";
// // var xmpTpg_NS = "http://ns.adobe.com/xap/1.0/t/pg/";
// // var stFnt_NS = "http://ns.adobe.com/xap/1.0/sType/Font#";
// // var qualifiers = [ "fontName", "fontFamily", "fontFace", "fontType", "versionString", "composite", "fontFileName" ]; // if you don't HAVE the structure definition, forget it!

// // var fontsObj = Pslib.getLeafNodesObj(xmp, xmpTpg_NS, property, stFnt_NS, qualifiers);

// Pslib.getLeafNodesObj = function(xmp, ns, property, leafNs, qualifiersArr)
// {
// 	if(!xmp) return;
// 	if(!ns) return;
// 	if(!property) return;
// 	if(!leafNs) return;
// 	if(!qualifiersArr) return;

// 	var arr = Pslib.getLeafNodesArr(xmp, ns, property, leafNs, qualifiersArr);
// 	var objArr = [];
// 	// JSUI.quickLog(arr);

// 	for(var i = 0; i < arr.length; i++ )
// 	{
// 		// var obj = {};
// 		var item = arr[i];
		
// 		if(item instanceof Array)
// 		{
// 			var obj = {};    

// 			// // prepare extra array for structs list
// 			// var structsArr = [];

// 			// JSUI.quickLog(i);

// 			for(var a = 0; a < item.length; a++ )
// 			{           
// 				// var obj = {};     
// 				var it = item[a];
// 				if(item instanceof Array)
// 				{
// 					var itHasLength = it.length > 0;
// 					var firstItIsStr = itHasLength ? typeof it[0] == "string" : false;
// 					var secondItIsStr = itHasLength ? typeof it[1] == "string" : false;
// 					var secondItIsArr = itHasLength ? it[1] instanceof Array : false;

// 					// JSUI.quickLog("firstItIsStr: " + firstItIsStr + " secondItIsStr: " + secondItIsStr, i+" "+a);

// 					if(firstItIsStr && secondItIsArr)
// 					{
// 						// prepare extra array for structs list
// 						var structsArr = [];
// 						// var struct = {};
// 						for(var b = 0; b < it[1].length; b++ )
// 						{
// 							var nested = it[1][b];
// 							JSUI.quickLog(nested);

// 							// convert to nested struct
// 							// var objFromArr = nested.convertToObject( true, false );

// 							// // obj[it[0]] = objFromArr; 
// 							// structsArr.push(objFromArr);
// 							// JSUI.quickLog(objFromArr, i+" "+a + " pushing object");
// 						}
// 						// var objFromArr = nested.convertToObject( true, false );

// 						// obj[it[0]] = objFromArr; 
// 						structsArr.push(objFromArr);

// 						if(structsArr.length) obj[it[0]] = structsArr;

// 						// // convert to nested struct
// 						// var objFromArr = it[1].convertToObject( true, false );

// 						// // obj[it[0]] = objFromArr; 
// 						// structsArr.push(objFromArr);
// 						// JSUI.quickLog(objFromArr, i+" "+a + " pushing object");
// 					}
// 					else //if(firstItIsStr && secondItIsStr)
// 					{
// 						// convert to simple object
// 						obj = item.convertToObject( true, false );
// 					}

// 					// objArr.push(obj);
// 					// JSUI.quickLog(obj);
// 				}
// 				// if(structsArr.length) obj[it[0]] = structsArr;
// 				// objArr.push(obj);
// 				// JSUI.quickLog(obj);
// 			}
// 			// if(structsArr.length) obj[it[0]] = structsArr;


// 			objArr.push(obj);
// 			// JSUI.quickLog(obj);
// 		} 
// 		// objArr.push(obj);
// 		// JSUI.quickLog(obj);
// 	}
// 	// JSUI.quickLog(objArr);
// 	return objArr;
// }

// Pslib.getLeafNodesArr = function(xmp, ns, property, leafNs, qualifiersArr)
// {
// 	if(!xmp) return;
// 	if(!ns) return;
// 	if(!property) return;
// 	if(!leafNs) return;
// 	if(!qualifiersArr) return;

// 	var biDimArr = [];
// 	var propertyExists = xmp.doesPropertyExist(ns, property);

// 	if(propertyExists)
// 	{
// 		var leafNsPrefix = XMPMeta.getNamespacePrefix(leafNs);
// 		if(!leafNsPrefix)
// 		{
// 			return;
// 		}

// 		var itemsCount = xmp.countArrayItems(ns, property);
// 		for(var i = 1; i <= itemsCount; i++)
// 		{
// 			var itemArr = [];

// 			for(var q = 0; q < qualifiersArr.length; q++)
// 			{
// 				var qualifier = qualifiersArr[q];
// 				var qualifierPath;
// 				var leafNodeStr;

// 				if(qualifier instanceof Array)
// 				{
// 					if(typeof qualifier[0] == "string" && qualifier[1] instanceof Array)
// 					{
// 						var arrQualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier[0]);
// 						var qualifiersItemsCount = xmp.countArrayItems(ns, arrQualifierPath);
// 						var structContainer = [ qualifier[0] ];
// 						for(var s = 1; s <= qualifiersItemsCount; s++)
// 						{
// 							if($.level) $.writeln("");
// 							var qualifiersItemsArr = qualifier[1];
// 							var subItemArr = [];

// 							for(var sq = 0; sq < qualifiersItemsArr.length; sq++)
// 							{
// 								var subQualifier = qualifiersItemsArr[sq];
// 								var subArrQualifierPath = arrQualifierPath+"["+s+"]/"+leafNsPrefix+subQualifier;
// 								var subPropertyExists = xmp.doesPropertyExist(ns, subArrQualifierPath);
// 								if(subPropertyExists)
// 								{
// 									var subLeafNodeStr = xmp.getProperty(ns, subArrQualifierPath).toString();

// 									if(subLeafNodeStr != undefined)
// 									{
// 										subItemArr.push([ subQualifier, subLeafNodeStr ]);
// 									}
// 								}
// 							}
// 							if(subItemArr.length) structContainer.push( subItemArr );
// 						}
// 						if(structContainer.length) itemArr.push(structContainer);
// 					}
// 				}
// 				else
// 				{
// 					// default for getting items
// 					qualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier);
// 					var subPropertyExists = xmp.doesPropertyExist(ns, qualifierPath);
// 					if(subPropertyExists)
// 					{
// 						leafNodeStr = xmp.getProperty(ns, qualifierPath).toString();

// 						if(leafNodeStr != undefined)
// 						{
// 							itemArr.push([qualifier, leafNodeStr]);
// 						}
// 					}
// 				}
// 			}
// 			if(itemArr.length) biDimArr.push(itemArr);
// 		}    
// 	}
// 	return biDimArr;
// }
    

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
		// JSUI.quickLog(arr, "getLeafNodesArr");
		return arr;

        var objArr = [];
    
        for(var i = 0; i < arr.length; i++ )
        {
            var obj = {};
            var item = arr[i];
			var structArr = [];
            if(item instanceof Array)
            {
                for(var a = 0; a < item.length; a++ )
                {                
                    var it = item[a];
                    var itHasLength = it.length > 0;

					if(!itHasLength) continue;
					
					var prop = it[0];
					var val = it[1];
					// JSUI.quickLog(prop+": "+val);

                    var firstItIsStr = itHasLength ? typeof prop == "string" : false;
                    var secondItIsStr = itHasLength ? typeof val == "string" : false;
                    var secondItIsArr = itHasLength ? val instanceof Array : false;

                    if(firstItIsStr && secondItIsArr)
                    {
						var qualObjArr = []; 
						for(var b = 1; b < it.length; b++ )
						{
							var qualArr = it[b];
							var qualObj = {};
							// JSUI.quickLog("\t"+b+": ");
							for(var c = 0; c < qualArr.length; c++ )
							{
								var qual = qualArr[c];
								// JSUI.quickLog("\t\t"+c+": "+qual);
								qualObj[it[0]] = qual;
							}
							qualObjArr.push(qualObj);
						}
						// continue;

                        // convert to nested struct
                        var objFromArr = qualObjArr.convertToObject( true, false );
                        obj[it[0]] = objFromArr;      
                        // obj[it[0]] = qualObjArr;     
						structArr.push(objFromArr);
                    }
                    else if(firstItIsStr && secondItIsStr)
                    {
						// JSUI.quickLog(prop);
						// JSUI.quickLog(val);
                        // convert to simple object
                        obj = item.convertToObject( true, false );
                    }

                }
				if(structArr.length) obj[item[i][0]] = structArr;  
            } 

            objArr.push(obj);
        }
    
        return objArr;
    }
    
    Pslib.getLeafNodesArr = function(xmp, ns, property, leafNs, qualifiersArr)
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

            var itemsCount = xmp.countArrayItems(ns, property);
			// JSUI.quickLog("Counted " + itemsCount + " items");

            for(var i = 1; i <= itemsCount; i++)
            {
                var itemArr = [];
				if($.level) $.writeln("");
    
                for(var q = 0; q < qualifiersArr.length; q++)
                {
                    var qualifier = qualifiersArr[q];
                    var qualifierPath;
                    var leafNodeStr;
    
                    if(qualifier instanceof Array)
                    {
                        if(typeof qualifier[0] == "string" && qualifier[1] instanceof Array)
                        {
                            var arrQualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier[0]);
                            var qualifiersItemsCount = xmp.countArrayItems(ns, arrQualifierPath);
                            var structContainer = [ qualifier[0] ];
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
                                            subItemArr.push([ subQualifier, subLeafNodeStr ]);
                                        }
                                    }
                                }
                                if(subItemArr.length) structContainer.push( subItemArr );
                            }
                            if(structContainer.length) itemArr.push(structContainer);
                        }
                    }
                    else
                    {
						// sanity check

						var structFieldExists = false;

						// try
						// {
						// 	structFieldExists = xmp.doesStructFieldExist(ns, qualifierPath, leafNs, qualifier);
						// 	JSUI.quickLog("structFieldExists: " + structFieldExists);
						// }
						// catch(e)
						// {

						// }
						

						// .deleteStructField(schemaNS, structName, fieldNS, fieldName

                        qualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier);

						var qualifierExists = false;
						
						// try
						// {
						// 	qualifierExists = xmp.doesQualifierExist(ns, qualifierPath, leafNs, qualifier);
						// }
						// catch(e)
						// {

						// }

						// if qualifier found, must be a Seq
						if(qualifierExists)
						{
							// JSUI.quickLog("Qualifier found: " + qualifierPath);
							
							// this is how you get details for Seq (ordered) array items

							// qualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier);
							leafNodeStr = xmp.getQualifier(ns, property+"["+i+"]", leafNs, qualifier).toString();

							leafNodeStr = Pslib.autoTypeDataValue(leafNodeStr, false, false); // empty string allowed, null not allowed 
							if( leafNodeStr != undefined )
							{
						        itemArr.push([qualifier, leafNodeStr]);
						    }
						}
						// if qualifier not found, assume we are working with a Bag
						else
						{
							// JSUI.quickLog("Qualifier NOT FOUND: " + qualifierPath);

							// this is how you get details for Bag (unordered) array items

							// <xmpTPg:Fonts>
							// <rdf:Bag>
							//    <rdf:li rdf:parseType="Resource">
							// 	  <stFnt:fontName>MyriadPro-Regular</stFnt:fontName>
							// 	  <stFnt:fontFamily>Myriad Pro</stFnt:fontFamily>
							// 	  <stFnt:fontFace>Regular</stFnt:fontFace>
							// 	  <stFnt:fontType>Open Type</stFnt:fontType>
							// 	  <stFnt:versionString>Version 2.102;PS 2.000;hotconv 1.0.67;makeotf.lib2.5.33168</stFnt:versionString>
							// 	  <stFnt:composite>False</stFnt:composite>
							// 	  <stFnt:fontFileName>MyriadPro-Regular.otf</stFnt:fontFileName>
							//    </rdf:li>

							// qualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier);
							var subPropertyExists = false;
							
							// Exception has occurred: 1000
							// XMP Exception: Named children only allowed for schemas and structs

							// try
							// {
								subPropertyExists = xmp.doesPropertyExist(ns, qualifierPath);
							// }
							// catch(e)
							// {
	
							// }


							if(subPropertyExists)
							{
								leafNodeStr = xmp.getProperty(ns, qualifierPath).toString();
		
								if(leafNodeStr != undefined)
								{
									itemArr.push([qualifier, leafNodeStr]);
								}
							}
						}


                    }
					// // this works for ManagedArtboards
                    // else
                    // {
                    //     qualifierPath = (property+"["+i+"]/"+leafNsPrefix+qualifier);
					// 	leafNodeStr = xmp.getQualifier(ns, property+"["+i+"]", leafNs, qualifier).toString();

					// 	leafNodeStr = Pslib.autoTypeDataValue(leafNodeStr, false, false); // empty string allowed, null not allowed 
					// 	if( leafNodeStr != undefined )
					// 	{
                	//         itemArr.push([qualifier, leafNodeStr]);
                    //     }
                    // }
                }
                if(itemArr.length) biDimArr.push(itemArr);
            }    
        }
        return biDimArr;
    }

// Much faster than layer XMP: piggyback onto Photoshop Generator plugin per-layer space
// accessible via ID, no active selection required, use within a Pslib.getSelectedArtboardIDs() loop
Pslib.setObjectData = function(id, jsonObj, PLUGIN_ID)
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var id = id ? id : doc.activeLayer.id;

		if (id && jsonObj && PLUGIN_ID)
		{
			var jdesc = new ActionDescriptor()
			jdesc.putString(sTID("json"), typeof jsonObj == "string" ? jsonObj : JSON.stringify(jsonObj));
		
			var ref = new ActionReference();
			ref.putProperty(cTID("Prpr"), sTID("generatorSettings"));
			ref.putIdentifier(cTID("Lyr "), id);
		
			var adesc = new ActionDescriptor();
			adesc.putReference(cTID("null"), ref);
			adesc.putObject(cTID("T   "), cTID("null"), jdesc);
			adesc.putString(sTID("property"), PLUGIN_ID);
			executeAction(cTID("setd"), adesc, DialogModes.NO);
			return true;
		}
	}
	else if(Pslib.isIllustrator)
	{

	}
}

Pslib.getObjectData = function(id, PLUGIN_ID)
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var id = id ? id : doc.activeLayer.id;

		if (id && PLUGIN_ID)
		{
			var ref = new ActionReference();
			ref.putProperty(cTID("Prpr"), sTID("generatorSettings"));
			ref.putIdentifier(cTID("Lyr "), id); 
		
			var adesc = new ActionDescriptor();
			adesc.putReference(cTID("null"), ref);
			adesc.putString(sTID("property"), PLUGIN_ID);
		
			var desc = executeAction(cTID("getd"), adesc, DialogModes.NO);
			if (desc)
			{
				var genSettings = sTID("generatorSettings");
				if (desc.hasKey(genSettings))
				{
					var genData = desc.getObjectValue(genSettings);
					var json = sTID("json");

					if (genData.hasKey(json))
					{
						var jData = genData.getString(json);
						if (jData)
						{
							return JSON.parse(jData);
						}
					}
				}
			}
		}
	} 
	else if(Pslib.isIllustrator)
	{
		
	}
}

    
// *** need a property name converter routine 

    // // get advanced properties + 
    // var packageObj = {
	//		destination,						// export destination (default is relative)
    //     tags,                               // expected: bidimensional array
	//	   tagsNamespace,
	//	   tagsNamespacePrefix,
	// 	   converter,						   // converter for tag names
    //     itemNameStr,                        // name of the placeholder item name, default "#"
    //     sidecarDocXmp: true,                // sidecarDocXmp: saves sidecar XMP file next to source document (debug/review) 
    //     sidecarPackageXmp: true,            // sidecarPackageXmp: saves sidecar XMP for packaged document
    //     assetsJsonFile: true,               // assetsJsonFile: saves JSON file along (debug/review)
    //     embedCoords: true,                  // embedCoords: embeds artboard coordinates within output media file (mostly relevant for png, but could also handle svg & pdf)
    //         namespace: undefined,           // namespace: xmp namespace to write custom property to 
    //         propertyName: undefined,        // propertyName: xmp property name (possibly includes complex path)
    //     advanced: true,                     // advanced: slower, gets advanced information like individual artboard tags
	//		extraStructFields: [],       			// any arbitrary property names from JSON objects that should be included as struct fields
	//		roundValues: true,					// width, height, x, y will be rounded
    //     writeSimpleProperties: true,        // writeSimpleProperties: writes one property for each artboard (mostly for debugging, but may actually be useful)
    //         qualifiersNamespace: undefined,   // dedicatedNamespace: if ordered array struct qualifiers are meant to use a separate namespace (undefined defaults to Pslib.SECONDARYXMPNAMESPACE)
    //         simplePropertiesNamespace: undefined,   // simplePropertiesNamespace: if simple properties are meant to use a separate namespace  (undefined defaults to Pslib.SECONDARYXMPNAMESPACE)
	//		includeSVG: false					// includes SVG 
    // };
Pslib.packageDocument = function( obj )
{
    if(!app.documents.length) return;
    if(!obj) obj = {};
    if(obj.embedCoords == undefined) obj.embedCoords = true;
    if(obj.roundValues == undefined) obj.roundValues = true;
    if(obj.reselectItems == undefined) obj.reselectItems = Pslib.isIllustrator ? true : false; // costly for Photoshop
	if(!obj.extraStructFields) obj.extraStructFields = [ "id", "name", "width", "height", "x", "y" ];

	// assuming target namespaces may not have been registered at the moment of launching 
	// dealing with custom namespaces or not, keep track of registration status
	var mustRegisterNameSpace = false;
	
	if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');

	// dump namespace collection to string
	var namespacesStr = XMPMeta.dumpNamespaces();

	//  check for match in dumped namespaves

    if(!obj.namespace)
    {
        if(!obj.namespacePrefix) obj.namespacePrefix = Pslib.XMPNAMESPACEPREFIX;
        obj.namespace = Pslib.XMPNAMESPACE;
		mustRegisterNameSpace = namespacesStr.match(obj.namespace) != null;
    }

    if(!obj.qualifiersNamespace)
    {
        obj.qualifiersNamespace = Pslib.XMPNAMESPACE;
		// mustRegisterNameSpace = mustRegisterNameSpace ? true : namespacesStr.match(obj.qualifiersNamespace) != null;
    }
	else
	{
		mustRegisterNameSpace = mustRegisterNameSpace ? true : namespacesStr.match(obj.qualifiersNamespace) != null;
	}

	if(!obj.tagsNamespace)
	{
		obj.tagsNamespace = Pslib.XMPNAMESPACE;
		obj.tagsNamespacePrefix = Pslib.XMPNAMESPACEPREFIX;
	}

    if(!obj.simplePropertiesNamespace)
    {
		if(!obj.simplePropertiesNamespacePrefix) obj.simplePropertiesNamespacePrefix = Pslib.SECONDARYXMPNAMESPACEPREFIX;
        obj.simplePropertiesNamespace = Pslib.SECONDARYXMPNAMESPACE;
    }
	else
	{
		mustRegisterNameSpace = mustRegisterNameSpace ? true : namespacesStr.match(obj.simplePropertiesNamespace) != null;
	}

	if(mustRegisterNameSpace)
	{
		if(obj.embedCoords)
		{
			if(obj.writeSimpleProperties)
			{
				if(obj.simplePropertiesNamespace)
				{
					if(!obj.simplePropertiesNamespacePrefix)
					{
						obj.simplePropertiesNamespacePrefix = XMPMeta.getNamespacePrefix(obj.namespace);
					}

					XMPMeta.registerNamespace(obj.simplePropertiesNamespace, obj.simplePropertiesNamespacePrefix);
				}
			}

			if(obj.simplePropertiesNamespace)
			{
				if(!obj.simplePropertiesNamespacePrefix)
				{
					obj.simplePropertiesNamespacePrefix = XMPMeta.getNamespacePrefix(obj.simplePropertiesNamespace);
				}
				XMPMeta.registerNamespace(obj.simplePropertiesNamespace, obj.simplePropertiesNamespacePrefix);
			}

			if(obj.qualifiersNamespace)
			{
				if(!obj.qualifiersNamespacePrefix)
				{
					obj.qualifiersNamespacePrefix = XMPMeta.getNamespacePrefix(obj.qualifiersNamespace);
				}
				XMPMeta.registerNamespace(obj.qualifiersNamespace, obj.qualifiersNamespacePrefix);
			}

			if(obj.tagsNamespace)
			{
				if(!obj.tagsNamespacePrefix)
				{
					obj.tagsNamespacePrefix = XMPMeta.getNamespacePrefix(obj.tagsNamespace);
				}
				XMPMeta.registerNamespace(obj.tagsNamespace, obj.tagsNamespacePrefix);
			}

		}
	}

    if(!obj.propertyName) obj.propertyName = "ManagedArtboards";

    // tags: ILST tag names, PSHP xmp property names
    if(!obj.tags)
    {
        // convert default extended properties array to bidimensional for compatibility with XMP functions
        obj.tags = [];
        for(var i = 0; i < Pslib.storedAssetPropertyNamesArr.length; i++)
		{
            obj.tags.push( [ Pslib.storedAssetPropertyNamesArr[i], null ] );
        }
    }

    if(!obj.itemNameStr) obj.itemNameStr = "#";

    var doc = app.activeDocument;
    var docExtension = doc.name.getFileExtension();

    // expected: .psd or .ai, block if anything else
    if(!docExtension)
    {
        JSUI.alert("Document is not valid for this operation.");
        return;
    }
    if(docExtension == ".png" || docExtension == ".svg" || docExtension == ".pdf")
    {
        JSUI.alert("Wrong document format.");
        return;
    }

    var docNameNoExt = doc.name.getFileNameWithoutExtension();

    // this will be different if not saving to -assets
    var assetsUri = obj.destination ? new Folder(obj.destination) : docNameNoExt.getAssetsFolderLocation( undefined, undefined, true);

    var xmp = Pslib.getXmp(doc, false);

    // at this point, if using dedicated namespace, we may not have a prefix defined (needed for console log & debugging)
    if(!obj.namespacePrefix)
    {
        obj.namespacePrefix = XMPMeta.getNamespacePrefix(obj.namespace);
    }

    // must provide a way to specify file name & location
    var mediaFileOutput = Pslib.documentToFile( { destination: assetsUri, includeSVG: obj.includeSVG } );
    
    // var docSpecs = Pslib.getDocumentSpecs();
    // var jsonAssetsObj = Pslib.artboardCollectionCoordsToJsonFile(undefined, docSpecs, true); // exports JSON file
    var jsonAssetsObjArr = Pslib.getArtboardCollectionCoordinates(); // only math, no tags here
    // var jsonAssetsObjArr = [];
	
	if(obj.advanced)
	{
		if(Pslib.isPhotoshop)
		{
			// jsonAssetsObjArr = Pslib.getArtboardCollectionCoordinates();
			jsonAssetsObjArr = Pslib.getAdvancedSpecs( jsonAssetsObjArr, { dictionary: Pslib.arrayToObj(obj.requiredQualifiers), converter: obj.converter });

		}
		else if(Pslib.isIllustrator)
		{
			// jsonAssetsObjArr = Pslib.getArtboardCollectionCoordinates();
			
		}
	}
	// else
	// {
	// 	jsonAssetsObjArr = Pslib.getArtboardCollectionCoordinates();
	// }

    // var jsonAssetsTagArrays = [];

	// obj.artboardObjArr = Pslib.getAdvancedSpecs(obj.artboardObjArr, { dictionary: Pslib.arrayToObj(obj.requiredQualifiers), converter: obj.converter });
	// alert(obj.tags);
	// alert(tags)
    
    // if nothing to work with, abort
    if(!jsonAssetsObjArr.length) return;

    // if advanced logic / artboard scanning is needed...
    if(obj.advanced)
    {
        var initialSelection = Pslib.isPhotoshop ? Pslib.getSelectedArtboardIDs() : doc.selection;

        for(var i = 0; i < jsonAssetsObjArr.length; i++)
		{
            // consider streamlined function Pslib.selectArtboardByReference()
			// translates into PSHP selectLayerByID() and ILST .getArtboardItem()

            var asset = jsonAssetsObjArr[i];
            var tags = [];

            if(Pslib.isPhotoshop)
            {
                // select artboard by id
                // var artboard = Pslib.selectLayerByID( asset.id, false );
                // tags = Pslib.getXmpProperties(artboard, obj.tags, obj.namespace);
				tags = Pslib.getXmpProperties( asset.id, obj.tags, obj.tagsNamespace ? obj.tagsNamespace : obj.namespace); // much faster!

                // JSUI.quickLog(tags);
            }
            else if(Pslib.isIllustrator)
            {
                var placeholder;
                doc.artboards.setActiveArtboardIndex(asset.id);
                var artboard = doc.artboards[asset.id];
                doc.selectObjectsOnActiveArtboard();
                placeholder = Pslib.getArtboardItem(artboard, obj.itemNameStr);

                if(placeholder)
                {
                    tags = Pslib.getTags(placeholder, obj.tags);
                }
            }

			// convert tag names here if needed
			if(obj.converter)
			{
				// beware, we may still have null instead of an array here
				if(tags) 
				{
					if(tags.length)
					{
						tags = tags.convertTags(obj.converter);
					}
				}
			}

            // inject tags into individual asset object
            if(tags)
            {
                for(var t = 0; t < tags.length; t++)
                {
                    var tag = tags[t];
                    if(tag)
                    {
                        var pname = tag[0];
                        var pvalue = tag[1];
                        if(pvalue != undefined && pvalue != null && pvalue != "undefined")
                        {
                            asset[pname] = pvalue;
                        }
                    }
                }
            }

			// -- possibly handled with obj.tagsNamespace 
        }

        // restore selection
        if(Pslib.isIllustrator)
        {
            if(obj.reselectItems) doc.selection = initialSelection;
        }
        else if(Pslib.isPhotoshop) 
        {
			// this is costly, only do it if specifically requested
            if(obj.reselectItems) Pslib.selectArtboardsCollection(initialSelection);
        }
    }

    // write document xmp to file
    if(obj.sidecarDocXmp)
    {
        var xmpFileLocation;
        var xmpFile;

        if(obj.sidecarDocXmp instanceof File)
        {
            xmpFile = obj.sidecarDocXmp;
        }
        else
        {
            // get document path
            xmpFileLocation = Pslib.getDocumentPath();
            if(xmpFileLocation instanceof File)
            {
                xmpFileLocation = xmpFileLocation.parent;
                xmpFile = new File( xmpFileLocation + "/" + docNameNoExt + ".xmp");
            }
        }

        //  Pslib.writeToFile(xmpFile, xmpStr);
        Pslib.writeXMPtoSidecarFile( xmpFile, xmp );
    }

    if(obj.assetsJsonFile)
    {
        var jsonFile;

        if(obj.assetsJsonFile instanceof File)
        {
            jsonFile = obj.assetsJsonFile;
        }
        else
        {
            jsonFile = new File( assetsUri + "/" + docNameNoExt + ".json"); // goes to -assets
            // jsonFile = new File( xmpFileLocation + "/" + docNameNoExt + ".xmp"); // xmp is created next to source document
        }

        var jsonStr = JSON.stringify(jsonAssetsObjArr, null, "\t");
        Pslib.writeToFile(jsonFile, jsonStr);
    }

    if(obj.embedCoords)
    {
        var propertiesArr = [];

        // if object
        if(obj.embedCoords instanceof Boolean)
        {
            // if value is true, assume we want to embed existing coordinates array
            propertiesArr = jsonAssetsObjArr;
        }
        else if(obj.embedCoords instanceof Object)
        {
            propertiesArr = obj.embedCoords.convertToArray();
        }
        else if(obj.embedCoords instanceof Array)
        {
            propertiesArr = obj.embedCoords;
        }

        // perhaps another case here would be adding jsonAssetsObjArr as a property to a provided object 


        // var newXmp = new XMPMeta();
        var newXmp = Pslib.getXMPfromFile(mediaFileOutput);

        // if array of properties

        // var type = Pslib.getXMPConstFileType(mediaFileOutput);
        // var added = Pslib.writeXMPtoMediaFile( mediaFileOutput, newXmp, type );
        
        // this works for a single asset file
        // var added = Pslib.addXmpPropertiesToFile(mediaFileOutput, new XMPMeta(), undefined, propertiesArr);

        if(obj.writeSimpleProperties)
        {
            // if string, assume it's a namespace
            if( typeof obj.writeSimpleProperties == "string" )
            {
                obj.qualifiersNamespace = obj.writeSimpleProperties;
                obj.qualifiersNamespace = XMPMeta.getNamespacePrefix(obj.qualifiersNamespace);
            }

            // register namespace here if does not exist?
            //
        }

        // even at this point obj.dedicatedNamespacePrefix may not exist, or may not be valid
        if(!obj.dedicatedNamespacePrefix)
        {   
            obj.dedicatedNamespacePrefix = XMPMeta.getNamespacePrefix(obj.dedicatedNamespace);
        }

        // even at this point obj.dedicatedNamespacePrefix may not exist, or may not be valid
        if(!obj.qualifiersNamespacePrefix)
        {   
            obj.qualifiersNamespacePrefix = XMPMeta.getNamespacePrefix(obj.qualifiersNamespace);
        }
        
		if(obj.extraStructFields)
		{ 
			if(obj.extraStructFields.length)
			{ 
				for(var sf = 0; sf < obj.extraStructFields.length; sf++)
				{
					var sfName = obj.extraStructFields[sf];
					if(sfName)
					{
						obj.tags.push( [ sfName, null ] );
					}
				}
			}
		}

        // write ordered array (main namespace)
        // newXmp.setProperty(obj.namespace, obj.propertyName, "Seq placeholder content", XMPConst.ARRAY_IS_ORDERED); // <prefix:propName>
        newXmp.setProperty(obj.namespace, obj.propertyName, null, XMPConst.ARRAY_IS_ORDERED); // <prefix:propName>
    
        if($.level) $.writeln( "\n<"+obj.namespacePrefix+obj.propertyName+">\n  <rdf:Seq/>" ); 

        // for a collection we need a different approach
        for(var j = 0; j < jsonAssetsObjArr.length; j++)
		{
            var ab = jsonAssetsObjArr[j];

            // cheap version only meant for debugging 
            var artboardNameStr = "Artboard" + ab.id.toString().zeroPad( Pslib.isIllustrator ? 3 : 4); // illustrator has a limit of 1000 artboards (0-999)
            // basic stuff
            // var contentStr = "id:"+ab.id+","+( Pslib.isIllustrator ? "page:"+(ab.id+1)+"," : "" )+"name:"+ab.name;
            var contentStr = "id:"+ab.id+","+"name:"+ab.name;

            // precise coordinates 
			if(obj.roundValues)
			{
				ab.width = Math.round(ab.width);
				ab.height = Math.round(ab.height);
				ab.x = Math.round(ab.x);
				ab.y = Math.round(ab.y);
			}
			
            contentStr += ",width:"+ab.width+",height:"+ab.height+",x:"+ab.x+",y:"+ab.y ;

            // + any custom tags harvested by previous operation 
            for(var a = 0; a < obj.tags.length; a++)
            {
                var kname = obj.tags[a][0];
				// EXCEPT if property name is already part of the tags array
				if(kname == "id" || kname == "name" || kname == "page" || kname == "width" || kname == "height" || kname == "x" || kname == "y") continue;

				// OR if not part of extraStructFields
				if(obj.extraStructFields)
				{
					if(obj.extraStructFields.length)
					{ 
						for(var sf = 0; sf < obj.extraStructFields.length; sf++)
						{
							var sfName = obj.extraStructFields[sf];
							if(sfName)
							{
								if(kname == sfName) continue;
							}
						}
					}
				}

                var kvalue = ab[kname];
                if(kvalue != undefined) contentStr += ","+kname+":"+kvalue;
            }

            // write "simple" property for each managed artboard
            // no need to check if property exists, this just replaces it
            if(obj.writeSimpleProperties)
            {
                // add property to xmp
                var name = artboardNameStr;
                var value = contentStr;

                // newXmp.setProperty(Pslib.SECONDARYXMPNAMESPACE, name, value, 0, XMPConst.STRING);
                newXmp.setProperty(obj.simplePropertiesNamespace, name, value, 0, XMPConst.STRING);
                 // JSUI.quickLog(name + "\t" + value); 
            }

           // prepare struct fields for ordered array
           if($.level) $.writeln( "    <rdf:li rdf:parseType=\"Resource\">\n    <rdf:value>"+contentStr+"</rdf:value>" );
            newXmp.appendArrayItem(obj.namespace, obj.propertyName, contentStr); //              
            // <rdf:li rdf:parseType="Resource">
            //    <rdf:value>id:{int as string},name:{string},width:{int as string},height:{int as string},x:{int as string},y:{int as string}</rdf:value>
            //    <prefix:qualifier>Tag_A</prefix:qualifier>
            // </rdf:li>
            
           // obj.tags only contains custom tag names, no values
           for(var t = 0; t < obj.tags.length; t++)
           {
               var subArr = obj.tags[t];

               var tqualifier = subArr[0];
               var tvalue = ab[tqualifier]; // get values from artboard coords object
               if(tvalue != undefined)
               {
                    newXmp.setQualifier(obj.namespace, obj.propertyName+'['+(j+1)+']', obj.qualifiersNamespace, tqualifier, tvalue);
                    if($.level) $.writeln( "      <"+obj.qualifiersNamespacePrefix+tqualifier+">"+tvalue+"</"+obj.qualifiersNamespacePrefix+tqualifier+">" );
               }
           }
           if($.level) $.writeln( "    </rdf:li>" ); 
		   contentStr = "";
        }

        if($.level) $.writeln( "  </rdf:Seq>\n</"+obj.namespacePrefix+obj.propertyName+">\n" ); 

        // JSUI.quickLog(name + "\t" + value);

        // write ordered struct fields array

        // var added = Pslib.addXmpPropertiesToFile(mediaFileOutput, new XMPMeta(), undefined, propertiesArr); // this works for a single asset file
        var added = Pslib.writeXMPtoMediaFile( mediaFileOutput, newXmp );

		if(obj.includeSVG)
		{
			// test for svg file, also write xmp 
			var svgOutputFile = mediaFileOutput.toString().swapFileObjectFileExtension(".svg");
			if(svgOutputFile.exists)
			{
				Pslib.writeXMPtoMediaFile( svgOutputFile, newXmp );
			}        
		}

        if(added)
        {
            // write packaged document xmp to file for debugging
            if(obj.sidecarPackageXmp)
            {
                var sidecarXmpFile;

                if(obj.sidecarPackageXmp instanceof File)
                {
                    sidecarXmpFile = obj.sidecarPackageXmp;
                }
                else
                {
                    sidecarXmpFile = new File( mediaFileOutput.parent + "/" + mediaFileOutput.name.getFileNameWithoutExtension() + ".xmp");
                }

                Pslib.writeXMPtoSidecarFile( sidecarXmpFile, newXmp );
            }
        }

    }

    return mediaFileOutput;
}

// // simpler version of .packageDocument() with built-in support for groups, information about selected/active items 
// // and more robust harvesting and conversion of tags --- assumes lib:AdobeXMPScript loaded

// should allow pre-processed set of coordinates

	// file: "/path/to/image.png",		// optional default image file path, defaults to DocumentLocation-assets/DocumentName.png
	// xmp: new XMPMeta();				// opportunity to pass existing XMP object, default is a blank one
	// exportImage: true,
	// converterReplacesProperties: false,
	// containers: {} // existing .getContainers object
	// docSpecs: Pslib.getDocumentSpecs() object for offset calculations
	// filterExtension: true			// filter any extension from coords.name (default true) 
	// filterExtension: ".png"			// filter specific extension 
	// filterExtension: [".png", ".svg"] // filter multiple extensions 

// option for using existing containers object -- Pslib.getContainers({ advanced: true})	
Pslib.documentToXmpArrayImage = function( obj )
{
	if(!app.documents.length) return;
	if(!obj) obj = {};

	if(obj.exportImage == undefined) obj.exportImage = true;
	if(obj.getXMPobj == undefined) obj.getXMPobj = false;

	if(!obj.propertyName) obj.propertyName = "Containers";
	
	// if custom values for source namespace (containers XMP), 
	// target namespace (array property) and/or qualifier namespace,
	// make sure they have been registered prior to running this function
	if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
	if(!obj.targetNamespace) obj.targetNamespace = obj.namespace;
	if(!obj.targetQualifierNamespace) obj.targetQualifierNamespace = obj.targetNamespace;

	if(!obj.expectedFields) obj.expectedFields = [ "id", "name", "width", "height", "x", "y" ];
	if(obj.filterExtension == undefined) obj.filterExtension = true;
	if(!obj.tags) obj.tags = [];
	if(!obj.converter) obj.converter = [];
	if(obj.converterReplacesProperties == undefined) obj.converterReplacesProperties = false;

	if(!obj.propertyNameSelected) obj.propertyNameSelected = obj.propertyName + "Selected";
	if(!obj.propertyNameSelectedArrayIndexes) obj.propertyNameSelectedArrayIndexes = obj.propertyName + "SelectedArrayIndexes";

	// safeguard
	if(ExternalObject.AdobeXMPScript == undefined) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');

	if(!obj.xmp)
	{
		obj.xmp = new XMPMeta();
	}

	if(typeof obj.xmp === "string") obj.xmp = new XMPMeta(obj.xmp);

	var doc = app.activeDocument;

	if(!obj.file) obj.file = new File( doc.name.getAssetsFolderLocation( undefined, false, obj.exportImage, obj.exportImage) + "/" + doc.name.getDocumentName() + ".png" );

	var mediaFileOutput;
	if(obj.exportImage) mediaFileOutput = Pslib.documentToFile( { destination: obj.file } );

	// var xmp = Pslib.getXMPfromFile(mediaFileOutput);
	var xmp = obj.xmp;

	if(xmp == undefined)
	{
		alert("XMPMeta utils appear offline. Please try again.");
		return;
	}

	// add document W + H
	if(!obj.docSpecs) obj.docSpecs = Pslib.getDocumentSpecs();
	xmp.setProperty(obj.targetNamespace, "DocumentWidth", obj.docSpecs.width.toString(), XMPConst.STRING);
	xmp.setProperty(obj.targetNamespace, "DocumentHeight", obj.docSpecs.height.toString(), XMPConst.STRING);

	// adv = { all: allItems, selected: selectedItems, active: activeItems };
	var adv = obj.containers ? obj.containers : Pslib.getContainers( { advanced: true } );

	if(adv.all.length)
	{
		// add xmp array property
		if(adv.selected.length)
		{
			xmp.setProperty(obj.targetNamespace, obj.propertyNameSelected, adv.selected.toString(), XMPConst.STRING);
			if(Pslib.isPhotoshop) xmp.setProperty(obj.targetNamespace, obj.propertyNameSelectedArrayIndexes, adv.active.toString(), XMPConst.STRING);
		}

		// add xmp array property
		xmp.setProperty(obj.targetNamespace, obj.propertyName, null, XMPConst.ARRAY_IS_ORDERED);

		// create array of fields to be used as qualifiers
		var fields = obj.expectedFields;

		// add custom tags as fields
        for(var i = 0; i < obj.tags.length; i++)
		{
			var tagName = obj.tags[i][0];
			fields.push( tagName );
        }

		// if converter provided, convert field names
		if(obj.converter.length)
		{
			var convertedFields = [];
			for(var i = 0; i < fields.length; i++)
			{
				var fieldName = fields[i];
		
				for(var j = 0; j < obj.converter.length; j++)
				{
					var match = obj.converter[j][0];
					if(match != undefined)
					{
						if(match == fieldName)
						{
							var conv =  obj.converter[j][1];
							if(conv != undefined) 
							{
								fieldName = conv;
								break;
							}
						}
					}
				}
				convertedFields.push(fieldName);
			}
			fields = convertedFields;
		}

		// allow pro-processed specs
		var specsProvided = false;
		if(adv.specsArr)
		{
			specsProvided = adv.specsArr.length > 0;
		}
			
		var coordsArr = [];


		// now proceed with getting container infos and adding them as XMP array items
		for(var i = 0; i < adv.all.length; i++)
		{
			var id = adv.all[i];
			
			var specs;
			// make sure that artboard ids correspond
			if(specsProvided)
			{
				specs = adv.specsArr[i];
				// if(id !== specs.id) continue;
			}
			var coords = specsProvided ? specs : Pslib.getLayerReferenceByID( id, { getCoordsObject: true, tags: obj.tags.length ? obj.tags : [], namespace: obj.namespace, converter: obj.converter, docSpecs: obj.docSpecs, filterExtension: obj.filterExtension }); 
			if(!coords) continue;

			// IF items from expected fields are meant to be converted
			for(var j = 0; j < obj.expectedFields.length; j++)
			{
				var expectedField = obj.expectedFields[j];
				if(expectedField != undefined)
				{				
					if(coords[expectedField] != undefined)
					{
						if(obj.converter.length)
						{
							for(var c = 0; c < obj.converter.length; c++)
							{
								var cmatch = obj.converter[c][0];
								if(cmatch != undefined)
								{
									if(cmatch == expectedField)
									{
										var cconv =  obj.converter[c][1];
										if(coords[cmatch] != undefined) 
										{
											coords[cconv] = coords[expectedField];
											if(obj.converterReplacesProperties) coords[expectedField] = undefined;
										}
									}
								}
							}
						}
					}
				}
			}

			// add new array item, 1-based index as placeholder value
			xmp.appendArrayItem(obj.targetNamespace, obj.propertyName, i+1);

			for(var f = 0; f < fields.length; f++)
			{  
				var tqualifier = fields[f];
				var tvalue = coords[tqualifier];

				if(tvalue != undefined)
				{
					xmp.setQualifier(obj.targetNamespace, obj.propertyName+'['+(i+1)+']', obj.targetQualifierNamespace, tqualifier, tvalue);
				}
			}

			coordsArr.push(coords);
		}

		// complex object
		var rObj = {};

		rObj.coords = coordsArr;
		rObj.tags = obj.tags;
		rObj.converter = obj.converter;
		rObj.fields = fields;
		rObj.xmp = xmp; 
		rObj.docSpecs = obj.docSpecs;

		// write modified xmp object to media file container
		if(obj.exportImage)
		{
			var added = Pslib.writeXMPtoMediaFile( mediaFileOutput, xmp );
			if(added)
			{
				rObj.imageFile = mediaFileOutput;
				rObj.imageFileFsName = mediaFileOutput.fsName;
			}
		}

		rObj.allItems = adv.allItems;
		rObj.selected = adv.selected;
		rObj.active = adv.active;

		if(adv.specsArr) rObj.specsArr = adv.specsArr;
		if(adv.artboardsCollection) rObj.artboardsCollection = adv.artboardsCollection;
		if(adv.itemsCollection) rObj.itemsCollection = adv.itemsCollection;

		// return added ? mediaFileOutput : undefined;
		return rObj;
	}   
}

// from array of qualifier values (strings), get array of 1-based integers for indexes in xmp array
// typically for getting array item matches based on Photoshop layer unique IDs, but should also work for strings and booleans
// Assumes valid structure here, no smart handling of duplicates or unresolved items
Pslib.getXmpArrayIndexes = function( xmp, ns, name, qNs, qualifier, arr, count )
{
    if(!xmp) return;
    if(!name) return;
    if(!ns) ns = Pslib.XMPNAMESPACE;
    if(!name) name = "ManagedArtboards";
    if(!qNs) qNs = ns;
    if(!qualifier) qualifier = "id";
    if(!arr) return;
    if(count == undefined) count = xmp.doesPropertyExist(ns, name) ? xmp.countArrayItems(ns, name) : undefined;
    if(count == undefined) return;

    var indexesArr = [];

    for(var i = 1; i < (count+1); i++)
    {
        var itemPath = name+"["+i+"]";
        var hasItem = xmp.doesPropertyExist( ns, itemPath);
        if(hasItem)
        {
            var qualValue = xmp.getQualifier(ns, itemPath, qNs, qualifier);
            if(qualValue == undefined)
            {
                // if($.level) $.writeln("Qualifier "+qualifier+" not found on item "+i);
            }
            else
            {
                // if($.level) $.writeln("Qualifier "+qualifier+" found on "+itemPath);
                qualValue = Pslib.autoTypeDataValue( decodeURI(qualValue.toString()), false, false );
                
                for(var j = 0; j < arr.length; j++)
                {
                    // this should get a match on numbers and booleans too
                    if( arr[j].toString() == qualValue )
                    {
                        indexesArr.push(i);
                        // if($.level) $.writeln("Item #"+i+" has value "+qualValue);
                        break;
                    }
                    if( (j == (arr.length-1)) && (i == count+1))
                    {
                        // if($.level) $.writeln("No array item match for value "+arr[j]);
                        indexesArr.push(undefined); // indexesArr should have same length as arr
                    }
                }
            }
        }
    } 
    return indexesArr;
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
	// these are expected
    // if(!obj.arr) obj.arr = Pslib.storedAssetPropertyNamesArr; // [ "assetName", "assetArtboardID", "assetID"]
    if(!obj.arr) obj.arr = Pslib.storedAssetPropertyNamesArr; // [ "name", "id", "assetID"]
    if(!obj.range) obj.range = "all"; // range string, 1-based. "1-5"  "1,6,10,13-16"
    if(!obj.requiredQualifiers) obj.requiredQualifiers = Pslib.requiredAssetQualifiers;
    if(!obj.converter) obj.converter = Pslib.assetKeyConversionArr; // default: empty array
    if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
    // if(!obj.secondaryNamespace) obj.secondaryNamespace = Pslib.SECONDARYXMPNAMESPACE;
	if(!obj.secondaryNamespace) obj.secondaryNamespace = obj.namespace;
    // if(!obj.getObjBool) obj.getObjBool = false; // always getting objects

    var docXmpArtboardsSpecs = Pslib.getOrderedArrayItems( { xmp: obj.xmp, arrNameStr: obj.arrNameStr, arr: obj.arr, namespace: obj.namespace, secondaryNamespace: obj.secondaryNamespace, getObjBool: true});
	
	JSUI.stopTimer();

    return docXmpArtboardsSpecs;
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
	var xmp;

	if(!type) type = XMPConst.UNKNOWN;

    try 
	{
        if(filepath)
		{ 
			filepath = new File(filepath); 
		}
        var f = filepath ? filepath : File.openDialog("Choose file to get XMP data from");
        if(!f)
		{ 
			// if($.level) $.writeln("Invalid file"); 
			return; 
		}

        // if($.level) $.writeln("Getting XMP data from " + f.fsName);

        if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript')

		// get file type
		var fileTypeCONST = type != undefined ? type : Pslib.getXMPConstFileType(f.fsName);

        var xmpFile = new XMPFile(f.fsName, fileTypeCONST, XMPConst.OPEN_ONLY_XMP);
        xmp = xmpFile.getXMP();
		xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);
    }
	catch (e)
	{ 
		// if($.level) $.writeln( "Error: \n\n" + e); return false; 	
	}
	return xmp;
}

// standalone property write to offline file
// allows specifying namespace
Pslib.addXmpPropertiesToFile = function(file, xmp, namespace, arr)
{
	if(!file) return false;
	if(!xmp) xmp = Pslib.getXMPfromFile(file);
	if(!namespace) namespace = Pslib.XMPNAMESPACE;

	var updated = 0;
	for(var i = 0; i < arr.length; i++)
	{
		var name = arr[i][0];
		var value = arr[i][1];
		xmp.setProperty(namespace, name, encodeURI(value), 0, XMPConst.STRING);
		updated++;
	}
	if(updated)
	{
		return Pslib.writeXMPtoMediaFile(file, xmp);
	}
}

// write xmp to media file / update media file xmp
// Confirmed: .putXMP() does not replace the existing object (updates + adds content)
Pslib.writeXMPtoMediaFile = function( filepath, xmp, type )
{
    try
	{
		if(!xmp) return false;
		if(filepath){ filepath = new File(filepath); }
        var f = filepath ? filepath : File.openDialog("Choose file to put XMP string to");
        if(!f) { 
			// if($.level) $.writeln("Invalid file"); 
			return;
		 }

        // if($.level) $.writeln("Embedding XMP data to " + f.fsName);
		if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript')
		var fileTypeCONST = type != undefined ? type : Pslib.getXMPConstFileType(f.fsName);

		var xmpFile = new XMPFile(f.fsName, fileTypeCONST, XMPConst.OPEN_FOR_UPDATE);
		xmpFile.putXMP(xmp);
		xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);
	} catch (e)
	{ 
		// if($.level) $.writeln( "Error: \n\n" + e); 
		return false; 
	}
	return true;
}

// write xmp to media sidecar file (.xmp)
Pslib.writeXMPtoSidecarFile = function( filepath, xmp )
{
	if(!filepath) 
	{
		var doc = app.activeDocument;
		var docNameNoExt = doc.name.getFileNameWithoutExtension();
		var documentPath = Pslib.getDocumentPath(doc);
		if(documentPath)
		{
			var location = documentPath.parent;
			filepath = new File( location +"/"+ docNameNoExt + ".xmp" );
		}
		else return false;
	}
	if(!xmp)
	{
		if(!app.documents.length) return false;
		var doc = app.activeDocument;
		xmp = Pslib.getXmp( app.activeDocument );
	}

	return Pslib.writeToFile(filepath, xmp.serialize());
}

Pslib.getXMPConstFileType = function(file)
{
	var type = XMPConst.UNKNOWN; 
	if(!file) return type;
	var extension = file.getFileExtension();

	switch(extension)
	{
		case ".psd" : { type = XMPConst.FILE_PHOTOSHOP; break; }
		case ".psb" : { type = XMPConst.FILE_PHOTOSHOP; break; }
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


//
//
////// illustrator item tags


// illustrator: get entire array of tags assigned to pageItem
Pslib.getAllTags = function( pageItem )
{
	if(Pslib.isIllustrator)
	{
		if(!pageItem){
			return;
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
				// tagsArr.push([ name, value, pageItem.uuid ]);
				// if($.level) $.writeln( "\t"+ name + ": " + value );
			}
		}
	
		return tagsArr;
	}
}

// illustrator: get array of specific tags 
// tagsArr: [ ["name", "value"], ["name", "value"]]
Pslib.getTags = function( item, tagsArr, namespace, converter)
{
	if(!app.documents.length) return;
	if(!tagsArr) tagsArr = [];
	if(!namespace) namespace = Pslib.XMPNAMESPACE;
	if(!converter) converter = [];

	var doc = app.activeDocument;

	var harvestedTagsArr = [];

	if(Pslib.isIllustrator)
	{
		if(item == undefined)
		{
			if(doc.selection)
			{
				item = doc.selection[0];
			}
			else return;
		}

		if(item instanceof Array)
		{
			var tagsArrColl = [];
			for(var i = 0; i < item.length; i++)
			{
				var tags = Pslib.getTags( item[i], tagsArr, namespace, converter);
				tagsArrColl.push(tags);
			}
			return tagsArrColl;
		}
	
		// if($.level) $.writeln( "\nGetting tags on " +  item.typename + " " + item.name);

		var tags = item.tags;
	
		if(tags.length)
		{    
			for(var i = 0; i < tags.length; i++)
			{
				var tag = tags[i];
	
				var name = tag.name;
				// you'll want to skip this one
				if(name == "BBAccumRotation") continue;
				var value = tag.value;
	
				// compare with provided array to match names
				for(var j = 0; j < tagsArr.length; j++)
				{
					if(name == tagsArr[j][0])
					{
						harvestedTagsArr.push([ name, value]);
						// harvestedTagsArr.push([ name, value, item.uuid]);
					}
				}
				// if($.level) $.writeln( "\t"+ name + ": " + value );
			}
		}
	}
	else if(Pslib.isPhotoshop)
	{
		if(item == undefined) item = doc.activeLayer.id;

		if(item instanceof Array)
		{
			var tagsArrColl = [];
			for(var i = 0; i < item.length; i++)
			{
				var tags = Pslib.getTags( item[i], tagsArr, namespace, converter);
				tagsArrColl.push(tags);
			}
			return tagsArrColl;
		}

        if((typeof item) != "number")
        {
            return;
        }

		if(tagsArr)
		{
			harvestedTagsArr = Pslib.getXmpProperties( item, tagsArr, namespace);
		}
		else
		{
			var xmp = Pslib.getXmpByID(id);
			harvestedTagsArr = Pslib.getAllNsPropertiesArray(xmp, namespace, false, false);
		}
	}

	if(converter.length)
	{
		if(harvestedTagsArr.length)
		{
			harvestedTagsArr = harvestedTagsArr.convertTags(converter);
		}
	}

	return harvestedTagsArr;
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
			
						// if($.level) $.writeln( "\t"+ name + ": " + value );
			
						tagsArr.push([name, value]);
						tagsObj[name] = value;
					}
				}
			}
		}
		return [ tagsArr, tagsObj ];
	}
}

// container functions


// photoshop LayerSet, illustrator GroupItem status
Pslib.getIsGroup = function( id )
{
    if(!app.documents.length) return false;

    var doc = app.activeDocument;
	var isGroup = false;

    if(Pslib.isPhotoshop)
    {
        if(id == undefined) id = doc.activeLayer.id;

        if((typeof id) != "number")
        {
            return;
        }

        var desc = Pslib.getLayerDescriptorByID(id);

        // container: artboard, group, frame
        var isContainer = desc.getInteger(sTID('layerKind')) == 7;

        if(isContainer)
        {    
            var isArtboard = desc.getBoolean(sTID('artboardEnabled'));
            var isFrame = desc.hasKey(sTID('framedGroup'));
            isGroup = !isArtboard && !isFrame;

			// // avoid empty groups
	        // var layerSectionEnum = desc.getEnumerationValue(sTID('layerSection'));
			// var contentIndex = tSID(layerSectionEnum).indexOf('Content');
            // var hasContent = contentIndex < 0;
            // isGroup = isGroup && hasContent;
        }

    }
    else if(Pslib.isIllustrator)
    {
		var item;

        if((typeof id) != "number")
        {
			var selection = doc.selection;
			if(selection)
			{
				item = selection[0];
				isGroup = (item.typename == "GroupItem");
			}
        }
    }
	return isGroup;
}

// artboard functions

// check for artboard status
// optimized for remote 
Pslib.isArtboard = function( layerObject )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var id = -1;
		var index = -1;
		var desc;

		var isArtboard = false;
		
		if(!layerObject)
		{
			id = doc.activeLayer.id;
		}

		if(id == undefined) return false;

		var dtype = typeof layerObject;
		if(dtype == "string")
		{
			// allow getting by name

			// OR assume index as string
			index = parseInt( layerObject );
			desc = Pslib.getLayerDescriptorByIndex(index);
		}

		if(dtype == "number")
		{
			// assume ID, will get remote reference

		}
		else if((dtype == "object"))
		{
			var str = Pslib.getDescriptorKeyValues( layerObject );
			// JSUI.quickLog(str);

			if(layerObject == doc.activeLayer)
			{
				desc = Pslib.getLayerDescriptorByID(layerObject.id);
			}
			else if( layerObject instanceof Object)
			{
				// alert("Object is a layer!");
				// JSUI.quickLog("typename: " + layerObject.typename );
				var tname = layerObject.typename;

				if(tname == "ActionDescriptor")
				{
					desc = layerObject;
				}
				else
				{
					// alert("is not remote layer!")
					// last resort, do use active layer
					var storedActiveLayer = doc.activeLayer;
					doc.activeLayer = layerObject;
					// assume active layer update was successful 
					if(storedActiveLayer != doc.activeLayer)
					{
						id = doc.activeLayer;
					}

				}

								 
			}
			// // 
			// else if(layerObject != doc.activeLayer)
			// {
			// 	// alert( layerObject.typename );

			// 	// if(t.typename == "LayerSet")


			// }
		}

		// now if id is integer, treat as layer ID and get reference
		if(desc == undefined && id > -1) 
		{
			desc = Pslib.getLayerDescriptorByID(id);
		}
		// var ltype = Pslib.getLayerObjectType( desc );

		// cheap version with active layer
		// // an artboard is internally a group/layerset 
		// if(layerObject.typename == "LayerSet") // requires object to be active
		// {
		// 	// var ref = new ActionReference();
		// 	// ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
		// 	// isArtboard = executeActionGet(ref).getBoolean(sTID('artboardEnabled'));
		// }
		if(desc)
		{
			// if(!hasContent && isTopLevelLayerObject)

			isArtboard = desc.getBoolean(sTID('artboardEnabled'));
		}

		return isArtboard;
	}
}

// select layer using its current index in the layer stack
// should not be used without getting indexes within the same script operation
Pslib.selectLayerByIndex = function ( indexInt, makeVisibleBool) //, addToSelectionBool )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var currentLayer = doc.activeLayer;

		if(makeVisibleBool == undefined) makeVisibleBool = false; 
		// if(addToSelectionBool == undefined) addToSelectionBool = false; 
		var desc = new ActionDescriptor();   
		var ref = new ActionReference();   
		ref.putIndex(cTID( "Lyr " ), indexInt )   
		desc.putReference( cTID( "null" ), ref );   
		desc.putBoolean( cTID( "MkVs" ), makeVisibleBool );   

		// if (addToSelectionBool) desc.putEnumerated(sTID("selectionModifier"), sTID("selectionModifierType"), sTID("addToSelection"));
		// executeAction(cTID('slct'), desc1, DialogModes.NO);

		executeAction( cTID( "slct" ), desc, DialogModes.NO ); 

		// return addToSelectionBool ? undefined : doc.activeLayer;  
		return doc.activeLayer;  
	}
}

// get persistent integer associated with selected layer object 
// (value does not change, except if object is copied over to a different document)
Pslib.getActiveLayerID = function ()
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

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
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var currentLayer = doc.activeLayer;
		var desc1 = new ActionDescriptor();
		var ref1 = new ActionReference();
		ref1.putIdentifier(cTID('Lyr '), idInt);
		desc1.putReference(cTID('null'), ref1);
		if (addToSelectionBool) desc1.putEnumerated(sTID('selectionModifier'), sTID('selectionModifierType'), sTID('addToSelection'));
		executeAction(cTID('slct'), desc1, DialogModes.NO);
		var selectedLayer = doc.activeLayer;

		return ( selectedLayer != currentLayer ? selectedLayer : currentLayer);
	}
	else if(Pslib.isIllustrator)
	{
		// if first arg is a string that successfully parses to an integer, get reference to PageItem via its UUID
		if(typeof idInt === "string")
		{
			if(isNaN(parseInt(idInt))) return;
			var item;
			item = doc.getPageItemFromUuid(idInt);
			if(addToSelectionBool) doc.selection = [item];
			return item;
		}
		if(typeof idInt === "number")
		{
			var artboard;
			artboard = doc.artboards[idInt];
			doc.artboards.setActiveArtboardIndex(idInt);
			if(addToSelectionBool) doc.selectObjectsOnActiveArtboard();
			return artboard;
		}
		else return false;
	}
}

// Useful for restoring layer selection/targets after non-destructive operations 
// Assumes no layer objects have been deleted in the process
// Option to execute arbitrary function while looping, and at the end.
// Will also group-select other types of layer objects
// Automatically collapses artboards / groups
Pslib.selectArtboardsCollection = function ( arr, individualFunc, globalFunc, autoCollapse )
{
	if(!app.documents.length) return;
	if(!arr) return;
	if(autoCollapse == undefined) autoCollapse = true;

	if(Pslib.isPhotoshop)
	{
		for(var i = 0; i < arr.length; i++)
		{
			try
			{
				Pslib.selectLayerByID( typeof arr[i] == "number" ? arr[i] : arr[i].id, true );		
			}
			catch(e)
			{

			}

			if(individualFunc != undefined)
			{
				try
				{
					individualFunc();
				}
				catch(e)
				{
	
				}
			}
		}

		if(globalFunc != undefined)
		{
			try
			{
				globalFunc();
			}
			catch(e)
			{

			}
		}

		if(autoCollapse) Pslib.collapseAllGroups();

		return true;
	}
	else if(Pslib.isIllustrator)
	{

	}
}

// Get array of indexes for all types of layers, including invisible 'layerSection'
// Indexes lose their meaning if layer objects are deleted or moved in the stack
Pslib.getSelectedLayerIndexes = function()
{   
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var selectedIndexes = [];

		var ref = new ActionReference();   
		ref.putEnumerated( cTID('Dcmn'), cTID('Ordn'), cTID('Trgt') );   
		var desc = executeActionGet(ref); 

		// var increment = Pslib.documentHasBackgroundLayer() ? 0 : 1; 
		var increment = Pslib.getIndexIncrement();
		
		// get indexes for target layers
		if( desc.hasKey( sTID( 'targetLayers' ) ) )
		{   
			desc = desc.getList( sTID( 'targetLayers' ));   
			var count = desc.count; 

			for(var i = 0; i < count; i++)
			{   
				selectedIndexes.push( desc.getReference(i).getIndex() + increment ); 
			}   
		}
		return selectedIndexes;   
	}
}

Pslib.getAllLayerIndexes = function()
{   
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var indexes = [];

		var ref = new ActionReference();
		ref.putEnumerated(cTID("Dcmn"), cTID("Ordn"), cTID("Trgt"));
		var desc = executeActionGet(ref);
		var count = desc.getInteger(sTID("numberOfLayers"));

		// var increment = Pslib.documentHasBackgroundLayer() ? 0 : 1; 
		var from = Pslib.getIndexIncrement();
		
		for(var i = from; i <= count; i++)
		{   
			indexes.push( i );
		}   

		return indexes;   
	}
}

// workaround for issue with nested items: 
// get collection of IDs, indexes or descriptors for top-level containers (artboards + groups)

// var obj = {
	// selected: false, 
	// getIDs: true, 
	// getIndexes: false,
	// getDescriptors: false,
	// groups: true,
	// artboards: true,
	// frames: false,
	// 		artboardsCollection: [],	// array of pre-processed artboard objects
	//  	itemsCollection: [],		// array of PathItem objects to match with artboards
	//  	specsArr: [],				// array of JSON objects to work with { id: int, uuid: string }
	//		specsArrFn: function(){},	// function to process array of JSON objects with if provided
	// level: 1  //  2 means selection of nested groups is possible (parents for these should then be ignored)
// }

//  	advanced: false		// get object with details 
// 	{ all: [], selected: [], active: [] }

Pslib.getContainers = function( obj )
{   
	if(!app.documents.length) return;
	if(!obj) obj = {};

	if(obj.getIDs == undefined) obj.getIDs = true;
	if(obj.getIndexes == undefined) obj.getIndexes = false;
	if(obj.getDescriptors == undefined) obj.getDescriptors = false;

	if(obj.level == undefined) obj.level = 1;

	// container types
	if(obj.groups == undefined) obj.groups = true;
	if(obj.artboards == undefined) obj.artboards = true;
	if(obj.frames == undefined) obj.frames = false;

	// for working with arbitrary lists of existing references
	// Photoshop Layer ID (integers), Illustrator PageItem uuid (strings)
	if(!obj.artboardsCollection) obj.artboardsCollection = [];
	if(!obj.itemsCollection) obj.itemsCollection = [];
	
	// obj.specsArr expected: existing array { name: string, id: int, (ILST uuid: string,) x: int, y, int, width: int, height: int }
	// e.g: Pslib.getLayerReferenceByID( id, { getCoordsObject: true, tags: obj.tags.length ? obj.tags : [], namespace: obj.namespace, converter: obj.converter, docSpecs: obj.docSpecs, filterExtension: obj.filterExtension }); 
	if(!obj.specsArr) obj.specsArr = [];

	// selection
	if(obj.selected == undefined) obj.selected = false;

	// nameStr = "#"

	var doc = app.activeDocument;

	// get more complex object
	// { all: [ ], selected: [ ], active: [ ] };
	if(obj.advanced)
	{
		var advObj = obj;
		advObj.advanced = false;

		advObj.selected = false;
		var allItems = Pslib.getContainers( advObj );
		
		advObj.selected = true;
		var selectedItems = Pslib.getContainers( advObj );

		// for case where we need to know which array items are part of the selection  
		// useful with operations on container collections
		var activeItems = [];

		for(var a = 0; a < allItems.length ; a++)
		{  
			var item = allItems[a];

			for(var s = 0; s < selectedItems.length; s++)
			{  
				if(item == selectedItems[s])
				{
					activeItems.push(a+1);
					continue;
				}
			}
		}

		// special condition for illustrator if no active selection
		if(Pslib.isIllustrator && !selectedItems.length)
		{
			var aab = doc.artboards.getActiveArtboardIndex();
			selectedItems = [aab];
			activeItems = [aab+1];
		}

		// chance to process specs array and/or 
		if(obj.specsArr.length) 
		{
			if(obj.specsArrFn) obj.specsArrFn( obj.specsArr, obj.artboardsCollection, obj.itemsCollection);
		}

		var advancedObject = { all: allItems, selected: selectedItems, active: activeItems };

		if(obj.specsArr.length) advancedObject.specsArr = obj.specsArr;
		if(obj.artboardsCollection.length) advancedObject.artboardsCollection = obj.artboardsCollection;
		if(obj.itemsCollection.length) advancedObject.itemsCollection = obj.itemsCollection;

		return advancedObject;
	}

	var containers = [];
	var parentsToDismiss = [];
	var idsList = [];

	if(Pslib.isPhotoshop)
	{
		var descriptors = [];

		var layerCount = Pslib.getLayerCount();
		var increment = Pslib.getIndexIncrement();

		if(obj.selected)
		{
			var targets = Pslib.getTargets();
	
			for(var i = 0; i < targets.count; i++)
			{
				// layer object reference
				var r = new ActionReference();
				var stackIndex = targets.getReference(i).getIndex() + increment; // layer index in stack of layers
	
				r.putIndex(cTID('Lyr '), stackIndex );
				var desc = executeActionGet(r);
				descriptors.push(desc);
			}
		}
		else
		{
			for(var i = 0; i < layerCount; i++)
			{   
				var layerIndex = i+increment;
	
				var r = new ActionReference();
				r.putIndex(cTID('Lyr '), layerIndex);
				var desc = executeActionGet(r);
				descriptors.push(desc);
			}
		}

		for(var i = 0; i < descriptors.length; i++)
		{   
			var desc = descriptors[i];

			// this tells us whether we're dealing with an art layer of with a group/artboard/frame
			var layerSection = desc.getEnumerationValue(sTID('layerSection'));
			var contentIndex = tSID(layerSection).indexOf('Content');

			var hasContent = contentIndex < 0;

			// if 'parentLayerID' == -1, it's nested at the top-level of the document
			var parentID = desc.getInteger(sTID('parentLayerID'));
			var isTopLevelLayerObject = obj.level == 2 ? true : parentID < 0;

			// if nested items are allowed, flag parent for removal
			if(obj.level == 2 && parentID)
			{
				if(hasContent)
				{
					parentsToDismiss.push(parentID);
				}
			}

			// skip "regular" layer and 
			if(!hasContent && isTopLevelLayerObject)
			{
				continue;
			}
			// container
			else if(hasContent && isTopLevelLayerObject)
			{
				var isArtboard = desc.getBoolean(sTID('artboardEnabled'));
				var isFrame = desc.hasKey(sTID('framedGroup'));
				var isGroup = !isArtboard && !isFrame;

				var id = desc.getInteger(sTID('layerID'));
				// var name = desc.getString(sTID('name'));

				if( isArtboard || isGroup )
				{
					if(!obj.groups)
					{
						if(isGroup) continue;
					}

					if(!obj.artboards)
					{
						if(isArtboard) continue;
					}

					if(!obj.frames)
					{
						if(isFrame) continue;
					}

					if(obj.getIDs)
					{
						containers.push(id);
						idsList.push(id);
					}
					else if(obj.getIndexes)
					{
						// get index from descriptor
						containers.push( desc.getInteger(cTID('ItmI')));
						idsList.push(id);
					}
					else if(obj.getDescriptors)
					{
						containers.push(desc);
						idsList.push(id);
					}
				}
			}
		} 
	}
	// a container can be an artboard, OR a GroupItemm, OR a clipping mask
	else if(Pslib.isIllustrator)
	{
		// .getIDs: collection of pageItem.uuids (strings)
		// .getIndexes: collection of artboard indexes (integers)

		// obj.itemCollection
		// nameStr

		// if(obj.getIDs == undefined) obj.getIDs = true;
		// if(obj.getIndexes == undefined) obj.getIndexes = false;
	
		
		// var coords = Pslib.getLayerReferenceByID( id, { getCoordsObject: true, tags: obj.tags, namespace: obj.namespace, converter: obj.converter }); 
// 

		// 

		if(obj.selected)
		{
			var selection = doc.selection;

			if(obj.artboards)
			{
				// these can be discriminated with artboard.parent.typename != "Layer"
				// containers = Pslib.getSelectedArtboardIDs();
				containers = Pslib.getArtboardsFromSelectedItems(selection, false, true, false);
			}
			// if(obj.groups)
			// {
			// 	if(selection)
			// 	{

			// 	}
			// }

		}
		else
		{
			//containers = Pslib.getAllArtboardIDs();
			containers = Pslib.getArtboardsIDs();
		}

		// illustrator 
		// .getIDs: collection of pageItem.uuids (strings)
		// .getIndexes: collection of artboard indexes (integers)

		if(obj.getIDs)
		{

		}
		else if(obj.getIndexes)
		{

		}
		else // get BOTH! 
		{

		}

		// var isArtboard = desc.getBoolean(sTID('artboardEnabled'));
		// var isFrame = desc.hasKey(sTID('framedGroup'));
		// var isGroup = !isArtboard && !isFrame;

		// var id = desc.getInteger(sTID('layerID'));
		// // var name = desc.getString(sTID('name'));

		// if( isArtboard || isGroup )
		// {
		// 	if(!obj.groups)
		// 	{
		// 		if(isGroup) continue;
		// 	}

		// 	if(!obj.artboards)
		// 	{
		// 		if(isArtboard) continue;
		// 	}

		// 	if(!obj.frames)
		// 	{
		// 		if(isFrame) continue;
		// 	}

		// 	if(obj.getIDs)
		// 	{
		// 		containers.push(id);
		// 		idsList.push(id);
		// 	}
		// 	else if(obj.getIndexes)
		// 	{
		// 		// get index from descriptor
		// 		containers.push( desc.getInteger(cTID('ItmI')));
		// 		idsList.push(id);
		// 	}
		// 	else if(obj.getDescriptors)
		// 	{
		// 		containers.push(desc);
		// 		idsList.push(id);
		// 	}
		// }
	}

	// if allowing nested containers, remove parents
	if(parentsToDismiss.length)
	{
		for(var i = parentsToDismiss.length-1; i > -1 ; i--)
		{  
			var parent = parentsToDismiss[i];

			for(var c = containers.length-1; c > -1; c--)
			{  
				if( parent == idsList[c])
				{
					// special condition: check for artboard status?
					containers.splice(c, 1);
				}
			}
		}
	}

	return containers;
}

// get list of xmp objects from array of layer ids
Pslib.getXmpFromContainers = function( containersArr )
{
    if(!app.documents.length) return;

	var xmpObjArr = [];

	if(Pslib.isPhotoshop)
	{
		if(!containersArr) containersArr = Pslib.getContainers({ });

		for(var i = 0; i < containersArr.length; i++)
		{
			var id = containersArr[i];

			// fails if !ExternalObject.AdobeXMPScript
			var xmp = Pslib.getXmpByID(id);
			xmpObjArr.push(xmp);

			// var desc = Pslib.getLayerDescriptorByID(id);
			// var layerName = desc.getString(sTID("name"));

			// JSUI.quickLog(id + ": " + layerName);
		}
	}

    return xmpObjArr;
}

Pslib.documentHasBackgroundLayer = function()
{
	if(!app.documents.length) return;

	if(Pslib.isPhotoshop)
	{
		var r = new ActionReference();
		r.putProperty(sTID("property"), sTID('hasBackgroundLayer'));
		r.putEnumerated(sTID("document"), sTID("ordinal"), sTID("targetEnum"));
		return executeActionGet(r).getBoolean(sTID('hasBackgroundLayer'));
	}
}

Pslib.documentHasActiveSelection = function( )
{
    if(!app.documents.length) return;
    var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
	{
        var ref = new ActionReference();
        ref.putEnumerated( cTID("Dcmn"), cTID("Ordn"), cTID("Trgt") );
        var desc = executeActionGet(ref);

        return desc.hasKey(sTID("selection"));
    }
}

// use this when working with layer indexes AND artboards OR a background layer present
Pslib.getIndexIncrement = function()
{
    if(!app.documents.length) return;
	if(Pslib.isPhotoshop)
	{
        return Pslib.documentHasBackgroundLayer() ? 0 : 1;
    }
}

// this yields the total number of layers (excluding a background layer if present)
Pslib.getLayerCount = function()
{
    if(!app.documents.length) return;
	if(Pslib.isPhotoshop)
	{
		var r = new ActionReference();
		r.putProperty(sTID("property"), sTID('numberOfLayers'));
		r.putEnumerated(sTID("document"), sTID("ordinal"), sTID("targetEnum"));
		var count = executeActionGet(r).getInteger(sTID('numberOfLayers'));
		return count;
    }
}

// get list of current targets (option to get only integer)
Pslib.getTargets = function( countOnly )
{
    if(!app.documents.length) return;
	if(Pslib.isPhotoshop)
	{
        var r = new ActionReference();
		r.putProperty(sTID('property'), sTID('targetLayers'));
        r.putEnumerated(sTID('document'), sTID('ordinal'), sTID('targetEnum'));

		var targets = executeActionGet(r).getList(sTID('targetLayers'));
		return countOnly ? targets.count : targets;
    }
}

Pslib.getTargetsCount = function()
{
	return Pslib.getTargets(true);
}

// get simple array of integers for selected layer objects (layersets + artboards)
// useful for restoring target layers after complex operations
Pslib.getSelectedLayerObjectIDs = function()
{
    if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var hasBackgroundLayer = Pslib.documentHasBackgroundLayer();
        if(hasBackgroundLayer && doc.layers.length == 1) return [];
        var arr = [];

        var lowestIndex = hasBackgroundLayer ? 0 : 1;
		var targets = Pslib.getTargets();

		// loop through targets and get info for each
        for(var i = 0; i < targets.count; i++)
        {
			// layer object reference
            var lref = new ActionReference();
			var stackIndex = targets.getReference(i).getIndex() + lowestIndex; // layer index in stack of layers

			// get layer descriptor
            lref.putIndex(cTID('Lyr '), stackIndex );
			var desc = executeActionGet(lref);

			// get info based on descriptor
			var layerID = desc.getInteger(sTID('layerID'));
			arr.push(layerID);
        }
        return arr;
    }
}

Pslib.getSpecsForSelectedArtboards = function(onlyIDs)
{
	if(Pslib.isPhotoshop)
	{
	   // return intersection between all artboards and selected artboards	
		var indexArr = Pslib.getSelectedLayerIndexes();
		var from = Pslib.getIndexIncrement();
		var to = Pslib.getLayerCount();

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

			var r = new ActionReference();
			r.putProperty(sTID('property'), sTID('artboardEnabled'));
			r.putIndex(sTID("layer"), i);
			var artboardEnabled = false;

			// workaround for documents without any artboards defined
			try
			{
				artboardEnabled = executeActionGet(r).getBoolean(sTID('artboardEnabled'));
			}
			catch(e)
			{

			}

			if (artboardEnabled)
			{
				// get artboard name, ID and bounds 
				var ref = new ActionReference();
				ref.putIndex( cTID( 'Lyr ' ), i);
				var layerDesc = executeActionGet(ref);
				var artboardID = layerDesc.getInteger(cTID('LyrI'));
				// if only fetching IDs, just push int to array and skip the rest
				if(onlyIDs)
				{
					artboards.push(artboardID);
					continue;
				}
				var artboardName = layerDesc.getString(sTID ('name'));
				var artboard = executeActionGet(ref).getObjectValue(sTID('artboard')),
					artboardRect = artboard.getObjectValue(sTID('artboardRect')),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom'))
					};
				
				artboards.push({ name: artboardName, index: i, id: artboardID, x: bounds.left, y: bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
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
			doc.artboards.setActiveArtboardIndex(artboardIndex);
			doc.selectObjectsOnActiveArtboard();

			placeholder = Pslib.getArtboardItem(artboard, "#");
			var specsObj = { name: artboard.name.toFileSystemSafeName(), id: (artboardIndex+1) };
			if(placeholder)
			{

				// swap property names when found in bidimensional/tridimensional array
				// affects first item for each set, a third item is allowed, may be useful for presentation purposes
				//
				// var originalArr = [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ];
				// var converterArr = [ [ "source", "gitUrl" ], [ "destination", "relativeExportLocation" ] ]; 
				// var newArr =  originalArr.convertTags(converterArr); // yields [ [ "gitUrl", "~/file.psd"], [ "range", "1-8"], [ "relativeExportLocation", "./images"] ];
				//
				// then convert back with reversed flag, and content should match precisely
				// var reconvertedArr = newArr.convertTags(converterArr, true); // yields [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ]

				// var tags = Pslib.getTags(placeholder, [ ["assetID", null], ["customMips", null] ]);
				var tags = Pslib.getTags( placeholder, Pslib.assetKeyValuePairs );
				if(tags.length)
				{
					// // if conversion needed...?
					// var convertedTags = tags.convertTags(Pslib.assetKeyConversionArr);
					// var reversedTag = convertedTags.convertTags(Pslib.assetKeyConversionArr, true);

					specsObj = Pslib.arrayToObj( tags, specsObj );
				}
			}
			artboardsCoords.push(specsObj);
		}

		if(initialSelection) doc.selection = initialSelection;

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
		var from = Pslib.getIndexIncrement();
		var to = Pslib.getLayerCount();

		var artboards = [];
		for (var i = from; i <= to; i++)
		{
			// (r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboardEnabled'));

			var r = new ActionReference();
			r.putProperty(sTID('property'), sTID('artboardEnabled'));
			r.putIndex(sTID('layer'), i);
			var artboardEnabled = false;

			// this may slow down operations
			try{ 
				artboardEnabled = executeActionGet(r).getBoolean(sTID('artboardEnabled'));
			} catch(e) { };

			if (artboardEnabled) {
				// (r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboard'));
				// r.putIndex(sTID("layer"), i);
	
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
				var artboard = executeActionGet(ref).getObjectValue(sTID('artboard')),
					artboardRect = artboard.getObjectValue(sTID('artboardRect')),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom'))
					};
				artboards.push({ name: artboardName, index: i, id: artboardID, x: bounds.left, y: bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
			 }
		}
	
		return artboards;
	}
	else if(Pslib.isIllustrator)
	{
		// TODO: this is nowhere as complete as Pslib.getSpecsForSelectedArtboards()
		// return Pslib.getArtboardCollectionCoordinates();

		// var doc = app.activeDocument;

		var artboardsCoords = [];

		if(onlyIDs)
		{
			for(var i = 0; i < doc.artboards.length; i++)
			{
				artboardsCoords.push(id);
			}
			return artboardsCoords;
		}


		var initialSelection = doc.selection;

		var artboards = Pslib.getAllArtboards();

		var placeholder;
		
		for(var i = 0; i < artboards.length; i++)
		{
			var artboard = artboards[i];
			// var artboardIndex = Pslib.getArtboardIndex(artboard, true);
			doc.artboards.setActiveArtboardIndex(i);
			doc.selectObjectsOnActiveArtboard();


			placeholder = Pslib.getArtboardItem(artboard, "#");
			var specsObj = { name: artboard.name.toFileSystemSafeName(), id: (i+1) };
			if(placeholder)
			{
				// swap property names when found in bidimensional/tridimensional array
				// affects first item for each set, a third item is allowed, may be useful for presentation purposes
				//
				// var originalArr = [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ];
				// var converterArr = [ [ "source", "gitUrl" ], [ "destination", "relativeExportLocation" ] ]; 
				// var newArr =  originalArr.convertTags(converterArr); // yields [ [ "gitUrl", "~/file.psd"], [ "range", "1-8"], [ "relativeExportLocation", "./images"] ];
				//
				// then convert back with reversed flag, and content should match precisely
				// var reconvertedArr = newArr.convertTags(converterArr, true); // yields [ [ "source", "~/file.psd"], [ "range", "1-8"], [ "destination", "./images"] ]

				// var tags = Pslib.getTags(placeholder, [ ["assetID", null], ["customMips", null] ]);
				var tags = Pslib.getTags( placeholder, Pslib.assetKeyValuePairs );
				if(tags.length)
				{
					// // if conversion needed...?
					// var convertedTags = tags.convertTags(Pslib.assetKeyConversionArr);
					// var reversedTag = convertedTags.convertTags(Pslib.assetKeyConversionArr, true);

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

Pslib.getAllArtboards = function()
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;
	var artboards = [];

	if(Pslib.isPhotoshop)
	{
		// get artboard IDs only
		var specs = Pslib.getSpecsForAllArtboards(true); // faster
		
		for(var i = 0; i < specs.length; i++)
		{
			var artboardRef = Pslib.getArtboardReferenceByID(specs[i]);
			artboards.push(artboardRef);
		}
	}
	else if(Pslib.isIllustrator)
	{
		// Document.artboards is not a typical Array, use this to work around
		for(var i = 0; i < doc.artboards.length; i++)
		{
			artboards.push(doc.artboards[i]);
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

// TO DEPRECATE IN FAVOR OF AM LAYER REF
// get more complete data set for artboards collection 

// typically used in conjunction with Pslib.getSpecsForSelectedArtboards()/Pslib.getSpecsForAllArtboards()
// based on "light" specs quickly obtained from artboards, select layer objects to gather custom xmp data if present on layer objects
// var obj = { dictionary: [ ["propertyname1", null], ["propertyname2", null], ["propertyname3", null] ], converter: [ [ "layerProperty", "docArrayItemQualifier"] ] }
// var dictionary = Pslib.getXmpDictionary( layer, { assetID: null, source: null, hierarchy: null, specs: null, custom: null }, false, false, false, namespace ? namespace : Pslib.XMPNAMESPACE);
      
Pslib.getAdvancedSpecs = function( specsArr, obj )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	// if(Pslib.isPhotoshop)
	// {
		// if(!specsArr) specsArr = Pslib.isPhotoshop ? Pslib.getSpecsForSelectedArtboards() : Pslib.getArtboardCollectionCoordinates(); // this still needs to be finetuned for illustrator
		if(!specsArr) specsArr = Pslib.getSpecsForSelectedArtboards();
		if(!obj) obj = {};
		if(!obj.dictionary) obj.dictionary = Pslib.arrayToObj(Pslib.assetKeyValuePairs);
		if(!obj.namespace) obj.namespace = Pslib.XMPNAMESPACE;
		if(!obj.converter) obj.converter = Pslib.assetKeyConversionArr; 

		var initialSelection;
		if(Pslib.isIllustrator) initialSelection = doc.selection;
		var updatedSpecsArr = [];

		for(var i = 0; i < specsArr.length; i++)
		{
			var specsObj = specsArr[i];
			// var layerObj = Pslib.isPhotoshop ? Pslib.selectLayerByID( specsObj.id, false ) : ;
			// var layerObj = Pslib.selectLayerByID( specsObj.id, false ); // illustrator purposefully returns undefined
			var layerObj;

			if(obj.dictionary)
			{
				// Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "index", null ] ];
				// Pslib.isPhotoshop ? 
				// if(Pslib.isIllustrator) Pslib.getArtboardCoordinates(originalArtboard)
				// var keyValuePairs = Pslib.isPhotoshop ? Pslib.getXmpDictionary( layerObj, obj.dictionary, false, false, false, obj.namespace) : ( [ /* get artboard item tags */ ] );
				var keyValuePairs = Pslib.getXmpDictionary( Pslib.isPhotoshop ? specsObj.id : layerObj, obj.dictionary, false, false, false, obj.namespace);
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

		// this does not restore the initial illustrator selection 
		if(Pslib.isPhotoshop)
		{
			// if(Pslib.isPhotoshop)
			// {
			// 	// restore selection in layers palette 
			// 	for(var i = 0; i < specsArr.length; i++)
			// 	{
			// 		if(specsArr[i])
			// 		{
			// 			if(specsArr[i].id) Pslib.selectLayerByID( specsArr[i].id, true );
			// 		}
			// 	}
			// }

			// Pslib.selectArtboardsCollection(specsArr);
		}
		else if(Pslib.isIllustrator)
		{
			if(initialSelection)
			{
				doc.selection = initialSelection;
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

// get artboard by name (not 100% accurate if multiple objects with same name)
Pslib.getArtboardByName = function (nameStr, activateBool)
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;
	var artboard;

	if(Pslib.isPhotoshop)
	{
		artboard = doc.layers.getByName(nameStr);
		if(artboard)
		{
			if(activateBool)
			{
				doc.activeLayer = artboard;
			}
		}
	}
	else if(Pslib.isIllustrator)
	{
		artboard = doc.artboards.getByName(nameStr);

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
		}
	}
	return artboard;
}

// get artboard index without having to make it active
Pslib.getArtboardIndex = function (artboard, activateBool)
{
	if(!app.documents.length) return;
	
	var doc = app.activeDocument;

	if(Pslib.isIllustrator)
	{
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
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isIllustrator)
	{
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
	if(!app.documents.length) return [];

	var artboardNames = [];
	if(Pslib.isIllustrator)
	{
		if(!artboards)
		{
			artboards = app.activeDocument.artboards;
		}
	}
	else if(Pslib.isPhotoshop)
	{
		if(!artboards)
		{
			artboards = Pslib.getSpecsForAllArtboards();
		}
	}

	for(var i = 0; i < artboards.length; i++)
	{
		artboardNames.push(artboards[i].name);
	}

	return artboardNames;
}

//
//
// Photoshop only:

// fetch pure descriptor
Pslib.getLayerDescriptorByIndex = function( index )
{
    if(!app.documents.length) return;

	if(Pslib.isPhotoshop)
	{
        var r = new ActionReference();
        r.putIndex(cTID('Lyr '), index ); 
        var desc = executeActionGet(r);
        return desc;
    }
}

Pslib.getLayerDescriptorByID = function( id )
{
	if(!app.documents.length) return;

	if(Pslib.isPhotoshop)
	{
		var r = new ActionReference();    
		r.putIdentifier(sTID('layer'), id);
		var desc = executeActionGet(r);
        return desc;
    }
}

// get remote target reference (typically for modifying properties without selecting)
Pslib.getLayerTargetByID = function( id )
{
	if(!app.documents.length) return;

	if(Pslib.isPhotoshop)
	{
		var r = new ActionReference();    
		r.putIdentifier(sTID('layer'), id);

		var t = new ActionDescriptor();
		t.putReference( cTID('null'), r );

        return t;
    }
}

Pslib.getLayerIndexByID = function( id )
{
	if(!app.documents.length) return;

	if(Pslib.isPhotoshop)
	{
		var ref = new ActionReference();
		ref.putProperty (sTID ('property'), sTID ('itemIndex'));
		ref.putIdentifier( cTID('Lyr '), id ); 
		var index = executeActionGet(ref).getInteger(sTID('itemIndex'));

		return index;
    }
}

Pslib.duplicateObjectsToArtboards = function( objectIDsArr, artboardIDsArr)
{
    if(!app.documents.length) return;

	var doc = app.activeDocument;

    if(objectIDsArr == undefined) objectIDsArr = [];
    if(artboardIDsArr == undefined) artboardIDsArr = [];

    var duplicatedObjects = [];

	if(Pslib.isPhotoshop)
	{
        var targets = objectIDsArr.length ? objectIDsArr : Pslib.getSelectedLayerObjectIDs();
        var targetCount = objectIDsArr.length;

        var currentLayerID = doc.activeLayer.id;
        var parentArboard = Pslib.selectParentArtboard();
        if(!parentArboard)
        {
            JSUI.showInfo("Select an object located on an artboard, and try again.");
            return duplicatedObjects;
        }

        var artboardIDs = artboardIDsArr.length ? artboardIDsArr : Pslib.getAllArtboardIDs(); 
        var parentArtboardID = doc.activeLayer.id;

        Pslib.selectLayerByID(currentLayerID, false);

        var indexIncr = 0;

        // loop through targets and get info for each
        for(var i = 0; i < artboardIDs.length; i++)
        {
            var artboardID = artboardIDs[i];
            if(artboardID == parentArtboardID) continue;

            var duplicates = [];
            for(var j = 0; j < targetCount; j++)
            {
                var targetID = targets[j];
                if(!targetID) continue;

                var ind = Pslib.getLayerIndexByID(artboardID)-1;

                var d = new ActionDescriptor();
                var r = new ActionReference();
                r.putEnumerated(sTID('layer'), sTID('ordinal'), sTID('targetEnum'));
                d.putReference(sTID('null'), r);

                r = new ActionReference();
                r.putIndex(sTID('layer'), ind);
                indexIncr++;

                d.putReference(sTID('to'), r);
                d.putBoolean(sTID('duplicate'), true);
                d.putBoolean(sTID('adjustment'), false);
                d.putInteger(sTID('version'), 5);

                var list = new ActionList();
                list.putInteger(36);
                d.putList(sTID('layerID'), list);

                var dupeRef;
                try{
                    executeAction(sTID('move'), d, DialogModes.NO);
                    dupeRef = Pslib.getLayerDescriptorByID(doc.activeLayer.id);
                }catch(e){ }

                if(dupeRef) duplicates.push(dupeRef);
                Pslib.selectLayerByID(currentLayerID, false);
            }

            duplicatedObjects.push(duplicates);
        }
    }

    return duplicatedObjects;
}

// get usable layer reference from persistent layer ID, without having to select layer
// target can be an art layer, a group of layers, an artboard or a frame
// option to return basic coordinates object, ignoring styles-related geometry and skipping invisible objects

// scan for specific tags, or return all properties for given namespace
// var coords = Pslib.getLayerReferenceByID( 128, { getCoordsObject: true, skipInvisible: false, tags: [["assetID", null], ["profile", null]] })

// for best results, make sure custom namespace+nsprefix is registered prior to launching function
// var obj = 
// {
	// getCoordsObject: false,			// default false, must be true for anything coordinates-related to be returned
	// precision: true,					// 0.0001 by default, recommend using float between 0.01 and 0.00005
	// ignoreStyles: false,
	// tags: [], 						// expected: bidimensional array
	// taggedItemNameStr: "#",			// illustrator only: name of tagged item in target container
	// converter: [],					// converter for tag/property names
	// namespace: Pslib.XMPNAMESPACE,	// ns + nsprefix should be already registered at this point
	// namespacePrefix: Pslib.XMPNAMESPACEPREFIX,
	// getAllNsProperties: false,
	// // roundValues: false,			// 
	// tagsAsArray: false
	// docSpecs: { } // document specs object for illustrator offsets
// }

Pslib.getLayerReferenceByID = function( id, obj )
{
	if(!app.documents.length) return;
	if(!obj) obj = {};

	if(obj.getCoordsObject == undefined) obj.getCoordsObject = false;
	if(obj.precision == undefined) obj.precision = 0.0001;
	if(obj.ignoreStyles == undefined) obj.ignoreStyles = false;
	if(obj.skipInvisible == undefined) obj.skipInvisible = true;
	if(obj.getAllNsProperties == undefined) obj.getAllNsProperties = false;
	// if(obj.roundValues == undefined) obj.roundValues = true;
	if(obj.taggedItemNameStr == undefined) obj.taggedItemNameStr = "#";
	if(obj.filterExtension == undefined) obj.filterExtension = false;
	if(obj.keepType == undefined) obj.keepType = false; // default removes coords.type property

	var mustRegisterNameSpace = false;
	// tags: ILST tag names, PSHP xmp property names
	// bidimensional structure is assumed
	if(!obj.tags)
	{
		obj.tags = [];
	}

	if(obj.tags.length || obj.getAllNsProperties)
	{
		if(!obj.namespace)
		{
			if(!obj.namespacePrefix) obj.namespacePrefix = Pslib.XMPNAMESPACEPREFIX;
			obj.namespace = Pslib.XMPNAMESPACE;

			// dump namespace collection to string (costly, avoid if possible)
			var namespacesStr = XMPMeta.dumpNamespaces();
			mustRegisterNameSpace = namespacesStr.match(obj.namespace) != null;

			if(mustRegisterNameSpace)
			{
				XMPMeta.registerNamespace(obj.namespace, obj.namespacePrefix);
			}
		}

		// at this point, if using dedicated namespace, we may not have a prefix defined (needed for console log & debugging)
		if(!obj.namespacePrefix)
		{
			// beware when XMPMeta does not exist!
			obj.namespacePrefix = XMPMeta.getNamespacePrefix(obj.namespace);
		}
	}

	var doc = app.activeDocument;
	var coords = {};
	var harvestedTags = [];

    if(Pslib.isPhotoshop)
	{
		// if no arguments provided, assume target is Document.activeLayer
		if(id == undefined)
		{
			id = doc.activeLayer.id;
		}

        // var r = new ActionReference();    
        // r.putIdentifier(sTID("layer"), id);
		// var ref = executeActionGet(r);
		var ref = Pslib.getLayerDescriptorByID(id);

		if(obj.getCoordsObject)
		{
			coords.name = ref.getString(sTID("name"));
			coords.id = id;

			// this tells us whether we're dealing with an art layer of with a group/artboard/frame
			var layerSection = ref.getEnumerationValue(sTID('layerSection'));
			var contentIndex = tSID(layerSection).indexOf('Content');
			var hasContent = contentIndex < 0;

			// if reference object has no parent layer ID, it's nested at the top-level of the document
			var parentID = ref.getInteger(sTID('parentLayerID'));
			var isTopLevelLayerObject = parentID < 0; 
			// JSUI.quickLog("parentID: " + parentID);
			// JSUI.quickLog("isTopLevelLayerObject: " + isTopLevelLayerObject);

			var isVisible = ref.getBoolean(cTID( "Vsbl" ));
			if(!isVisible) coords.visible = isVisible; // only include visibility info if layer object is hidden?
			// coords.visible = isVisible;
			if(obj.skipInvisible && !isVisible) return;

			// determine if raster mask and/or vector mask is present 
			var hasRasterMask = ref.hasKey(sTID('userMaskEnabled')) ? ref.getBoolean(sTID('userMaskEnabled')) : false;  
			
			if(hasRasterMask)
			{
				coords.rasterMask = true;
			  	coords.rasterMaskEnabled = ref.hasKey(sTID('userMaskEnabled')) ? ref.getBoolean(sTID('userMaskEnabled')) : false;  
			}

			var hasVectorMask = ref.hasKey(sTID('vectorMaskEnabled')) ? ref.getBoolean(sTID('vectorMaskEnabled')) : false;  
			if(hasVectorMask)
			{
				coords.vectorMask = true;
				coords.vectorMaskEnabled =  ref.getBoolean(sTID('vectorMaskEnabled')); 
				coords.vectorMaskEmpty = ref.hasKey(sTID('vectorMaskEmpty')) ? ref.getBoolean(sTID('vectorMaskEmpty')) : false; 

				if(ref.hasKey(sTID('pathBounds')))
				{
					var vectorBounds = ref.getObjectValue(sTID('pathBounds')).getObjectValue(sTID('pathBounds'));

					coords.vectorMaskX = vectorBounds.getUnitDoubleValue(sTID('left'));
					coords.vectorMaskY = vectorBounds.getUnitDoubleValue(sTID('top'));
					coords.vectorMaskWidth = vectorBounds.getUnitDoubleValue(sTID('right')) - coords.vectorMaskX;
					coords.vectorMaskHeight = vectorBounds.getUnitDoubleValue(sTID('bottom')) - coords.vectorMaskY;
				}
			}

			// prepare container for bounds
			var rect;

			// "art" layer: shape, smartobject, adjustment layer...
			if(!hasContent && isTopLevelLayerObject)
			{
				// also test with 'boundsNoMask'
				rect = obj.ignoreStyles ? ref.getObjectValue(sTID("boundsNoEffects")) : ref.getObjectValue(sTID("bounds"));

				coords.x = rect.getDouble(sTID("left"));
				coords.y = rect.getDouble(sTID("top"));
				coords.width = rect.getDouble(sTID("right")) - coords.x;
				coords.height = rect.getDouble(sTID("bottom")) - coords.y;
				coords.type = "artlayer";
				var artLayerObjectType = Pslib.getLayerObjectType( ref );
				
				// if shape layer or solid fill, get color 
				if(artLayerObjectType == "kVectorSheet" || artLayerObjectType == "kSolidColorSheet")
				{
					coords.kind = artLayerObjectType == "kVectorSheet" ? "shape" : "solidfill";

					var l = ref.getList(cTID('Adjs'));
					var cd = l.getObjectValue(0);
					var c = cd.getObjectValue(cTID('Clr '));
			
					var r = Math.round(c.getDouble(cTID('Rd  ')));
					var g = Math.round(c.getDouble(cTID('Grn ')));
					var b = Math.round(c.getDouble(cTID('Bl  ')));
			
					coords.color = "#"+Pslib.RGBtoHex(r, g, b);
				}
				else if( artLayerObjectType == "kTextSheet")
				{
					coords.kind = "text";

					var fontInfo = Pslib.getTextItemInfo( ref );

					coords.text = fontInfo.text;
					coords.font = fontInfo.font;
					coords.size = fontInfo.size;
					coords.color = fontInfo.color; // includes leading "#"
				}
				// get smartobject transform info
				else if( artLayerObjectType == "kSmartObjectSheet")
				{
					coords.kind = "smartobject";

					var smartObjectRef = ref.getObjectValue(sTID('smartObject'));
					// 'smartObject' == 1058 :: DescValueType.OBJECTTYPE has 5 properties
						// ...placed(2813) = 2813 :: DescValueType.ENUMERATEDTYPE // 'vectorData' or 'rasterizeContent'
						// ...documentID(1148150601) = uuid:UNIQUEID :: DescValueType.STRINGTYPE
						// ...linked(1282304868) = true :: DescValueType.BOOLEANTYPE
						// ...fileReference(1181314130) = Vector Smart Object.ai :: DescValueType.STRINGTYPE
						// ...link(1282304800) = ccLibrariesElement(3030) :: DescValueType.OBJECTTYPE


					var smartObjectContentType = tSID(smartObjectRef.getEnumerationValue(sTID('placed'))); 
						// 'vectorData'   		.PDF, .SVG, .AI (will open with Illustrator)
						// 'rasterizeContent'   .PNG, .PSB etc (opens a separate document)

					var smartObjectLinked = smartObjectRef.getBoolean(sTID("linked"));
					coords.contentType = smartObjectContentType;

					var documentID = smartObjectRef.getString(sTID('documentID')); 
					if(documentID) coords.documentID = documentID;

					var fileReference = smartObjectRef.getString(sTID('fileReference')); 
					if(fileReference) coords.fileReference = fileReference;

					if(smartObjectLinked)
					{
						var linkType = smartObjectRef.getType(sTID("link"));
						var linkPath;

						// the type of data associated with this property 
						if(linkType)
						{
							var link;
							var elementReference;
							var libraryName;
							// var dateModified; // 5045, double
							// var adobeStockId; // 5046, string
							// var adobeStockLicenseState; // 5047, string

							switch (linkType)
							{		
								// ccLibrariesElement == 3030
								// element from user libraries, which requires extra attention 
								case DescValueType.OBJECTTYPE:
									linkPath = smartObjectRef.getObjectValue(sTID("link"));
									if(linkPath)
									{
										// 'link'{ typename: "ActionDescriptor", count: 6 }
										// ......elementReference(591752274) = cloud-asset://cc-api-storage.adobe.io/assets/adobe-libraries/UNIQUEID;node=UNIQUEID :: DescValueType.STRINGTYPE
										// ......name(1315774496) = Vector Smart Object :: DescValueType.STRINGTYPE
										// ......libraryName(5044) = My Library :: DescValueType.STRINGTYPE
										// ......dateModified(5045) = 123456789000 :: DescValueType.DOUBLETYPE
										// ......adobeStockId(5046) =  :: DescValueType.STRINGTYPE
										// ......adobeStockLicenseState(5047) = 5047 :: DescValueType.ENUMERATEDTYPE
									
										elementReference = linkPath.getString(sTID('elementReference')); 
										if(elementReference) link = elementReference;

										libraryName = linkPath.getString(sTID('libraryName')); 

										// dateModified = linkPath.getDouble(sTID('dateModified')); 
										// adobeStockId = linkPath.getString(sTID('adobeStockId')); 
										// adobeStockLicenseState = linkPath.getString(sTID('adobeStockLicenseState')); 

									}									
									break;

								// alias is a link to a local file
								case DescValueType.ALIASTYPE:
									link = smartObjectRef.getPath(sTID("link"));
									break;
								// unclear reference
								case DescValueType.STRINGTYPE:
									link = smartObjectRef.getString(sTID("link"));
									break;
								default:
									break;
							}

							// var link = smartObjectRef.getPath(sTID("link"));
							if(link) coords.link = link instanceof File ? link.fsName : link;

							if(libraryName) coords.library = libraryName;

							// if(dateModified) coords.dateModified = dateModified;
							// if(adobeStockId) coords.adobeStockId = adobeStockId;
							// if(adobeStockLicenseState) coords.adobeStockLicenseState = adobeStockLicenseState;
						}
					}

					// extra information about smartobject size + position

					var d = ref.getObjectValue(sTID("smartObjectMore")).getList(sTID("transform"));
					// var d = ref.getObjectValue(sTID("smartObjectMore")).getList(sTID("nonAffineTransform"));
		 
					// Smartobject transform data is an array of 8 doubles, coordinates for each corner. 
					// Rotation can be inferred from this, provided reverse-engineering of a complex warp object
					// var warp = d.getObjectValue(sTID("warp"));
					// var warpRotation = tSID(warp.getEnumerationValue(sTID("warpRotate"))); 

					var x = [d.getDouble(0), d.getDouble(2), d.getDouble(4), d.getDouble(6)];
					var y = [d.getDouble(1), d.getDouble(3), d.getDouble(5), d.getDouble(7)];
				   
					// current smartobject scaling state, INCLUDING borders of transparent pixels
					var left = Math.min(x[0], Math.min(x[1], Math.min(x[2], x[3])));
					var right = Math.max(x[0], Math.max(x[1], Math.max(x[2], x[3])));

					var top = Math.min(y[0], Math.min(y[1], Math.min(y[2], y[3])));
					var bottom = Math.max(y[0], Math.max(y[1], Math.max(y[2], y[3])));
		 
					// var rect = [ UnitValue(left,"px"), UnitValue(top,"px"), UnitValue(right,"px"), UnitValue(bottom,"px") ];
					// var rect = [ left, top, right, bottom ]; // assuming pixels, may not be wise

					coords.x = left;
					coords.y = top;

					coords.width = Math.abs(right - left);
					coords.height = Math.abs(top - bottom);

					// // yield 45 everytime...? check with nonAffineTransform
					// var angle = Math.atan(coords.height / coords.width) * 180.0 / Math.PI;
					// coords.angle = angle;

				}
				else
				{
					// catch-all for other types 
					coords.kind = artLayerObjectType;

				}

				// for CSS, if handling some aspects of layer-based styles, do it here
				// e.g. color overlay

				var colorOverlayHex;

				var hasStylesKey = ref.hasKey(sTID('layerEffects'));
				var stylesVisibleKey = ref.hasKey(sTID('layerFXVisible'));
		
				if(hasStylesKey && stylesVisibleKey)
				{
					var styles = ref.getObjectValue(sTID('layerEffects'));
					var stylesVisible = ref.getBoolean(sTID('layerFXVisible')); 
		
					if(styles && stylesVisible)
					{
						var hasColorOverlayKey = styles.hasKey(sTID('solidFill'));
						if(hasColorOverlayKey)
						{
							var col = styles.getObjectValue(sTID('solidFill'));
							var isEnabled = col.getBoolean(sTID('enabled'));
							if(isEnabled)
							{
								var c = col.getObjectValue(sTID('color')); 
								
								var color = new SolidColor;
								color.rgb.red = c.getDouble(cTID('Rd  '));
								color.rgb.green = c.getDouble(cTID('Grn '));
								color.rgb.blue = c.getDouble(cTID('Bl  '));

								colorOverlayHex = color.rgb.hexValue;

								// this replaces a solid fill's value in the returned object  
								if(colorOverlayHex != undefined) coords.color = "#"+colorOverlayHex;
							}
						}
					}

				}

			}

			// "layerSection" container abstraction: group, frame, artboard.
			else if(hasContent)
			{
				// typename is "LayerSet"
				// var containerObjectType = ref.getInteger(sTID('layerKind')) == 7;

				var isArtboard = ref.getBoolean(sTID('artboardEnabled'));
				var isFrame = ref.hasKey(sTID('framedGroup'));
				var isGroup = !isArtboard && !isFrame;

				rect = isArtboard ? ref.getObjectValue(sTID("artboard")).getObjectValue(sTID("artboardRect")) : ( obj.ignoreStyles ? ref.getObjectValue(sTID("boundsNoEffects")) : ref.getObjectValue(sTID("bounds"))); 

				coords.x = rect.getDouble(sTID("left"));
				coords.y = rect.getDouble(sTID("top"));
				coords.width = rect.getDouble(sTID("right")) - coords.x;
				coords.height = rect.getDouble(sTID("bottom")) - coords.y;

				// if group in a context which includes artboards, coordinates may be those of the parent document
				if(isGroup)
				{
					// JSUI.quickLog( );
				}

				var type =  isArtboard ? "artboard" : (isFrame ? "frame" : "group");
				coords.type = type;

				// if handling container styles, do it here

			}

			// whichever layer object type, manage harvesting of its XMP properties here

			// var harvestedTags = [];

			// conflict with obj.getAllNsProperties -- tags array must not be empty
			if(obj.tags.length || ( obj.getAllNsProperties && obj.tags.length == 0))
			{
				// Pslib.getXmpByID( coords.id );
				var xref = new ActionReference();
				xref.putProperty( cTID( 'Prpr' ), sTID( "metadata" ) );
				xref.putIdentifier(sTID("layer"), coords.id);
				var xdesc = executeActionGet(xref);
				var xmpData;
				try{
					xmpData = xdesc.getObjectValue(sTID( "metadata" )).getString(sTID( "layerXMP" ));
				}catch(e){ 
					// JSUI.quickLog("ERROR GETTING XMP FROM " + coords.id);
				}
		
				if(typeof xmpData == "string")
				{
					// JSUI.quickLog("\n\n\n"+xmpData+"\n");
					xmpData = new XMPMeta(xmpData);

					// scan for tags
					if(obj.getAllNsProperties)
					{
						var xmpIter = xmpData.iterator(XMPConst.ITERATOR_JUST_CHILDREN, obj.namespace, "");
						var next = xmpIter.next();
				
						while (next)
						{
							var propName = next.path.replace( obj.namespacePrefix, "" ); 
							var propValue = decodeURI(next);
							propValue = Pslib.autoTypeDataValue(propValue, false, false); // empty string allowed, null not allowed 

							harvestedTags.push([propName, propValue]);
							next = xmpIter.next();
						}

					}
					else
					{
						for(var xt = 0; xt < obj.tags.length; xt++)
						{
							var xtTag = obj.tags[xt];
							if(xtTag.length > 1)
							{
								var propName = xtTag[0];
								if(propName != undefined)
								{
									var propValue = xtTag[0];
									if(propValue != undefined)
									{
										propValue = xmpData.getProperty(obj.namespace, propName);	
										propValue = decodeURI(propValue);
										propValue = Pslib.autoTypeDataValue(propValue, false, false); // empty string allowed, null not allowed 
										harvestedTags.push([propName, propValue]);
									}
								}
							}
						}
					}
				}
			}

			// remove "type" property from resulting coordinates object
			if(!obj.keepType) coords.type = undefined;

		}

        // return obj.getCoordsObject ? coords : ref;
    }
	// for illustrator .getLayerReferenceByID refers to containers
	else if(Pslib.isIllustrator)
	{
		// var itemNameStr = obj.taggedItemNameStr ? obj.taggedItemNameStr : "#";
		var ref;
		var isArtboard = false;
		var isGroup = false;
		var isClipped = false;

		var index;
		var itemUUID;

		var selection = doc.selection; // restore selection later 

		if(id == undefined)
		{
			id = doc.artboards.getActiveArtboardIndex();
			ref = doc.artboards[id];
			isArtboard = true;
			index = id;
		}

		// if number, assume artboard index
		if(typeof id == "number")
		{
			ref = doc.artboards[id];
			isArtboard = true;
			index = id;
		}
		// detect UUID int string 
		else if(typeof id === "string")
		{
			if(!isNaN(parseInt(id))) 
			{
				itemUUID = id;
				coords.uuid = itemUUID;
			}
		}

		else if(typeof id == "object")
		{
			// detect custom object
			if( (typeof id.id === "number") && (id.name != undefined) )
			{
				ref = id.id;
				isArtboard = true;
				index = id.id;
			}
			else if( (typeof id.id === "string") )
			{
				if(!isNaN(parseInt(id.id)))
				{
					itemUUID = id.id;
					coords.uuid = itemUUID;
				}
			}
			// if passed anonymous or arbitrary PageItem, get matching artboard

			// GroupItem, CompoundPath
			// geometricBounds, visibleBounds, controlBounds
			else if(id.typename == "GroupItem")
			{
				isGroup = true;
				ref = id;
				itemUUID = id.uuid;
				coords.uuid = itemUUID;
			}
			else if(id.typename == "PathItem" && id.clipped)
			{
				isClipped = true;
				ref = id;
				itemUUID = id.uuid;
				coords.uuid = itemUUID;
			}
			else
			{
				// ref = Pslib.getItemsOverlapArtboard();
				ref = Pslib.getArtboardsFromSelectedItems( [id], false, false );
				if(ref)
				{
					id = doc.artboards.getActiveArtboardIndex();
					ref = doc.artboards[id];
					isArtboard = true;
				}
			}
		}

		if(!obj.getCoordsObject && !ref && (itemUUID.length || coords.uuid))
		{
			ref = doc.getPageItemFromUuid(itemUUID);
			return ref;
		}

		if(obj.getCoordsObject)
		{
			if(!obj.docSpecs) obj.docSpecs = Pslib.getDocumentSpecs();

			var tolerance = (typeof obj.precision === "number") ? obj.precision : 0.0001;

			if(isArtboard)
			{
				coords = Pslib.getArtboardCoordinates(ref, tolerance);

				// adjustments for object coordinates to match visible bounds of illustrator artwork
				if(typeof index === "number")
				{
					coords.id = index;
					coords.index = index;

					coords.x += (-obj.docSpecs.topLeft[0]);
					coords.y += obj.docSpecs.topLeft[1];
				}
			}
			else if(isGroup)
			{
				coords.name = ref.name;

				coords.id = "GroupItem";
				coords.uuid = ref.uuid;

				coords.width = ref.width;
				coords.height = ref.height;
				coords.x = ref.left;
				coords.y = ref.top;

				coords.x = coords.x.adjustFloatPrecision(tolerance);
				coords.y = coords.y.adjustFloatPrecision(tolerance);
				coords.width = coords.width.adjustFloatPrecision(tolerance);
				coords.height = coords.height.adjustFloatPrecision(tolerance);

				coords.x += (-obj.docSpecs.topLeft[0]);
				coords.y += obj.docSpecs.topLeft[1];
			}
			else if(isClipped)
			{
				coords.name = ref.name;
				coords.uuid = ref.uuid;

				coords.id = "Clipped";
				coords.width = ref.width;
				coords.height = ref.height;
				coords.x = ref.left;
				coords.y = ref.top;

				coords.x = coords.x.adjustFloatPrecision(tolerance);
				coords.y = coords.y.adjustFloatPrecision(tolerance);
				coords.width = coords.width.adjustFloatPrecision(tolerance);
				coords.height = coords.height.adjustFloatPrecision(tolerance);

				coords.x += (-obj.docSpecs.topLeft[0]);
				coords.y += obj.docSpecs.topLeft[1];

				coords.vectorMask = true;
				coords.vectorMaskX = coords.x;
				coords.vectorMaskY = coords.y;
				coords.vectorMaskWidth = ref.width;
				coords.vectorMaskHeight = ref.height;

				coords.vectorMaskWidth = coords.vectorMaskWidth.adjustFloatPrecision(tolerance);
				coords.vectorMaskHeight = coords.vectorMaskHeight.adjustFloatPrecision(tolerance);
			}

			var item;

			if(obj.tags.length)
			{

				// itemUUID = id.uuid;
				// coords.uuid = itemUUID;

				if(itemUUID.length) 
				{
					item = doc.getPageItemFromUuid(itemUUID);
					// if(item) coords.uuid = item.uuid;
				}
				else if(isArtboard)
				{
					item = Pslib.getArtboardItem(ref, obj.taggedItemNameStr);
					// if(item) coords.uuid = item.uuid;
				}
				else if(isGroup || isClipped)
				{
					var groupItems = item.pageItems;

					for (var j = 0; j < groupItems.length; j++)
					{
						var subItem = groupItems[j];
						if(subItem.typename == "PathItem")
						{
							if(subItem.name == obj.taggedItemNameStr)
							{
								item = subItem;
								// if(item) coords.uuid = item.uuid;
								break;
							}
						}
					}
				}

				if(item)
				{
					harvestedTags = Pslib.getTags( item, obj.tags, undefined, obj.converter);
					coords.uuid = item.uuid;
					if(selection) doc.selection = selection;
				}
			}
		}

		// if going after appearance and specific properties...
		// coords.visible 
		// coords.vectorMask
			// coords.vectorMaskX = vectorBounds.getUnitDoubleValue(sTID('left'));
			// coords.vectorMaskY = vectorBounds.getUnitDoubleValue(sTID('top'));
			// coords.vectorMaskWidth = vectorBounds.getUnitDoubleValue(sTID('right')) - coords.vectorMaskX;
			// coords.vectorMaskHeight = vectorBounds.getUnitDoubleValue(sTID('bottom')) - coords.vectorMaskY;

			// coords.type

			// if text item

			// if shape or if tinted, get color
				//  coords.color = "#"+colorOverlayHex;

			// if CC library item
			// coords.contentType
			// coords.documentID = documentID;
			// coords.fileReference 
			// if linked

			// remove "type" property from resulting coordinates object
			// if(!obj.keepType) coords.type = undefined;

		// return obj.getCoordsObject ? coords : ref;
	}


	// extra step to filter out extensions typically used with Generator workflows
	if(obj.filterExtension && coords.name)
	{		
		var ext = coords.name.getFileExtension();
		if(ext)
		{
			if(typeof obj.filterExtension == "string")
			{
				if(ext == obj.filterExtension)
				{
					// JSUI.quickLog("filtering out extension " + ext);
					coords.name = coords.name.replace(/\.[^\\.]+$/, "");
				}
			}
			else if(obj.filterExtension instanceof Array)
			{
				for(var i = 0; i < obj.filterExtension.length; i++)
				{
					// JSUI.quickLog("filtering out extension array " + obj.filterExtension[i]);
					if(obj.filterExtension[i] == ext)
					{
						// JSUI.quickLog("\t "+i+ ":"+ ext);
						coords.name = coords.name.replace(/\.[^\\.]+$/, "");
						// break;
					}
				}
			}
			else
			{
				// JSUI.quickLog("filtering out ANY extension: " + ext);
				coords.name = coords.name.replace(/\.[^\\.]+$/, "");
			}

		}

	}

	if(harvestedTags.length)
	{
		var convertedTags = [];

		// convert tag names if required
		if(obj.converter)
		{
			convertedTags = harvestedTags.convertTags(obj.converter);
			harvestedTags = convertedTags;
		}

		if(obj.tagsAsArray)
		{
			coords.tags = harvestedTags;
		}
		else
		{
			// inject tags into object
			for(var ht = 0; ht < harvestedTags.length; ht++)
			{
				var htag = harvestedTags[ht];
				if(htag != undefined)
				{
					var pname = htag[0];
					var pvalue = htag[1];
					if(pvalue != undefined && pvalue != null && pvalue != "undefined")
					{
						coords[pname] = pvalue;
					}
				}
			}
		}
	}

	return obj.getCoordsObject ? coords : ref;
}

// Advanced stuff: Reflect keys/properties from layer object descriptor
Pslib.getDescriptorKeyValues = function(desc, lvl)
{
    if(desc == undefined) return;
    if(lvl == undefined) lvl = 0;

    var spacer = "";   

	if(typeof desc == "number")
	{
		desc = Pslib.getLayerDescriptorByID(desc);
		if(desc == undefined) return;
	}
			
    for(var ii = 0; ii < lvl; ii++)
    {
        spacer += "\t";
    }

    var str = "";       
    if(desc != null && desc.count != null && desc.count != undefined)
    {    
        for(var i = 0; i < desc.count; i++)
        {
            var keyDescStr = ""; 
            var key = desc.getKey(i);
            var type = desc.getType(key);
            var value = null;

            switch(type)
            {   
                case DescValueType.ALIASTYPE: value = null; break;
                case DescValueType.BOOLEANTYPE: value = desc.getBoolean(key); break;
                case DescValueType.CLASSTYPE: value = desc.getClass(key); break;
                case DescValueType.DOUBLETYPE: value = desc.getDouble(key); break;
                case DescValueType.ENUMERATEDTYPE: value = desc.getEnumerationType(key); break;
                case DescValueType.INTEGERTYPE: value = desc.getInteger(key); break;
                case DescValueType.LARGEINTEGERTYPE: value = desc.getInteger(key); break;
                case DescValueType.LISTTYPE: value = desc.getList(key); break;
                case DescValueType.OBJECTTYPE:
                    value = tSID(desc.getObjectType(key))+"("+desc.getObjectType(key)+")"; 
                    for(var j = 0; j < desc.reflect.properties.length; j++)
                    {
                        keyDescStr += "\n"+spacer+"> "+desc.reflect.properties[j].name+" : "+desc.reflect.properties[j].dataType+" , "+desc.reflect.properties[j].type;
                    }
                    keyDescStr +="\n"+Pslib.getDescriptorKeyValues(desc.getObjectValue(key), lvl+1);
                    break;
                case DescValueType.RAWTYPE: value = null; break;
                case DescValueType.REFERENCETYPE: value = desc.getReference(key); break;
                case DescValueType.STRINGTYPE: value = desc.getString(key); break;
                case DescValueType.UNITDOUBLE: value = desc.getUnitDoubleValue(key); break;
                default: value = null; break;
            }
            str += spacer +""+ tSID(key)+"("+key+")"+" = "+value+" :: "+type;
            
            str += keyDescStr+"\n";
        }
    }
    return str;
}

// delete layer without selecting it
Pslib.deleteLayerObjectByID = function(id)
{
    if(!app.documents.length) return;

	if(Pslib.isPhotoshop)
	{
        var target = Pslib.getLayerTargetByID(id);
        executeAction( cTID('Dlt '), target, DialogModes.NO );

        return true;
    }
}

// get Photoshop artboard reference without selecting (must be an artboard)
Pslib.getArtboardReferenceByID = function( id )
{
	if(!app.documents.length) return;

    if(Pslib.isPhotoshop)
	{
        var r = new ActionReference();    
        r.putIdentifier(sTID("layer"), id);
        var isArtboard = false;
        try { isArtboard = executeActionGet(r).getBoolean(sTID("artboardEnabled")); }catch(e){ }
        if(isArtboard) return executeActionGet(r);
    }
}

// WIP: from layer reference, determine type
Pslib.getLayerObjectType = function( ref )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
        if(!ref)
        {
            var layer = doc.activeLayer;
            if(layer)
            {
                ref = Pslib.getLayerReferenceByID( layer.id, { getCoordsObject: true } );
            }
        }

        var r = ref;

        // if passed a number, assume sTID('layerKind') integer already processed
        var kind = typeof r == "number" ? ref : r.getInteger(sTID('layerKind')); 
        var kindStr = "";

        if (kind == 0) {
            kindStr = "kAnySheet";
        }
        else if (kind == 1) {
            kindStr = "kPixelSheet";    // regular pixel layer
        }
        else if (kind == 2) {
            // adjustment layers are a special case     
            kindStr = tSID(r.getList(sTID('adjustment')).getObjectType(0));
        }
        else if (kind == 3) {
            kindStr = "kTextSheet"; // text item
        }
        else if (kind == 4) {
            kindStr = "kVectorSheet";   // shape layer -- not the same as solid fill
        }
        else if (kind == 5) {
            kindStr = "kSmartObjectSheet";  // smart object
        }
        else if (kind == 6) {
            kindStr = "kVideoSheet";
        }
        else if (kind == 7) {
            kindStr = "kLayerGroupSheet";   // layer set
        }
        else if (kind == 8) {
            kindStr = "k3DSheet";
        }
        else if (kind == 9) {
            kindStr = "kGradientSheet";
        }
        else if (kind == 10) {
            kindStr = "kPatternSheet";
        }
        else if (kind == 11) {
            kindStr = "kSolidColorSheet";   // solid fill
        }
        else if (kind == 12) {
            kindStr = "kBackgroundSheet";
        }
        else if (kind == 13) {
            kindStr = "kHiddenSectionBounder";
        }
        else {
            
        }
        return kindStr;
    }
}


// check if target is smartobject
Pslib.isSmartObject = function( id )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;

		// check if smartobject via descriptor
		var desc = Pslib.getLayerDescriptorByID(id);
		if(desc)
		{
			var isSmartObject = desc.getInteger(sTID('layerKind')) == 5;
			if(!isSmartObject){ return false; }
			return desc;
		}

		return false;
	}
}

// check if smartobject is raster
Pslib.isRasterSmartObject = function( id )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;
		var desc = Pslib.isSmartObject(id);
		if(desc)
		{
			var sref = desc.getObjectValue(sTID('smartObject'));
			var stype = tSID(sref.getEnumerationValue(sTID('placed')));
			return stype == 'rasterizeContent';
		}
		else return false;
	}
}

// check if smartobject is vector artwork
Pslib.isVectorSmartObject = function( id )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;
		var desc = Pslib.isSmartObject(id);
		if(desc)
		{
			var sref = desc.getObjectValue(sTID('smartObject'));
			var stype = tSID(sref.getEnumerationValue(sTID('placed')));
			return stype == 'vectorData';
		}
		else return false;
	}
}


// check smartobject or otherwise placed item for linked/emdedded status
// returns original file link if present
Pslib.isPlacedItem = function( id )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;

		var desc = Pslib.isSmartObject(id);
		if(!desc)
		{
			return false;
		}

		var sref = desc.getObjectValue(sTID('smartObject'));

		var smartObjectContentType = tSID(sref.getEnumerationValue(sTID('placed'))); 
		// 'vectorData'   		.PDF, .SVG, .AI (will open with Illustrator)
		// 'rasterizeContent'   .PNG, .PSB etc (opens as a separate document)

		var documentID = sref.getString(sTID('documentID')); 
		var isLinked = sref.getBoolean(sTID("linked"));
		var fileReference = sref.getString(sTID('fileReference'));
		if(fileReference) fileReference = new File(fileReference);

		// JSUI.quickLog("fileReference: " + fileReference);
		// JSUI.quickLog( isLinked ? "File is linked" : "File is embedded");

		// is placed
		if(isLinked)
		{
			var type = sref.getType(sTID("link"));
			if(type)
			{
				var link, elementReference, libraryName;
				switch (type)
				{	
					case DescValueType.OBJECTTYPE:
					{
						linkPath = sref.getObjectValue(sTID("link"));
						if(linkPath)
						{
							elementReference = linkPath.getString(sTID('elementReference')); 
							if(elementReference) link = elementReference;
							libraryName = linkPath.getString(sTID('libraryName')); 
						}	
						break;
					}
					// alias is a link to a local file
					case DescValueType.ALIASTYPE:
					{
						link = sref.getPath(sTID("link"));
						link = new File(link);
						// JSUI.quickLog("ALIASTYPE: " + link);
						break;
					}
					case DescValueType.STRINGTYPE:
					{
						link = sref.getString(sTID("link"));
						// JSUI.quickLog("STRINGTYPE: " + link);
						break;
					}
					default:
					{
						break;
					}
				}
				return link;
			}
		}
		return fileReference ? new File(fileReference) : true;
	}
}

// replace linked resource with embedded file
Pslib.convertLinkedToEmbedded = function( id, file )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;

		// if(typeof file == "string")
		// {
		// 	file = new File( file );
		// }

		var isSmartObject = Pslib.isSmartObject(id);
		if(!isSmartObject)
		{
			return false;
		}

		Pslib.selectLayerByID(id);

		// prompts for file selection
		try{
			executeAction( sTID('placedLayerConvertToEmbedded'), undefined, DialogModes.NO );
		}
		catch(e)
		{
			// get filetype
			var fileRef = Pslib.isPlacedItem(id);

			alert("Original file reference could not be resolved.\n" + fileRef.fsName);
			return false;
		}

		return true;
	}
}

// replace embedded resource with a "linked" file (linked file has to resolve locally)
// using a layer reference won't work, we need to have the layer active
Pslib.convertPlacedToLinked = function( id, file )
{
	if(!app.documents.length) return;
	if(!file) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;

		if(typeof file == "string")
		{
			file = new File( file );
		}

		var isSmartObject = Pslib.isSmartObject(id);
		if(!isSmartObject)
		{
			return false;
		}
		
		if(!file.exists) return false;

		Pslib.selectLayerByID(id);

		var d = new ActionDescriptor();
		d.putPath( cTID( 'null' ), file );
		executeAction( sTID( 'placedLayerRelinkToFile' ), d, DialogModes.NO );
		return true;
	}
}

// new SmartObject via copy
Pslib.duplicatePlacedItem = function( id )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = doc.activeLayer.id;
		
		var desc = Pslib.isSmartObject(id);
		if(!desc)
		{
			return false;
		}

		// 'placedLayerMakeCopy' will fail if object is linked
		var sref = desc.getObjectValue(sTID('smartObject'));
		var isLinked = sref.getBoolean(sTID('linked'));
		if(isLinked)
		{
			return false;
		}

		Pslib.selectLayerByID(id);

		var idplacedLayerMakeCopy = sTID( 'placedLayerMakeCopy' );
		executeAction( idplacedLayerMakeCopy, undefined, DialogModes.NO );

		var newLayerID = doc.activeLayer.id;

		return newLayerID;
	}
}


// export smartobject to file
// location can be a File of Folder object (string means folder)
Pslib.exportPlacedItem = function( id, location )
{
    if(!app.documents.length) return;

	var doc = app.activeDocument;

    var exportedFile;

	if(Pslib.isPhotoshop)
	{
        if(id == undefined) id = doc.activeLayer.id;

		var desc = Pslib.isSmartObject(id);
		if(!desc)
		{
			return false;
		}

		// export will fail if object is linked
		var sref = desc.getObjectValue(sTID('smartObject'));
		var isLinked = sref.getBoolean(sTID('linked'));
		if(isLinked)
		{
			return false;
		}

        var layername = desc.getString(sTID('name'));
        var filename = layername;
        var fileReference = sref.getString(sTID('fileReference'));

        // infer type from file reference info
        var contenttype = tSID(sref.getEnumerationValue(sTID('placed'))); 
        var extension = "";

        if(contenttype == 'vectorData') extension = ".ai"; 
        else if(contenttype == 'rasterizeContent') extension = ".psb"; // if made from layers

        // use embedded object filename (expect lots of "Vector Smart Object.ai")
        if(fileReference)
        {
            var fileRefHasExtension = fileReference.hasFileExtension();
            var refName = fileReference.getFileNameWithoutExtension();
            var refExt = fileReference.getFileExtension();

            filename = (refName ? refName : refName) + (fileRefHasExtension ? refExt : extension);  
        }
        else 
        {
            filename = layername + extension;
        }

        var file = new File(Folder.temp + "/" + filename);

        if(location instanceof Folder)
        {
            file = new File(location + "/" + filename);
        }
        else if(typeof location == "string")
        {
            file = new File(location + "/" + filename);
        }

        // if a specific file object is provided
        if(location instanceof File)
        {
            file = location;
        }

        try
        {
            if(!file.parent.exists) file.parent.create();
            if(file.exists) file.remove();

            var adesc = new ActionDescriptor();
            adesc.putPath(sTID('null'), file );
            executeAction(sTID('placedLayerExportContents'), adesc);
    
            exportedFile = file;
        }
        catch(e)
        {  

        }
    }

    return exportedFile;
}

// here's a way to set/get xmp by layer ID
Pslib.setXmpByID = function( id, xmpStr )
{
	if(!app.documents.length) return;
	if(!xmpStr) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var id = id ? id : doc.activeLayer.id;

		// if instanceof Object, assume valid XMPMeta and serialize to string
		if(xmpStr instanceof Object) xmpStr = xmpStr.serialize();
		
		var xmpDataKey = sTID( "XMPMetadataAsUTF8" );
		var classLayer = cTID( 'Lyr ' );
		var classDocument = cTID( 'Dcmn' );
		var keyTarget = cTID( 'null' );
		var keyTo = cTID( 'T   ' );
		var eventSet = cTID( 'setd' );
		var classProperty = cTID( "Prpr" );
		var target = new ActionReference();
		target.putProperty( classProperty, xmpDataKey );
		target.putIdentifier( classLayer, id );
		target.putIdentifier( classDocument, doc.id );
		var desc = new ActionDescriptor();
		desc.putReference( keyTarget, target );
		var dataDesc = new ActionDescriptor();
		dataDesc.putString( xmpDataKey, xmpStr );
		desc.putObject( keyTo, xmpDataKey, dataDesc );
		executeAction( eventSet, desc );
		return true;
	}
}


// fast get XMPMeta object via layer ID (if array, returns array)
// use this if function fails
// // if (!ExternalObject.AdobeXMPScript) ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
Pslib.getXmpByID = function( id )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var id = id ? id : doc.activeLayer.id;

		if(id instanceof Array)
		{
			var xmps = [];
			for(var i = 0; i < id.length; i++)
			{
				var xmpData = Pslib.getXmpByID(id[i]);
				xmps.push(xmpData);
			}
			return xmps;
		}
		else if((typeof id) != "number")
		{
			return;
		}

		var ref = new ActionReference();
		ref.putProperty( cTID( 'Prpr' ), sTID( "metadata" ) );
		ref.putIdentifier(sTID("layer"), id);

		var desc = executeActionGet(ref);
		var xmpData;

		try{
			xmpData = desc.getObjectValue(sTID( "metadata" )).getString(sTID( "layerXMP" ));
		}catch(e){}

		// if(typeof xmpData !== "undefined")
		if(typeof xmpData == "string")
		{
			// fails if !ExternalObject.AdobeXMPScript
			xmpData = new XMPMeta(xmpData);
		}

		return xmpData;
	}
}

// Photoshop-only: get layer object modified date stamp
// this information should be available whether or not XMP has been actively defined on the individual layer
Pslib.getLayerObjectTimeStamp = function ( layer, locale )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		if(layer == undefined)
		{
			layer = doc.activeLayer;
		}

		var ref = new ActionReference(); 
		var metadataStrID = sTID("metadata");
		ref.putProperty(cTID('Prpr'), metadataStrID);
		ref.putIdentifier(sTID("layer"), (typeof layer == "number") ? layer : layer.id);
		var desc = executeActionGet(ref);

		if (desc.hasKey(metadataStrID))
		{
			var descMetadata = desc.getObjectValue( metadataStrID );
			var timeInSeconds = descMetadata.getDouble(sTID("layerTime"));
			var d = new Date();
			d.setTime(timeInSeconds*1000.0);
			return locale ? d.toLocaleString() : timeInSeconds;
		}
	}
}

// get coordinates for specific layer object (auto-selects target, reselects initially active)
// or abstract layer object via ID (without actively selecting object)
Pslib.getLayerObjectCoordinates = function( layer )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	var coords = {};

	if(Pslib.isPhotoshop)
	{
		var wasActive = false;
		var initialActiveObject;

		if(layer == undefined)
		{
			layer = doc.activeLayer;
			wasActive = true;
			initialActiveObject = layer;

			if(layer) return Pslib.getLayerReferenceByID( layer.id, { getCoordsObject: true } );
			else return coords;
		}

		// if integer, assume layer ID and use more efficient method
		if(typeof layer == "number")
		{
			return Pslib.getLayerReferenceByID( layer, { getCoordsObject: true } );
		}


		if(doc.activeLayer != layer)
		{
			doc.activeLayer = layer;
			wasActive = true;
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

		if(initialActiveObject && !wasActive) doc.activeLayer = initialActiveObject;
	}

	return coords;
}

// https://community.adobe.com/t5/photoshop-ecosystem-discussions/in-a-script-calling-artlayer-translate-changes-artlayer-visible-from-false-to-true/m-p/10891243
// translate photoshop Layer object via AM
// does not affect visibility and smartobject transform values
Pslib.layerTranslate = function( x, y )
{
    if(!app.documents.length) return;
	if(Pslib.isPhotoshop)
	{
        var d = new ActionDescriptor();
        var r = new ActionReference();
        r.putEnumerated(sTID("layer"), sTID("ordinal"), sTID("targetEnum"));
        d.putReference(sTID("null"), r);

        var d1 = new ActionDescriptor();
        d1.putUnitDouble(sTID("horizontal"), sTID("pixelsUnit"), x);
        d1.putUnitDouble(sTID("vertical"),   sTID("pixelsUnit"), y);
        d.putObject(sTID("to"), sTID("offset"), d1);

        executeAction(sTID("move"), d, DialogModes.NO);
    }
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
		// var artboards = doc.artboards;
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
		
		// adjustment for illustrator
		var docSpecs = Pslib.getDocumentSpecs();
		// substract topLeft[0] from X and add topLeft[1] to Y
		var xOffset = -docSpecs.topLeft[0];
		var yOffset = docSpecs.topLeft[1];

		for(var i = 0; i < doc.artboards.length; i++)
		{
			var coords = Pslib.getArtboardCoordinates( doc.artboards[i] );
			var page = i+1;
			var obj = { name: coords.name, id: i, page: page, width: coords.width, height: coords.height, x: coords.x+xOffset, y: coords.y+yOffset };
			artboardObjArr.push(obj);
		}
	}

	return artboardObjArr;
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

// basic get artboard bounds, formatted as Illustrator Rect object
Pslib.getArtboardBounds = function( id )
{
    if(Pslib.isPhotoshop)
	{
        var r = Pslib.getArtboardReferenceByID(id);

        if(r)
        {
            var d = r.getObjectValue(sTID("artboard")).getObjectValue(sTID("artboardRect"));
            var bounds = new Array();
            bounds[0] = d.getUnitDoubleValue(sTID("top"));
            bounds[1] = d.getUnitDoubleValue(sTID("left"));
            bounds[2] = d.getUnitDoubleValue(sTID("right"));
            bounds[3] = d.getUnitDoubleValue(sTID("bottom"));

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
Pslib.getArtboardCoordinates = function( artboard, precise, uuidStr )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if(Pslib.isIllustrator)
	{
		var index;
		var page;

		// if integer, assume working with index
		if(typeof artboard == "number")
		{
			index = artboard;
			page = index+1;
			artboard = doc.artboards[index];
			if(!artboard) return;
		}

		// can still be zero!
		if(artboard == undefined)
		{ 
			artboard = Pslib.getActiveArtboard();
			index = doc.artboards.getActiveArtboardIndex();
			page = index+1;
		}

		if(app.coordinateSystem != CoordinateSystem.ARTBOARDCOORDINATESYSTEM) app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

		var rect = artboard.artboardRect;
		var coords = {};

		// if x+y coordinates relative document's visible bounds top left are needed
		// not that these are not to be trusted if items are added above the top left point
		// var b = doc.visibleBounds;
		// var xOffset = -Math.floor(b[0]);
		// var yOffset = Math.ceil(b[1]);
		// x: coords.x+xOffset, y: coords.y+yOffset

		coords.name = artboard.name.trim();
		if(index != undefined) coords.id = index;
		if(page != undefined) coords.page = page;
		if(uuidStr != undefined) coords.uuid = uuidStr;
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

		if(precise)
		{
			var tolerance = (typeof precise === "number") ? precise : 0.0001;
			coords.x = coords.x.adjustFloatPrecision(tolerance);
			coords.y = coords.y.adjustFloatPrecision(tolerance);
			coords.width = coords.width.adjustFloatPrecision(tolerance);
			coords.height = coords.height.adjustFloatPrecision(tolerance);
		}
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
			var layer = doc.activeLayer;
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

            coords.rect = bounds;
		    coords.centerX = coords.x + coords.width/2;
		    coords.centerY = coords.y - coords.height/2;

            // advanced logic for which we don't have to make the artboard active
            coords.isSquare = coords.width == coords.height;
            coords.isPortrait = coords.width < coords.height;
            coords.isLandscape = coords.width > coords.height;
            coords.hasIntegerCoords = coords.x == Math.round(coords.x) && coords.y == Math.round(coords.y) && coords.width == Math.round(coords.width) && coords.height == Math.round(coords.height);

            return coords;
		}
	}
}

// get extended artboard metrics and information
// 
Pslib.getArtboardSpecs = function( artboard, uuidStr )
{
	if(Pslib.isIllustrator)
	{
		var isActive = false;
		if(!artboard) { var artboard = Pslib.getActiveArtboard(); isActive = true; }
		if(uuidStr == undefined) uuidStr = "";
		var specs = Pslib.getArtboardCoordinates(artboard, true, uuidStr);

		var doc = app.activeDocument;

		specs.isPow2 = specs.width.isPowerOf2() && specs.height.isPowerOf2();
		specs.isMult4 = specs.width.isMult4() && specs.height.isMult4();
		specs.isMult8 = specs.width.isMult8() && specs.height.isMult8();
		specs.isMult16 = specs.width.isMult16() && specs.height.isMult16();
		specs.isMult32 = specs.width.isMult32() && specs.height.isMult32();

		// if active, select items and harvest more information
		if(isActive)
		{
			specs.index = doc.artboards.getActiveArtboardIndex();
			specs.page = specs.index+1;

			// specs.hasBitmap
			// specs.itemCount
			// specs.hasTaggedItem
		}
		else
		{
			specs.index = Pslib.getArtboardIndex(artboard);
			specs.page = specs.index+1;
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
			specs.isMult4 = specs.width.isMult4() && specs.height.isMult4();
			specs.isMult8 = specs.width.isMult8() && specs.height.isMult8();
			specs.isMult16 = specs.width.isMult16() && specs.height.isMult16();
			specs.isMult32 = specs.width.isMult32() && specs.height.isMult32();

			return specs;
		}
	}
}

// make artboard transparency
Pslib.updateArtboardBackgroundTransparent = function()
{
	if(!app.documents.length) return false;
	var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
    {
		var coords = Pslib.getArtboardCoordinates(doc.activeLayer.id);
		var obj = { id: doc.activeLayer.id, width: coords.width, height: coords.height, hex: "transparent"};
		Pslib.resizeArtboard( obj );
	}
	else if(Pslib.isIllustrator)
	{
		// get / create artboard rectangle, set color
		var item = Pslib.getArtboardItem();
		if(!item)
		{
			item = Pslib.addArtboardRectangle();
		}
		else if(item)
		{
			var transp = new NoColor();
			item.strokeColor = transp;
			item.fillColor = transp;
			item.opacity = 100;
		}
	}
	return true;
}

// color photoshop artboard background / illustrator rectangle placeholder 
// needs an option for updating photoshop fill layers
Pslib.updateArtboardBackgroundColor = function( hexStr, create, tags )
{
	if(hexStr == undefined) return false; // consider making the artboard transparent if no hexString provided?
    if(!app.documents.length) return false;
	var doc = app.activeDocument;

    if(Pslib.isPhotoshop)
    {
        var coords = Pslib.getArtboardCoordinates(doc.activeLayer.id);
		var obj = { id: doc.activeLayer.id, width: coords.width, height: coords.height, hex: hexStr};
		Pslib.resizeArtboard( obj ); // not actually resizing, but cannot update artboard color without invoking a function that updates the whole thing

		var item = Pslib.getArtboardItem();
		if(!item && create)
		{
			item = Pslib.addArtboardRectangle( { hex: hexStr, tags: tags });
		}
	}
	else if(Pslib.isIllustrator)
	{
		// get / create artboard rectangle, set color
		// var item = Pslib.getArtboardItem(artboard, "#");
		var item = Pslib.getArtboardItem();
		if(!item && create)
		{
			// var rectObj = { artboard: artboard, name: "#", tags: [ ["name", artboard.name], ["index", indexNum], ["page", pageNum], ["assetID", ""] ], hex: undefined, opacity: undefined, layer: doc.layers.getByName("Placeholders"), sendToBack: true };
			item = Pslib.addArtboardRectangle( { hex: hexStr, tags: tags });
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

Pslib.updateArtboardCollectionBackgroundColor = function( arr, hexStr, create, tags )
{
	if(hexStr == undefined) return false;
    if(!app.documents.length) return false;

	var allSelected = false;

	if((typeof arr == "string") && (hexStr == undefined))
	{
		hexStr = arr;
		arr = Pslib.getSpecsForAllArtboards();
		allSelected = true;
	}

	if(hexStr == undefined) hexStr = "transparent";
	if(!arr)
	{
		arr = Pslib.getSpecsForAllArtboards();
		allSelected = true;
	}

	var doc = app.activeDocument;
	var initialArtboard;
	var initialSelection;

	if(Pslib.isPhotoshop)
	{
		initialArtboard = doc.activeLayer;
		for(var i = 0; i < arr.length; i++)
		{
			Pslib.selectLayerByID(arr[i].id);
			Pslib.updateArtboardBackgroundColor( hexStr, create, tags );
		}

		// if all artboards were being modified, only make original layer active
		if(allSelected)
		{
			if(initialArtboard) doc.activeLayer = initialArtboard;
		}
		// if only a subset of artboards were modified, attempt to reselect
		else
		{
			Pslib.selectArtboardsCollection(arr);
		}
	}
	else if(Pslib.isIllustrator)
	{
		initialArtboard = doc.artboards.getActiveArtboardIndex();
		initialSelection = doc.selection;
		for(var i = 0; i < arr.length; i++)
		{
			Pslib.updateArtboardBackgroundColor( hexStr, create, tags );
		}

		// restore initial active artboard and selection
		doc.artboards.setActiveArtboardIndex(initialArtboard);
		if(initialSelection) doc.selection = initialSelection;
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


// // resize content of group object using its vector mask as reference
// var advCoords = Pslib.getLayerReferenceByID(id, { getCoordsObject: true});
// var isGroup = Pslib.getIsGroup(id);
// if(isGroup && advCoords.vectorMaskEnabled && !advCoords.vectorMaskEmpty)
// {
    // var newW = advCoords.width.getNextMultOf(100);
    // var newH = advCoords.height.getNextMultOf(100);
    // Pslib.resizeVectorMask(id, { width: newW, height: newH, anchor: 7 });
// }

// // example of wrapper for incrementing to next powers of 2
// Pslib.incrementVectorMaskPow2 = function( id, anchor )
// {
//     if(Pslib.isPhotoshop)
//     {
//         // resize content of group object using its vector mask as reference
//         var advCoords = Pslib.getLayerReferenceByID(id, { getCoordsObject: true});
//         var isGroup = Pslib.getIsGroup(id);
//         if(isGroup && advCoords.vectorMaskEnabled && !advCoords.vectorMaskEmpty)
//         {
//             var newW = advCoords.vectorMaskWidth.getNextPow2();
//             var newH = advCoords.vectorMaskHeight.getNextPow2();
//             Pslib.resizeVectorMask(id, { width: newW, height: newH, anchor : anchor ? anchor : 7});
//         }
//     }
// }

// resize vector mask to 256*256, anchored center (default anchor value is 7 for top left)
// Pslib.resizeVectorMask(id, { width: 256, height: 256, anchor: 5 });
Pslib.resizeVectorMask = function( id, obj )
{
    if(!obj) return false;
    if(!app.documents.length) return false;
    if(!(obj.width || obj.height)) return false;
    if(obj.anchor == undefined) obj.anchor = 7;

    var doc = app.activeDocument;
	var resized = false;

    if(Pslib.isPhotoshop)
    {
        // could check if group, mask etc

        // this should be adjusted for layer groups
        // var desc = Pslib.getLayerReferenceByID( id );

        // var hasVectorMask = desc.hasKey(sTID('hasVectorMask')) ? desc.getBoolean(sTID('hasVectorMask')) : false;  
        // var vectorMaskEnabled = desc.hasKey(sTID('vectorMaskEnabled')) ? desc.getBoolean(sTID('vectorMaskEnabled')) : false;  
        // var vectorMaskEmpty = desc.hasKey(sTID('vectorMaskEmpty')) ? desc.getBoolean(sTID('vectorMaskEmpty')) : false; 
        
        // var isGroup = Pslib.getIsGroup(id);

        var specs = Pslib.getLayerReferenceByID( id, { getCoordsObject: true });

        if( !specs.vectorMask || (!specs.vectorMaskEnabled || specs.vectorMaskEmpty)) return;

        var wDelta = obj.width - specs.width;
        var hDelta = obj.height - specs.height;

        // delta offsets: extra pixel goes at the bottom and on the right if odd delta is divided by two
        var wDelta1stHalf = (wDelta % 2 == 0) ? wDelta/2 : Math.floor(wDelta/2);
        var hDelta1stHalf = (wDelta % 2 == 0) ? hDelta/2 : Math.floor(hDelta/2);

        // anchors / pivot reference
        //	7	8	9
        //	4	5	6
        //	1	2	3

        var xOffset = 0;
        var yOffset = 0;

        switch(obj.anchor)
        {
            case 7 : { 
                xOffset += wDelta1stHalf;
                yOffset += hDelta1stHalf; 
                break; 
            }
            case 8 : { 
                yOffset += hDelta1stHalf; 
                break; }
            case 9 : { 
                xOffset -= wDelta1stHalf; 
                yOffset += hDelta1stHalf;
                break; }

            case 4 : { 
                xOffset += wDelta1stHalf;
                break; }
            case 5 : { 
                // leave as is
                break; }
            case 6 : { 
                xOffset -= wDelta1stHalf; 
                break; }

            case 1 : { 
                xOffset += wDelta1stHalf;
                yOffset += hDelta1stHalf;
                break; }
            case 2 : { 
                yOffset += hDelta1stHalf; 
                break; }
            case 3 : { 
                xOffset -= wDelta1stHalf;
                yOffset += hDelta1stHalf;
                break; }

            default : { break; }
        }

        var newW = obj.width;
        var newH = obj.height;

        var xScale = (newW / specs.width) * 100;
        var yScale = (newH / specs.height) * 100;

        // make sure mask is active / selected?

        resized = Pslib.resizeShape(id, xOffset, yOffset, xScale, yScale);
    }
	return resized;
}

// resize shape item (typical usecase is a mask used for bounds)
Pslib.resizeShape = function( id, xPixels, yPixels, xScale, yScale )
{
    if(!app.documents.length) return;

    if(Pslib.isPhotoshop)
    {
		if(typeof id == "number")
		{
			var desc = Pslib.getLayerDescriptorByID(id);
		}
		// if not working with specific layer ID, use active layer as reference
		else
		{
			var desc = new ActionDescriptor();
			var ref = new ActionReference();
			ref.putEnumerated( sTID('layer'), sTID('ordinal'), sTID('targetEnum') );
			desc.putReference( sTID('null'), ref );
		}

		if(!desc) return false;

        desc.putEnumerated( sTID('freeTransformCenterState'), sTID('quadCenterState'), sTID('QCSAverage') );
    
        var offsetDesc = new ActionDescriptor();
        offsetDesc.putUnitDouble( sTID('horizontal'), sTID('pixelsUnit'), xPixels );
        offsetDesc.putUnitDouble( sTID('vertical'), sTID('pixelsUnit'), yPixels );
        desc.putObject( sTID('offset'), sTID('offset'), offsetDesc );
    
        desc.putUnitDouble( sTID('width'), sTID('percentUnit'), xScale );
        desc.putUnitDouble( sTID('height'), sTID('percentUnit'), yScale );
        desc.putEnumerated( sTID('interfaceIconFrameDimmed'), sTID('interpolationType'), sTID('nearestNeighbor') );
    
        executeAction( sTID('transform'), desc, DialogModes.NO );

        return true;
    }
}

// get projected mips count, with optional target multiple
Pslib.getMipsCount = function(coords, multNum)
{
	if(typeof coords == "number" && multNum == undefined)
	{
		multNum = coords;
		coords = Pslib.getArtboardCoordinates(undefined, true);
	}
	if(!coords) coords = Pslib.getArtboardCoordinates(undefined, true);
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

// reverse process
Pslib.removeMipsLayout = function()
{
	if(!app.documents.length) return false;

	var resized = Pslib.resizeArtboardHalfWidth( undefined, true );
	var untagged = false;

	if(Pslib.isIllustrator)
	{
		var placeholder = Pslib.getArtboardItem();
		if(placeholder)
		{
			Pslib.removeTags( placeholder, ["customMips"] );
			untagged = true;
		}
	}
	else if(Pslib.isPhotoshop)
	{

	}

	return resized && untagged;
}

// duplicate artboard artwork, prepare for manually optimized pixel art
Pslib.createMipsLayout = function(scaleStylesBool, resizeArtboardBool, silentBool, multNum, hex)
{
	if(!app.documents.length) return false;
	if(resizeArtboardBool == undefined) resizeArtboardBool = false;
	if(silentBool == undefined) silentBool = false;
	if(multNum == undefined) multNum = 4;
	if(hex == undefined) hex = "transparent";

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
            var rectObj = { artboard: artboard, name: "#", hex: hex, tags: [ ["name", artboard.name], ["index", indexNum], ["page", pageNum], ["assetID", ""] ], hex: undefined, opacity: undefined, layer: layer, sendToBack: true };
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
        // if(obj.id) newObj.assetArtboardID = obj.id;
        if(obj.id) newObj.id = obj.id;
    }
    else if(Pslib.isIllustrator)
    {
        // if(obj.index) newObj.assetArtboardID = obj.index;
        if(obj.index) newObj.id = obj.index;
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
Pslib.getArtboardsFromSelectedItems = function( itemsArr, getPagesBool, getIndexesBool, activateSelection )
{
	if(Pslib.isIllustrator)
	{
		if(!app.documents.length) return;
		var doc = app.activeDocument;
		var selection = doc.selection;
		if(itemsArr == undefined) var itemsArr = selection ? selection : undefined;

		var artboards = [];
		// for(var j = doc.artboards.length-1; j >= 0; j--)
		for(var j = 0; j < doc.artboards.length; j++)
		{
			var artboard = doc.artboards[j];
			var artboardFound = false;

			for(var i = 0; i < itemsArr.length; i++)
			{
				var item = itemsArr[i];
				artboardFound = Pslib.getItemsOverlapArtboard([item], artboard, false);
				
				if(artboardFound)
				{
					artboards.push(getPagesBool ? (j+1) : ( getIndexesBool ? j : artboard) );
					break;
				}
			}
		}

		// if there was no selection active, fallback to active artboard as a minimum
		if(activateSelection)
		{
			var a = doc.artboards.getActiveArtboardIndex();
			if(!artboards.length)
			{
				doc.selectObjectsOnActiveArtboard();
				if(doc.selection) artboards = [ doc.artboards[a] ];
			}

			if(!artboards.length && !getPagesBool && !getIndexesBool)
			{
				artboards = [ doc.artboard[a] ];
			}
			if(doc.selection != selection) doc.selection = selection;
		}
		return artboards;
	}
}

Pslib.getArtboardIndexesFromSelectedItems = function()
{
	return Pslib.getArtboardsFromSelectedItems( undefined, false, true);
}

Pslib.getArtboardPagesFromSelectedItems = function()
{
	return Pslib.getArtboardsFromSelectedItems( undefined, true, false);
}

Pslib.getViewCoordinates = function( view )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;
	var coords = {};

	if(Pslib.isIllustrator)
	{
		if(!view) { var view = doc.views[0]; }
	
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
	}
	else if(Pslib.isPhotoshop)
	{
		// if(!view) { var view = app.activeWindow; }

        var ref = new ActionReference();
        ref.putEnumerated( cTID('Dcmn'), cTID('Ordn'), cTID('Trgt') ); 
        var desc = executeActionGet(ref);

		coords.zoom = desc.getDouble(sTID('zoom'))*100;;
	}
	return coords;
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

// check for any locked layers 
Pslib.hasLockedLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	var doc = app.activeDocument;
	var hasLockedLayers = false;

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = doc.layers;
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			hasLockedLayers = layer.locked;
			if(hasLockedLayers) break;
		}
	}
	return hasLockedLayers;
}

// get list of locked layers 
Pslib.getLockedLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	var doc = app.activeDocument;
	var lockedLayers = [];

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = doc.layers;
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(layer.locked) lockedLayers.push(layer);
		}
	}
	return lockedLayers;
}

// unlock layers 
Pslib.unlockLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	if(!layers) { return false; }
	var unlockedLayers = [];

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = Pslib.getLockedLayers();
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(layer.locked)
			{
				layer.locked = false;
				unlockedLayers.push(layer);
			}
		}
	}
	return unlockedLayers;
}

// restore locked layers 
Pslib.restoreLockedLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	if(!layers) { return false; }
	var restoredLockedLayers = [];

	if(Pslib.isIllustrator)
	{		
		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(!layer.locked)
			{
				layer.locked = true;
				restoredLockedLayers.push(layer);
			}
		}
	}
	return restoredLockedLayers;
}

//
//
// check for any hidden layers 
Pslib.hasHiddenLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	var doc = app.activeDocument;
	var hasHiddenLayers = false;

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = doc.layers;
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			hasHiddenLayers = layer.visible == false;
			if(hasHiddenLayers) break;
		}

	}
	return hasHiddenLayers;
}


// get list of hidden layers 
Pslib.getHiddenLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	var doc = app.activeDocument;
	var hiddenLayers = [];

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = doc.layers;
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(!layer.visible) hiddenLayers.push(layer);
		}
	}
	return hiddenLayers;
}

// show layers 
Pslib.showHiddenLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	if(!layers) { return false; }
	var visibleLayers = [];

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = Pslib.getLockedLayers();
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(!layer.visible)
			{
				layer.visible = true;
				visibleLayers.push(layer);
			}
		}
	}
	return visibleLayers;
}

// restore visibility for hidden layers 
Pslib.restoreHiddenLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	if(!layers) { return false; }
	var restoredHiddenLayers = [];

	if(Pslib.isIllustrator)
	{		
		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(!layer.visible)
			{
				layer.visible = true;
				restoredHiddenLayers.push(layer);
			}
		}
	}
	return restoredHiddenLayers;
}

// delete hidden layers
Pslib.deleteHiddenLayers = function()
{
    if(!app.documents.length) return;
	var doc = app.activeDocument;
	var deleted = false;

	if(Pslib.isPhotoshop)
	{
		var desc = new ActionDescriptor();
		var ref = new ActionReference();
		ref.putEnumerated( cTID('Lyr '), cTID('Ordn'), sTID('hidden') );
		desc.putReference( cTID('null'), ref );
		try{ 
			executeAction( cTID('Dlt '), desc, DialogModes.NO ); 
			deleted = true;
		}catch(e){ }
	}
	else if(Pslib.isIllustrator)
	{
		var hiddenLayers = Pslib.getHiddenLayers();

		for(var i = 0; i < hiddenLayers.length; i++)
		{
			var layer = hiddenLayers[i];
			layer.visible = true;
			if(layer.locked) layer.locked = false;
			layer.remove();
		}
		deleted = true;
	}
	return deleted;
}

// get list of both visible AND locked layers 
Pslib.getVisibleAndLockedLayers = function( layers )
{
	if(!app.documents.length) { return false; }
	var doc = app.activeDocument;
	var visibleAndLockedLayers = [];

	if(Pslib.isIllustrator)
	{		
		if(!layers)
		{
			layers = doc.layers;
		}

		for(var i = 0; i < layers.length; i++)
		{
			var layer = layers[i];
			if(layer.locked && layer.visible) visibleAndLockedLayers.push(layer);
		}
	}
	return visibleAndLockedLayers;
}


//
//

// useful headless functions
// - check for duplicates in names
// - check for whitespace in names
// - check for file extension in names
// - check for leading and trailing whitespace

// check for duplicates, return list
Pslib.documentHasDuplicateArtboards = function( getListBool )
{
	if(!app.documents.length) return;

	// var doc = app.activeDocument;

	var names = Pslib.getArtboardNames();
	var coordsCollection = getListBool ? Pslib.getArtboardCollectionCoordinates() : [];
	var namesStr = names.join(", "); // avoid false positives
	var hasDuplicates = false;
	var duplicates = [];
	var duplicateSets = [];

	for(var i = 0; i < names.length; i++)
	{
		var nameMatches = new RegExp( names[i]+", ", 'g' );
		var matches = namesStr.match(nameMatches);

		if(matches != null)
		{
			if(matches.length > 1)
			{
				hasDuplicates = true;
				if(getListBool)
				{
					var coords = coordsCollection[i];
					duplicates.push( coords );
				}
				else
				{
					break;
				}
			}
		}
	}

	if(getListBool)
	{
		if(duplicates.length)
		{
			duplicateSets = duplicates.getObjectPropertyDuplicates("name");
		}
	}

	return  getListBool ? duplicateSets : hasDuplicates;
}

// rename artboard duplicates based on collection of JSON objects
// expects bidimensional array with pre-filtered duplicates to rename
// var obj = { duplicatesArr: [ [ obj1, obj2 ], [ obj10, obj13 ] ], confirmBool: true, message: "Custom message" }
Pslib.renameDuplicateArtboards = function( obj )
{
	if(!app.documents.length) return;
	if(!obj) obj = {};

	var doc = app.activeDocument;
	var processed = [];

	if(obj.duplicatesArr == undefined) 
	{
		obj.duplicatesArr = Pslib.documentHasDuplicateArtboards( true );
	}

	if( obj.duplicatesArr.length )
	{
		// first array item should be an array
		// if JSON object, assume array must be processed to detect duplicates
		if( !(obj.duplicatesArr[0] instanceof Array) )
		{
			obj.duplicatesArr = obj.duplicatesArr.getObjectPropertyDuplicates("name");
			if(!obj.duplicatesArr.length)
			{
				return processed;
			}

			// abort if failed
			if( !(obj.duplicatesArr[0] instanceof Array) )
			{
				return processed;
			}
		}
	}
	else
	{
		if(obj.confirmBool) JSUI.alert("No duplicates found.");
		return processed;
	}

	// get duplicates info
	if(obj.confirmBool)
	{
		obj.message = obj.message ? obj.message : "Rename artboards?";

		var dupesMsg = "Duplicate artboard names detected\n\n";
        if(obj.duplicatesArr.length)
        {
            for(var i = 0; i < obj.duplicatesArr.length; i++)
            {   
                var dupe = obj.duplicatesArr[i];
                dupesMsg += ( dupe.length+"x\t"+dupe.getUniqueValues("name") + "\n" );
            }
			obj.message += dupesMsg;
        }

		obj.title = "Confirm Rename Artboard Duplicates";
		obj.label = "Rename";

		if(!JSUI.confirm( obj ))
		{
			return processed;
		}
	}

	for(var i = 0; i < obj.duplicatesArr.length; i++)
	{
		var set = obj.duplicatesArr[i];
		// skip first item!
		for(var j = 1; j < set.length; j++)
		{
			var jsObj = set[j];
			if(!jsObj) continue;
			var updatedName = jsObj.name.trim() + "_" + (j+1).toString().zeroPad(3);

			if(Pslib.isIllustrator)
			{
				var artboard = doc.artboards[jsObj.id];
				if(artboard)
				{
					artboard.name = updatedName;
					processed.push(artboard);
				}
			}
			else if(Pslib.isPhotoshop)
			{
				var artboard = Pslib.selectLayerByID(jsObj.id);
				if(artboard)
				{
					artboard.name = updatedName;
					processed.push(artboard);
				}
			}
		}
	}
	return processed;
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

// this helps with grid-fitting (illustrator only)
Pslib.fitRasterObjectToPixelGrid = function( rasterObj )
{
    if(!app.documents.length) return;

	if(Pslib.isIllustrator)
	{
		if(!rasterObj)
		{
			if(app.selection)
			{
				rasterObj = app.selection[0];
			}
		}
        else
        {
            app.selection = rasterObj;
        }

        if(!rasterObj) return;

        if(rasterObj.typename != "RasterItem")
        {
			if(rasterObj.typename == "GroupItem")
			{
				var isTifGroup = Pslib.isMacOSplacedTif(rasterObj, true);
				if(isTifGroup)
				{
					app.selection = isTifGroup;
					rasterObj = app.selection[0];
				}
			}
        }

        if(rasterObj.typename == "RasterItem")
        {        
            try
            {
                // // should warn user if rotation is applied
                // if(rasterObj.tags.length)
                // { 
                //     if(rasterObj.tags[0].name == "BBAccumRotation")
                //     {
                //
                //     }
                // }
                var x = Math.round(rasterObj.left);
                var y = Math.round(rasterObj.top);
                var w = rasterObj.boundingBox[2];
                var h = rasterObj.boundingBox[1];
                rasterObj.left = x;
                rasterObj.top = y;
                rasterObj.width = w;
                rasterObj.height = h;

                app.selection = rasterObj;
                return rasterObj;
            }
            catch(e)
            {
                // alert("Error resizing! " + e);
            }
        }

    }
    // attempt to get raster smartobject details, resize to match pixel grid?
    else if(Pslib.isPhotoshop)
	{

    }
}

// if selection was pasted from clipboard on macOS...
// item may be a GroupItem containing a single RasterItem 
// named with six alphanumeric characters + .tif extension
Pslib.isMacOSplacedTif = function(item, ungroup)
{
	if(!app.documents.length) return;

	if(Pslib.isIllustrator)
	{
		if(!item) return;

		// first check for expected structure
		if(item.typename == "GroupItem")
		{
			// is group, AND has only one nested PageItem
			if(item.pageItems.length == 1)
			{
				// var hasTifExt = item.name.getFileExtension() === ".tif"; // null if no match
				var hasTifExt = item.name.hasSpecificExtension(".tif");
				if(hasTifExt)
				{
					if(item.name.getFileNameWithoutExtension().length == 6)
					{
						if(item.pageItems[0].typename == "RasterItem")
						{
							if(item.pageItems[0].name == "Layer 0")
							{	
								if(ungroup)
								{
									var rasterGroup = item;
									var storedName = rasterGroup.name;
									var newItem = rasterGroup.pageItems[0];
									newItem.name = storedName;
									newItem.move(rasterGroup, ElementPlacement.PLACEAFTER);
									return newItem;
								}
								return true;
							}
	
						}
					}
				}
			}
		}
	}
	else if(Pslib.isPhotoshop)
	{

	}
}

Pslib.documentFromArtboard = function( templateUri, createOutlines )
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
			
			if(createOutlines)
			{
				if(destItem.typename == "TextFrame") // TextFrameItem + LegacyTextItem	
				{
					destItem.createOutline();
				}
			}
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
		if(!obj) obj = {};

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
							var tags = Pslib.getAllTags(placeholder);
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
					newDoc = Pslib.documentFromArtboard( obj.templateUri, obj.createOutlines );
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
// var psd = Pslib.artboardToFile( { extension: ".psd", close: true } );
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

		// if .psd, include a placeholder rectangle to force canvas dimensions
		if(obj.extension == ".psd")
		{
			// if creating photoshop file, make sure to outline text 
			if(obj.createOutlines == undefined) obj.createOutlines = true;

			var activeIndex = doc.artboards.getActiveArtboardIndex();
			var artboard = Pslib.getActiveArtboard();

			if(obj.pagesArr == undefined)
			{
				artboard = doc.artboards[activeIndex];			
				obj.pagesArr = [activeIndex+1];
			}

			// if target index does not match active artboard, make sure it does
			if(obj.pagesArr.toString() != (activeIndex+1).toString())
			{
				doc.selection = null;
				var index = parseInt(obj.pagesArr.toString());
				if(!isNaN(index))
				{
					index -= 1;
					doc.artboards.setActiveArtboardIndex(index);
					artboard = doc.artboards[index];
				}
			}

			var placeholder;

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


// create artboard from external reference (png, svg, json, pdf?)
// support handling of extended info such as stored XMP
Pslib.artboardFromFile = function( obj )
{
    if(!app.documents.length) return;
    if(!obj) obj = {};

    // if string, assume URI
    if(typeof obj == "string")
    {
        obj = { imgFile: new File(obj) };
    } 

    if(obj instanceof File)
    {
        obj = { imgFile: obj, extension: obj.toString().getFileExtension() };
    }

    var doc = app.activeDocument;
    var artboard;
    var item;

	if(Pslib.isIllustrator)
	{
        // var imgFile;
        if(obj.imgFile.exists)
        {
            if(obj.extension == ".svg")
            {
                // this places the content of the SVG in the middle of the screen
                // zoom out first maybe?
                item = doc.groupItems.createFromFile(obj.imgFile);  
                
                // could also "open" SVG as doc and get artboard content instead
            }
            else if(obj.extension == ".png")
            {
                item = doc.placedItems.add();
                item.file = obj.imgFile; 
                item.embed(); 

                Pslib.fitRasterObjectToPixelGrid(item);
            }

            if(item)
            {
                // position at integers

                // add artboard
                var itemBounds = item.visibleBounds;
                // JSUI.quickLog(itemBounds, item.typename);

                var x = Math.round(item.left);
                var y = Math.round(item.top);

                var w = item.width;
                var h = item.height;
                if(item.typename == "RasterItem")
                {
                    w = item.boundingBox[2];
                    h = item.boundingBox[1];
                }

                if(!obj.rect) obj.rect = [ x, y, x+w, y-h ];
                // alert(item.visibleBounds)
                // var artboardRect = [ item.left, item.top, item.left+w, item.top-h];
                
                // artboard = doc.artboards.add( [ item.left, item.top, item.left+item.width, item.top+item.height ] ); // [x1, y1, x2, y2]
                artboard = doc.artboards.add( obj.rect ); // [x1, y1, x2, y2]
                doc.artboards.setActiveArtboardIndex(doc.artboards.length-1);

                var rectangle = Pslib.addArtboardRectangle( artboard ); // if you need a color reference

                // position 
                // var viewCoords = Pslib.getViewCoordinates();
                // Pslib.zoomOnArtboard( Pslib.getActiveArtboard(), undefined, 0.2 );
                // Pslib.zoomOnArtboard( artboard, undefined, 0.2 );
            }
        }

    }
	else if(Pslib.isPhotoshop)
	{
        // place embedded files 

		if(obj.imgFile.exists)
        {

		}

    }
    return artboard;
}

Pslib.placeItem = function( obj )
{
	if(!app.documents.length) return;
	var doc = app.activeDocument;

	if( typeof obj == "string" )
	{
		obj = { imgFile: new File(obj) };
	}
	else if( obj instanceof File )
	{
		obj = { imgFile: obj };
	}
	else if(obj instanceof Array)
	{
		// if array, assume list of files, process recursively
		var placedItems = [];
		for(var i = 0; i < obj.length; i++)
		{
			placedItems.push( Pslib.placeItem( obj[i]) );
		}
		return placedItems;
	}

    if(!obj) obj = {};

	if(!obj.imgFile)
	{
		if(!obj.message) obj.message = "Select resource to embed";
		if(!obj.filter) obj.filter = "PNG:*.png, Scalable Vector Graphics:*.svg, WebP:*.webp, Acrobat:*.pdf, Photoshop Document:*.psd|*.psb, TIFF:*.tif|*.tiff, GIF:*.gif, JPEG:*.jpg|*.jpeg, Any:*.*;";

		// prompt user for image file
		obj.imgFile = File.openDialog(obj.message, "*.png;*.svg;*.pdf;*.psd", false);

        if(!obj.imgFile)
		{ 
			return; 
		}
	}

	var placedItem;

	if(Pslib.isPhotoshop)
	{
		var initialLayer = doc.activeLayer;

		var desc412 = new ActionDescriptor();
		desc412.putInteger( sTID('ID'), 46 );
		desc412.putPath( sTID('null'), obj.imgFile );
		desc412.putEnumerated( sTID('freeTransformCenterState'), sTID('quadCenterState'), sTID('QCSAverage') );
			var desc413 = new ActionDescriptor();
			desc413.putUnitDouble( sTID('horizontal'), sTID('pixelsUnit'), 0.000000 );
			desc413.putUnitDouble( sTID('vertical'), sTID('pixelsUnit'), 0.000000 );
		desc412.putObject( sTID('offset'), sTID('offset'), desc413 );
			var desc414 = new ActionDescriptor();
				var ref4 = new ActionReference();
				ref4.putIdentifier( sTID('layer'), 46 );
			desc414.putReference( sTID('to'), ref4 );
		desc412.putObject( sTID('replaceLayer'), sTID('placeEvent'), desc414 );
		executeAction( sTID('placeEvent'), desc412, DialogModes.NO );

		var newLayer;
		if(initialLayer != doc.activeLayer) newLayer = doc.activeLayer;

		if(newLayer)
		{
			placedItem = newLayer;
			// var coords = Pslib.getLayerObjectCoordinates(newLayer);
			// artboard = Pslib.addNewArtboard( );
		}
	}
	else if(Pslib.isIllustrator)
	{
		var extension = obj.imgFile.name.getFileExtension();

		if(extension == ".svg")
		{
			// this places the content of the SVG in the middle of the screen
			// zoom out first maybe?
			placedItem = doc.groupItems.createFromFile(obj.imgFile);  
			
			// could also "open" SVG as doc and get artboard content instead
		}
		else if(extension == ".png")
		{
			placedItem = doc.placedItems.add();
			placedItem.file = obj.imgFile; 
			placedItem.embed(); 

			Pslib.fitRasterObjectToPixelGrid(placedItem);
		}

		if(placedItem)
		{
			// position at integers

			// add artboard
			var itemBounds = placedItem.visibleBounds;
			// JSUI.quickLog(itemBounds, placedItem.typename);

			var x = Math.round(placedItem.left);
			var y = Math.round(placedItem.top);

			var w = placedItem.width;
			var h = placedItem.height;
			if(placedItem.typename == "RasterItem")
			{
				w = placedItem.boundingBox[2];
				h = placedItem.boundingBox[1];
			}

			// if(!obj.rect) obj.rect = [ x, y, x+w, y-h ];
		}
	}
	return placedItem;
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
// options: 
// 		- obj.destination  // absolute export location (string or folder object) 
//    - obj.json
//	  - obj.xmp
// 		- .xmpDict (?)
// 		- .converterArr 
//
// 	- obj.includeSVG
//
Pslib.documentToFile = function( obj )
{
	if(!app.documents.length) return;
	if(!obj) obj = {};
	var doc = app.activeDocument;
	if(Pslib.isPhotoshop) obj.includeSVG = false;

	// var extension = ".svg";
	var extension = ".png";
	var outputFile;
	var svgOutputFile;
	
	var docNameNoExt = doc.name.getDocumentName();
	var assetsUri;

	// if provided with absolute file location 
	if(obj.destination)
	{
		if(obj.destination instanceof File)
		{
			outputFile = obj.destination;
			// assetsUri = outputFile.parent;
		}
		else if(typeof obj.destination == "string")
		{
			outputFile = new File(obj.destination);
			// assetsUri = outputFile.parent;
		}
		else
		{
			outputFile = new File(obj.destination + "/" + docNameNoExt + extension);
			// assetsUri = outputFile.parent;
		}
	}
	else
	{
		outputFile = new File( doc.name.getAssetsFolderLocation( undefined, false, true, true) + "/" + docNameNoExt + extension );	
		// assetsUri = outputFile.parent;
	}

	assetsUri = outputFile.parent;
	
	// if destination folder does not exist, but its parent does, create destination
	if(!assetsUri.exists && assetsUri.parent.exists) assetsUri.create();

	if(outputFile.exists) outputFile.remove();

	if(obj.includeSVG)
	{
		// svgOutputFile = outputFile.toString().swapFileObjectFileExtension(".svg"); // separate file object
		svgOutputFile = new File(assetsUri + "/" + docNameNoExt + ".svg"); // separate file object
		if(svgOutputFile.exists) svgOutputFile.remove();
	}

	var artboardsCount = Pslib.getArtboardsCount();
	var tempRectangle;
	
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


		outputFile = new File(assetsUri + "/" + docNameNoExt + extension);

		var activeArtboardIndex = doc.artboards.getActiveArtboardIndex();
	
		// if match found, we may have a conflict with saving document as PNG with same name.
		var artboardNameIndex = -1;

		// first check if artboard with document name is present in artboard collection
		var names = Pslib.getArtboardNames();
		var namesStr = names.join(" ");
		// var docNameNoExt = doc.name.getFileNameWithoutExtension();

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
			tempArtboard = doc.artboards.add( [ 0, 0, 1, -1 ] ); // [x1, y1, x2, y2]
	
			// tempArtboard.name = "TEMP_" + (Math.random() * 1000).toString(16);
			tempArtboard.name = docNameNoExt;
			doc.artboards.setActiveArtboardIndex(artboardsCount);
			tempRectangle = Pslib.addArtboardRectangle(); // if you need a color reference
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
		var formatOptions = obj.formatOptions ? obj.formatOptions : new ExportForScreensOptionsPNG24();
		// ExportForScreensOptionsPNG24.scaleTypeValue (default 1.0)

		// if(extension == ".svg")
		// {
		// 	formatType = ExportForScreensType.SE_SVG;
		// 	formatOptions = obj.formatOptions ? obj.formatOptions : new ExportForScreensOptionsWebOptimizedSVG();
		// 	formatOptions.fontType = obj.formatOptions ? obj.formatOptions.fontType : SVGFontType.OUTLINEFONT;
		// }
	
		doc.exportForScreens(assetsUri, formatType, formatOptions, exportOptions, "");

		if(obj.includeSVG)
		{
			formatType = ExportForScreensType.SE_SVG;
			formatOptions = new ExportForScreensOptionsWebOptimizedSVG();
			formatOptions.fontType = SVGFontType.OUTLINEFONT;

			doc.exportForScreens(assetsUri, formatType, formatOptions, exportOptions, "");
		}
	
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
			tempRectangle.remove();
			tempArtboard.remove();
			doc.artboards.setActiveArtboardIndex(activeArtboardIndex);
		}
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
			
			// fails if no transparency!
			try
			{
				doc.exportDocument(outputFile, ExportType.SAVEFORWEB, opts);
			}	
			catch(e)
			{
				outputFile = false;
			}
		}
	}

	// optional
	if(obj.json)
	{
		// we can use this info to get a functional offset for image extraction
		var docSpecs = Pslib.getDocumentSpecs();
	
		var docAssetsJson = Pslib.artboardCollectionCoordsToJsonFile(undefined, docSpecs);
	}

	if(obj.xmp)
	{
		// include custom structure array

	}

	return outputFile;
}


// select first art item found with provided name on current artboard
	// *** adapt for existing item list match / artboard bounds?
	// *** itemCollection == existing PageItem or array of PageItem objects
Pslib.getArtboardItem = function( artboard, nameStr, itemCollection, activate )
{
	if(!app.documents.length) return;

	if(!nameStr) { var nameStr = "#"; }
	if(!artboard) { var artboard = Pslib.getActiveArtboard(); }
	if(activate == undefined) activate = true;
	
	var doc = app.activeDocument;
	var targetItem;

	if(Pslib.isPhotoshop)
	{
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
		// if a collection of PageItems is provided, check if overlap with target artboard
		if(itemCollection)
		{
			// recursive loop
			function _loopItems( item, itemNameStr, tagNameStr, firstMatch )
			{
				if(!item) return;
				if(itemNameStr == undefined) var itemNameStr = "#";
				if(tagNameStr == undefined) var tagNameStr = "assetID";
				var targetItem;
				var matchedItems = [];
				// think of solution for CompoundPath type
				if(item.typename == "PathItem" && item.name == itemNameStr)
				{
					targetItem = item;
				}
				else if( item.typename == "GroupItem")
				{
					var groupItems = item.pageItems;
					// for (var j = 0; j < groupItems.length; j++)
					for (var g = groupItems.length-1; g > -1; g--)
					{
						var targetGroupItem = _loopItems(groupItems[g], itemNameStr, tagNameStr, firstMatch);
						if(targetGroupItem)
						{ 
							if(firstMatch) return targetGroupItem;
							else matchedItems.push(targetGroupItem);
						}
					}
					if(matchedItems.length == 1)
					{
						targetItem = matchedItems[0];
						return targetItem;
					}
				}

				// if multiple matches, target objects with tags
				if((matchedItems.length > 1) && tagNameStr)
				{
					// for (var m = 0; m < matchedItems.length; m++)
					for (var m = matchedItems.length-1; m > -1; m--)
					{
						var match = matchedItems[m];
						var tags = match.tags;
						if(tags.length)
						{
							for (var t = 0; t < tags.length; t++)
							{
								var tag = tags[t];
								if(tag)
								{
									if(tag[0] == tagNameStr)
									{
										if(tag[1])
										{
											if(tag[1].length)
											{
												targetItem = match;
												return targetItem;
												// break;
											}
										}
									}
								}
							}
						}
					}
				}
				return targetItem;
			}

			// find pathitem with specific name
			var pageItems = Pslib.getItemsOverlapArtboard( itemCollection, artboard, true );

			for (var i = 0; i < pageItems.length; i++)
			{
				var item = pageItems[i];
				var match = _loopItems(item, nameStr, tagNameStr, firstMatch);
				if(match)
				{
					targetItem = item;
					break;
				}
			}
		}
		else
		{
			// attempt to find target by actively scanning content (avoid when possible)
			// - this is significantly longer to process
			// - selection triggers events that will affect 
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
						if(activate) item.isIsolated = true;

						var groupItems = item.pageItems;
						for (var j = 0; j < groupItems.length; j++)
						{
							var subItem = groupItems[j];
							if(subItem.name == nameStr)
							{
								targetItem = subItem;
								if(activate) doc.selection = subItem;
								break;
							}
						}
		
						// exit isolation mode
						if(activate) item.isIsolated = false;
					}
					else if(item.typename == "PathItem" && item.name == nameStr)
					{
						targetItem = item;
						if(activate) doc.selection = item;
						break;
					}
				}
			}
		}
	}
	return targetItem;
}

Pslib.getInfosForTaggedItems = function(itemCollection, pageItemType, nameStr, tagsArr, matchArtboards, artboardCollection, searchGroupItems)
{
    if(!app.documents.length) return;
    var doc = app.activeDocument;

    var itemInfos = [];

    if(Pslib.isIllustrator)
    {
        if(itemCollection == undefined) itemCollection = doc.pageItems;

        var doMatchType = false;
        if(pageItemType == undefined) pageItemType = "PathItem";
        if(pageItemType) doMatchType = true;
    
        if(nameStr == undefined) nameStr = "#";
    
        var getAllTags = false;
        if(tagsArr == undefined) tagsArr = [];
        if(tagsArr.length == 0) getAllTags = true;
        
        if(searchGroupItems == undefined) searchGroupItems = pageItemType != "GroupItem";
    
        // default target name is "#", an empty string is a wildcard for any name
        var doMatchName = nameStr.length > 0; 
    
        if(itemCollection)
        {
            function _filterItems( item )
            {
                var targetItem;
                if( item.typename == "GroupItem" && searchGroupItems)
                {
                    var groupItems = item.pageItems;
                    for (var j = 0; j < groupItems.length; j++)
                    {
                        targetItem = _filterItems(groupItems[j]);
                        if(targetItem) break;
                    }
                }
    
                if(doMatchType)
                {
                    if(item.typename != pageItemType) return;
                }
    
                if(doMatchName)
                {
                    if(item.name != nameStr) return;
                }
                targetItem = item;
    
                return targetItem;
            }
    
            // first pass: get items with tags
            for (var i = 0; i < itemCollection.length; i++)
            {
                var item = itemCollection[i];
                if( item.typename == "GroupItem" && searchGroupItems)
                {
                    var groupItems = item.pageItems;
                    for (var j = 0; j < groupItems.length; j++)
                    {
                        targetItem = _filterItems(groupItems[j]);
                        if(targetItem) break;
                    }
                }
    
                if(doMatchType)
                {
                    if(item.typename != pageItemType) continue;
                }
                var itemTags = getAllTags ? Pslib.getAllTags( item ) : Pslib.getTags( item, tagsArr );
    
                if(itemTags.length)
                {
					// filter empty tags
                    var info = { uuid: item.uuid };
					var filteredTags = [];

					for (var t = 0; t < itemTags.length; t++)
					{
						var tag = itemTags[t];
						if(tag[1].length) { 
							var tagSet = [tag[0], tag[1]];
							// if(tag[2] != undefined) tagSet.push(tag[2]);
							filteredTags.push(tagSet); 
						}
					}

					if(filteredTags.length)
					{
						info.tags = filteredTags;
						itemInfos.push(info);
					}
                }
            }
    
            // second pass, match tagged items to artboards
            if(matchArtboards)
            {
                if(artboardCollection == undefined) artboardCollection = Pslib.getAllArtboards();
                var collectionSameLength = artboardCollection.length == doc.artboards.length;
                for (var i = 0; i < itemInfos.length; i++)
                {
                    var info = itemInfos[i];
                    var item;
                    if(info.uuid) item = doc.getPageItemFromUuid(info.uuid);
                    if(!item) continue;
    
                    // this returns first artboard found matching item bounds 
                    for (var a = 0; a < artboardCollection.length; a++)
                    {
                        var artboard = artboardCollection[a];
                        var artboardMatch = Pslib.getItemsOverlapArtboard( [ item ], artboard, false );
                        if(artboardMatch)
                        {
                            var artboardIndex = a;
                            if(!collectionSameLength)
                            {
                                artboardIndex = Pslib.getArtboardIndex(artboard);
                            }
                            // update itemInfos array with artboard details
                            itemInfos[i].index = artboardIndex;
                            itemInfos[i].name = doc.artboards[artboardIndex].name;
                            itemInfos[i].uuid = info.uuid;
                        }
                    }
                }
            }
        }
    }
    return itemInfos;
}

// 
Pslib.getArtboardSpecsInfo = function( obj )
{
    if(!app.documents.length) return [];

    if(!obj)
    {
        var obj = { };
		// obj.artboards = [];
		// if(Pslib.isIllustrator) obj.artboards = app.activeDocument.artboards;
    }

    var doc = app.activeDocument;
	if(!obj.artboards) obj.artboards = Pslib.getAllArtboards();

	if(Pslib.isPhotoshop)
	{
		var originalActiveLayer = doc.activeLayer; // may not be an artboard!
		// var originalActiveLayerID = getActiveLayerID();
	
		// if(!obj.artboards) obj.artboards = getArtboards();

	
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
	}
    else if(Pslib.isIllustrator)
	{

	}

    return artboardSpecs;
}

Pslib.ungroupItems = function(id)
{
    if(!app.documents.length) return;

    var doc = app.activeDocument;
    var ungrouped = false;

	if(Pslib.isPhotoshop)
	{
		var currentID = doc.activeLayer.id;
		if(id == undefined) id = currentID;
		if(Pslib.getIsGroup(id))
		{
			var selectionChanged = Pslib.selectLayerByID(id);
			var target = Pslib.getLayerTargetByID(id);
			try{ 
				executeAction(  sTID( 'ungroupLayersEvent' ), target, DialogModes.NO ); 
				ungrouped = true;
			}catch(e){ }
			if(selectionChanged) Pslib.selectLayerByID(currentID);
		}
    }
    // else if(Pslib.isIllustrator)
    // {

    // }

    return ungrouped;
}

Pslib.collapseAllGroups = function()
{
    if(!app.documents.length) return;

    var doc = app.activeDocument;
    var collapsed = false;

	if(Pslib.isPhotoshop)
	{
        app.runMenuItem(sTID('collapseAllGroupsEvent'));
        collapsed = true;
    }
    // else if(Pslib.isIllustrator)
    // {

    // }

    return collapsed;
}

// add new artboard using specific coordinates
// .orientation: "left" "right" "up" "down"
Pslib.addNewArtboard = function( obj )
{
	if(!app.documents.length) return false;
    if(!obj) obj = {};

    if(!obj.name) obj.name = "New Artboard";
    if(!obj.spacing) obj.spacing = Pslib.isPhotoshop ? 100 : ( Pslib.isIllustrator ? 20 : 100);
	if(!obj.tags) obj.tags = [];
	if(!obj.ns) obj.ns = Pslib.XMPNAMESPACE;

	var doc = app.activeDocument;

	var artboard;
    var coords;
    var usingDocument = false; // ps only

    if(obj.x == undefined || obj.y == undefined || obj.width == undefined || obj.height == undefined)
    {
        // user is expected to select an artboard with sufficient space on its right-side
        var referenceArtboard = Pslib.getActiveArtboard();

        if(referenceArtboard)
        {
            coords = Pslib.getArtboardCoordinates( referenceArtboard.id );
            coords.x += (coords.width + obj.spacing);
        }

        // if we still don't have coordinates, either use last created artboard as a reference...
        if(obj.orientation)
        {

        }
        else if(!coords)
        {
            var artboardIDs = Pslib.getArtboardsIDs();
        
            if(artboardIDs.length)
            {
                coords = Pslib.getArtboardCoordinates( artboardIDs[artboardIDs.length-1]);
                coords.x += (coords.width + obj.spacing);
            }
            else 
            {
                if(Pslib.documentHasBackgroundLayer())
                {
                    // or fallback to document metrics
                    var docSpecs = Pslib.getDocumentSpecs();
                    coords = { name: obj.name, width: docSpecs.width, height: docSpecs.height, x: 0, y: 0 };
                    usingDocument = true;

                    if(obj.orientation == "stack") 
                    {
                        obj.orientation = undefined;
                    }

                    obj.x = 0
                    obj.y = 0;
                    obj.width = docSpecs.width;
                    obj.height = docSpecs.height;
                }
            }    
        }

        // if given a direction, auto-calculate coordinates
        if( !obj.orientation && !usingDocument && (coords.x == undefined || coords.y == undefined || coords.width == undefined || coords.height == undefined) ) return;
        if(!usingDocument && obj.orientation)
        {
			// top right bottom left
			// UP RIGHT DOWN LEFT 
			// NORTH EAST SOUTH WEST
            var d = obj.orientation.toString().toLowerCase();

			if( d == "topright" || d == "northeast" || d == "9")
            { 
                obj.x = coords.x; // + (coords.width + obj.spacing);
                obj.y = coords.y - (coords.height + obj.spacing);
				if(Pslib.isIllustrator) obj.y = coords.y + (coords.height + obj.spacing);
                obj.width = coords.width;
                obj.height = coords.height;
            }
            else if( d == "top" || d == "topcenter" || d == "north" || d == "up" || d == "8")
            {
                obj.x = coords.x - (coords.width + obj.spacing);
                obj.y = coords.y - (coords.height + obj.spacing);
				if(Pslib.isIllustrator) obj.y = coords.y + (coords.height + obj.spacing);
                obj.width = coords.width;
                obj.height = coords.height;
            }
			else if( d == "topleft" || d == "northwest" || d == "7")
            {
                obj.x = coords.x - ((coords.width + obj.spacing)*2);
                obj.y = coords.y - (coords.height + obj.spacing);
				if(Pslib.isIllustrator) obj.y = coords.y + (coords.height + obj.spacing);
                obj.width = coords.width;
                obj.height = coords.height;
            }
			else if( d == "left" || d == "west" || d == "6")
            {
                obj.x = coords.x - ((coords.width + obj.spacing)*2);
                obj.y = coords.y;
                obj.width = coords.width;
                obj.height = coords.height;
            }
			// if need be, create artboard directly on top of the active one.
			else if( d == "stack" || d == "5")
			{
				if(!usingDocument)
				{
					obj.x = coords.x - (coords.width + obj.spacing);
					obj.y = coords.y;
					obj.width = coords.width;
					obj.height = coords.height;
				}
			}
            else if( d == "right" || d == "east" || d == "4")
            {
                obj.x = coords.x;
                obj.y = coords.y;
                obj.width = coords.width;
                obj.height = coords.height;
            }
			else if( d == "bottomright" || d == "southeast"|| d == "3")
            { 
                obj.x = coords.x; //+ (coords.width + obj.spacing);
                obj.y = coords.y + (coords.height + obj.spacing);
				if(Pslib.isIllustrator) obj.y = coords.y - (coords.height + obj.spacing);
                obj.width = coords.width;
                obj.height = coords.height;
            }
            else if( d == "bottom" || d == "south" || d == "down" || d == "2")
            {
                obj.x = coords.x - (coords.width + obj.spacing);
                obj.y = coords.y + (coords.height + obj.spacing);
				if(Pslib.isIllustrator) obj.y = coords.y - (coords.height + obj.spacing);
                obj.width = coords.width;
                obj.height = coords.height;
            }
			else if( d == "bottomleft" || d == "southwest" || d == "1")
            { 
                obj.x = coords.x - ((coords.width + obj.spacing)*2);
                obj.y = coords.y + (coords.height + obj.spacing);
				if(Pslib.isIllustrator) obj.y = coords.y - (coords.height + obj.spacing);
                obj.width = coords.width;
                obj.height = coords.height;
            }
            else
            {
                obj.x = coords.x;
                obj.y = coords.y;
                obj.width = coords.width;
                obj.height = coords.height;
            }
        }
        else if(coords.x == undefined || coords.y == undefined || coords.width == undefined || coords.height == undefined) return;
        else
        {
            obj.x = coords.x;
            obj.y = coords.y;
            obj.width = coords.width;
            obj.height = coords.height;
        }
    }

    if(Pslib.isPhotoshop)
    {
        var idmake = sTID( "make" );
        var desc1 = new ActionDescriptor();
        var idnull = sTID( "null" );
            var ref5 = new ActionReference();
            var idartboardSection = sTID( "artboardSection" );
            ref5.putClass( idartboardSection );
        desc1.putReference( idnull, ref5 );
        var idlayerSectionStart = sTID( "layerSectionStart" );
        desc1.putInteger( idlayerSectionStart, 5 );
        var idlayerSectionEnd = sTID( "layerSectionEnd" );
        desc1.putInteger( idlayerSectionEnd, 6 );
        var idname = sTID( "name" );
        desc1.putString( idname, obj.name );
        var idartboardRect = sTID( "artboardRect" );
            var desc2 = new ActionDescriptor();
            var idtop = sTID( "top" );
            desc2.putDouble( idtop, obj.y );
            var idleft = sTID( "left" );
            desc2.putDouble( idleft, obj.x);
            var idbottom = sTID( "bottom" );
            desc2.putDouble( idbottom, obj.y+obj.height );
            var idright = sTID( "right" );
            desc2.putDouble( idright, obj.x+obj.width );
        var idclassFloatRect = sTID( "classFloatRect" );
        desc1.putObject( idartboardRect, idclassFloatRect, desc2 );
        executeAction( idmake, desc1, DialogModes.NO );

        if(obj.hex != undefined)
        {
            Pslib.updateArtboardBackgroundColor( obj.hex, false, [] );
        }
        else
        {
            Pslib.updateArtboardBackgroundTransparent();
        }

        artboard = doc.activeLayer;
        artboard.name = obj.name;

		if(obj.tags.length)
		{
			Pslib.setXmpProperties(artboard, obj.tags, obj.ns);
		}

		// option to reselect initial artboard
	}
	else if(Pslib.isIllustrator)
	{
		usingDocument = false; // illustrator document never has less than one artboard

		// var coords = Pslib.getArtboardCoordinates(obj.artboard);

			// top & bottom inverted!
        artboard = doc.artboards.add( [ obj.x, obj.y, obj.x + obj.width, obj.y - obj.height ] ); // [x1, y1, x2, y2]
		artboard.name = obj.name;

		var placeholder;

		// if(obj.hex || obj.tags.length)
		// {
			placeholder = Pslib.addRectangle( { name: "#", hex: obj.hex } );

			if(placeholder)
			{
				placeholder.name = "#";
				if(obj.tags.length)
				{
					Pslib.setTags( placeholder, obj.tags );
				}
				
				// send to layer?
				if(obj.layer)
				{
					// app.selection = placeholder;
					placeholder.move(obj.layer, ElementPlacement.PLACEATEND);
				}
			}
		// }

        doc.artboards.setActiveArtboardIndex(doc.artboards.length-1);

		// option to reselect initial artboard

	}

    return artboard;
}

// pshop+ilst wrapper for abstract selection of artboard (object, id, index, name)
Pslib.selectArtboard = function( artboardObj )
{
    if(!app.documents.length) return;
	if(artboardObj == undefined) return Pslib.getActiveArtboard();
	var doc = app.activeDocument;
	var selectedArtboard;

	if( typeof artboardObj == "string")
	{
		// string, assume we want to get object by name
		return Pslib.getArtboardByName(artboardObj, true);
	}

	if(Pslib.isPhotoshop)
	{
		if( typeof artboardObj == "number" )
		{
			// if number, assume photoshop layer ID
			selectedArtboard = Pslib.selectLayerByID( artboardObj, false );
		}
		else if(typeof artboardObj == "object")
		{
			// if JSON object with .id property, assume photoshop layer ID
			if(artboardObj.id != undefined)
			{
				selectedArtboard = Pslib.selectLayerByID( artboardObj.id, false );
			}
			// otherwise assume we're given an actual layer object to select
			else
			{
				doc.activeLayer = artboardObj;
				selectedArtboard = doc.activeLayer;
			}
			if(!Pslib.isArtboard(selectedArtboard)) selectedArtboard = undefined;
		}
	}
	else if(Pslib.isIllustrator)
	{
		// if number, assume artboard index
		if( typeof artboardObj == "number" )
		{
			doc.artboards.setActiveArtboardIndex(artboardObj);
			selectedArtboard = doc.artboards[artboardObj];
		}
		else if(typeof artboardObj == "object")
		{
			// if JSON object with .id property, assume photoshop layer ID
			if(artboardObj.index != undefined)
			{
				doc.artboards.setActiveArtboardIndex(artboardObj.index);
				selectedArtboard = doc.artboards[artboardObj.index];
			}
			// otherwise assume we're given an actual artboard object to select
			// brute-force this by comparing object with all artboards present in document
			else
			{
				for(var i = 0; i < doc.artboards.length; i++)
				{
					if(doc.artboards[i] == artboardObj)
					{
						doc.artboards.setActiveArtboardIndex(i);
						selectedArtboard = doc.artboards[i];
						break;
					}
	
				}
			}
		}
	}

	return selectedArtboard;
}

// 
// chance to use prefab with custom colors, name, and destination illustrator layers for placeholders
// var targetLayer;
// try { targetLayer = doc.layers.getByName("Placeholders"); }catch(e){}
// var cfg = {
//     north: { orientation: "north", name: "Top-most", hex: "000000", tags: [ [ "color", "000000"] ], layer: targetLayer },
//     east: { orientation: "east", name: "Right-most", hex: "00FF80", tags: [ [ "color", "00FF80"] ], layer: targetLayer },
//     south: { orientation: "south", name: "Bottom-most", hex: "8000FF", tags: [ [ "color", "8000FF"] ], layer: targetLayer },
//     west: { orientation: "west", name: "Left-most", hex: "800000", tags: [ [ "color", "800000"] ], layer: targetLayer }
// }
Pslib.addArtboardCompass = function( obj )
{
    if(!app.documents.length) return;
    if(!obj) obj = {};
    var doc = app.activeDocument;

    var artboards = {};
	
    artboards.center = Pslib.getActiveArtboard();

	if(!artboards.center) return;

	// if using prefab
	if(obj.north && obj.east && obj.south && obj.west)
	{
		artboards.north = Pslib.addNewArtboard( obj.north ? obj.north : { orientation: "north", name: obj.north.name ? obj.north.name : artboards.center.name + "_NORTH", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
		Pslib.selectArtboard(artboards.center);

		if(obj.northeast)
		{
			artboards.northeast = Pslib.addNewArtboard( obj.northeast ? obj.northeast : { orientation: "northeast", name: obj.north.name ? obj.north.name : artboards.center.name + "_NORTHEAST", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
			Pslib.selectArtboard(artboards.center);
		}
	
		artboards.east = Pslib.addNewArtboard( obj.east ? obj.east : { orientation: "east", name: obj.east.name ? obj.east.name : artboards.center.name + "_EAST", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
		Pslib.selectArtboard(artboards.center);
	
		if(obj.southeast)
		{
			artboards.southeast = Pslib.addNewArtboard( obj.southeast ? obj.southeast : { orientation: "southeast", name: obj.north.name ? obj.north.name : artboards.center.name + "_SOUTHEAST", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
			Pslib.selectArtboard(artboards.center);
		}

		artboards.south = Pslib.addNewArtboard( obj.south ? obj.south : { orientation: "south", name: obj.south.name ? obj.south.name : artboards.center.name + "_SOUTH", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
		Pslib.selectArtboard(artboards.center);
	
		if(obj.southwest)
		{
			artboards.southwest = Pslib.addNewArtboard( obj.southwest ? obj.southwest : { orientation: "southwest", name: obj.north.name ? obj.north.name : artboards.center.name + "_SOUTHWEST", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
			Pslib.selectArtboard(artboards.center);
		}

		artboards.west = Pslib.addNewArtboard( obj.west ? obj.west : { orientation: "west", name: obj.west.name ? obj.west.name : artboards.center.name + "_WEST", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
		Pslib.selectArtboard(artboards.center);

		if(obj.northwest)
		{
			artboards.northwest = Pslib.addNewArtboard( obj.northwest ? obj.northwest : { orientation: "northwest", name: obj.north.name ? obj.north.name : artboards.center.name + "_NORTHWEST", tags: obj.tags, hex: obj.hex, layer: obj.targetLayer });
			Pslib.selectArtboard(artboards.center);
		}
	}
	else
	{
		var targetLayer;
		try { if(Pslib.isIllustrator) targetLayer = doc.layers.getByName("Placeholders"); }catch(e){};

		artboards.north = Pslib.addNewArtboard( { orientation: "north", name: artboards.center.name + "_NORTH", hex: "transparent", layer: targetLayer });
		Pslib.selectArtboard(artboards.center);
	
		artboards.east = Pslib.addNewArtboard( { orientation: "east", name: artboards.center.name + "_EAST", hex: "transparent", layer: targetLayer });
		Pslib.selectArtboard(artboards.center);
	
		artboards.south = Pslib.addNewArtboard( { orientation: "south", name: artboards.center.name + "_SOUTH", hex: "transparent", layer: targetLayer });
		Pslib.selectArtboard(artboards.center);
	
		artboards.west = Pslib.addNewArtboard( { orientation: "west", name: artboards.center.name + "_WEST", hex: "transparent", layer: targetLayer });
		Pslib.selectArtboard(artboards.center);
	}

    return artboards;
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

	if(obj.hex == undefined) obj.hex = "transparent";

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

	if(!obj.name) obj.name = "#";

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
			if(obj.hex == "transparent")
			{
				rectangle.fillColor = transp;
			}
			else
			{
				colorObj = Pslib.hexToRGBobj(obj.hex);
			}
		}
		else if(typeof obj.hex == "object")
		{
			colorObj = obj.hex; // assume color object
		}

		rectangle.fillColor = colorObj;
		rectangle.name = obj.name;
	
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

		var colorObj = typeof obj.hex == "string" ? Pslib.hexToRGBobj(obj.hex) : obj.hex;
	
		// get artboard size
		var coords = Pslib.getArtboardCoordinates(artboard.id);

		// // fails
		// if(obj.sendToBack)
		// {	
		// 	var tmpSetRefLayer = artboard.artLayers.add();
		// }

		if(obj.mustBeUnique)
		{
			// find out if one of the children layers is a managed rectangle already
			// faster than Pslib.isShape() because no layer selection needed
			var artboardLayers = artboard.layers;
			for(var i = 0; i < artboardLayers.length; i++)
			{
				artboardLayer = artboardLayers[i];
				if(artboardLayer.typename == "ArtLayer")
				{
					// if shape layer
					if(artboardLayer.kind == LayerKind.SOLIDFILL)
					{
						if(artboardLayer.name == obj.name)
						{
							rectangle = artboardLayer;
							break;
						}
					}
				}
			}
		}
		var created = false;
		// if no pre existing reference rectangle, create new
		if(!rectangle)
		{
			rectangle = Pslib.addRectangle( obj );
			rectangle.name = obj.name;
			created = true;
		}
		else
		{
			doc.activeLayer = rectangle;
		}

		// update color if previous rectangle found
		if(obj.mustBeUnique && !created)
		{
			Pslib.setShapeColor( obj.hex );
		}

		if(obj.opacity != undefined) rectangle.opacity = obj.opacity;

		if(obj.sendToBack)
		{
			// // moving a layer to the back of a layerset is tricky
			// // we're not there yet
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

// plain add rectangle: default is document size
Pslib.addDocumentRectangle = function ( obj )
{    
    if(!app.documents.length) return;
    if(!obj) obj = {};

    if(!obj.hex) obj.hex = "EF00FE";
    if(!obj.opacity) obj.opacity = 50;
    if(!obj.name) obj.name = "Document_#";

    var doc = app.activeDocument;

    // color object: use native format 
    var colorObj;
    if(obj.colorObj) colorObj = colorObj;
    else colorObj = Pslib.hexToRGBobj(obj.hex);

    var docSpecs = Pslib.getDocumentSpecs();
    // obj.coords = { width: doc.width.as('px'), height: doc.height.as('px'), x: 0, y: 0 };
    obj.coords = { width: docSpecs.width, height: docSpecs.height, x: 0, y: 0 };
    
    var rectangle;

    if(Pslib.isPhotoshop)
    {
        rectangle = Pslib.addRectangle( obj );

		rectangle = doc.activeLayer;
		rectangle.name = obj.name;

		if(obj.opacity != undefined) rectangle.opacity = obj.opacity;
    }
    else if(Pslib.isIllustrator)
    {
		rectangle = doc.pathItems.rectangle( obj.coords.x, -obj.coords.y, obj.coords.x+obj.coords.width, obj.coords.y+obj.coords.height );

		rectangle.name = obj.name;

		rectangle.fillColor = colorObj;
		if(obj.opacity != undefined) rectangle.opacity = obj.opacity;

		// offset x: topLeft[0] and x: topLeft[1]
		rectangle.left += docSpecs.topLeft[0];
		rectangle.top += docSpecs.topLeft[1];

		if(obj.opacity != undefined) rectangle.opacity = obj.opacity;

		try
		{
			rectangle.zOrder(ZOrderMethod.SENDTOBACK);
		}
		catch(e)
		{

		}
    }

    return rectangle;
}


// plain add rectangle shape layer/pathitem wrapper (defaults to artboard coordinates)
Pslib.addRectangle = function ( obj )
{
    if(!app.documents.length) return;
    if(!obj) obj = {};
    if(!obj.hex) obj.hex = "FF00FF";
    if(!obj.name) obj.name = "#";

    var doc = activeDocument;
    // var layer = doc.activeLayer;

    var rectangle;
    if(!obj.coords) obj.coords = coords = Pslib.getArtboardCoordinates();

    var colorObj;
    
    if(obj.colorObj) colorObj = colorObj;
    else colorObj = Pslib.hexToRGBobj(obj.hex);

    if(Pslib.isPhotoshop)
    {
        // extended styling info
        // idstrokeStyleResolution, 144.000000 ); // resolution rereference...?
        if(obj.strokeResolution == undefined) obj.strokeResolution = 144.0; // or 72.0? instructions unclear
        if(obj.strokeWidth == undefined) obj.strokeWidth = 0.0;
        if(obj.strokeOpacity == undefined) obj.strokeOpacity = 100.0;
        if(!obj.strokeHex) obj.strokeHex = "000000";         
        var strokeColorObj = Pslib.hexToRGBobj(obj.strokeHex);

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
                var idgrain = sTID( "grain" ); // LET'S STORE OUR GRAIN FOR THE WINTER LOL
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
            desc256.putUnitDouble( idtop, idpixelsUnit, obj.coords.y );
            var idleft = sTID( "left" );
            var idpixelsUnit = sTID( "pixelsUnit" );
            desc256.putUnitDouble( idleft, idpixelsUnit, obj.coords.x );
            var idbottom = sTID( "bottom" );
            var idpixelsUnit = sTID( "pixelsUnit" );
            desc256.putUnitDouble( idbottom, idpixelsUnit, obj.coords.y + obj.coords.height );
            var idright = sTID( "right" );
            var idpixelsUnit = sTID( "pixelsUnit" );
            desc256.putUnitDouble( idright, idpixelsUnit, obj.coords.x + obj.coords.width );
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
            desc257.putUnitDouble( idstrokeStyleLineWidth, idpixelsUnit, obj.strokeWidth );  // stroke width
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
            desc257.putUnitDouble( idstrokeStyleOpacity, idpercentUnit, obj.strokeOpacity); // stroke opacity
            var idstrokeStyleContent = sTID( "strokeStyleContent" );
                var desc258 = new ActionDescriptor();
                var idcolor = sTID( "color" );
                    var desc259 = new ActionDescriptor();
                    var idred = sTID( "red" );
                    desc259.putDouble( idred, strokeColorObj.rgb.red); // stroke RGB red
                    var idgrain = sTID( "grain" );
                    desc259.putDouble( idgrain, strokeColorObj.rgb.green ); // stroke RGB green
                    var idblue = sTID( "blue" );
                    desc259.putDouble( idblue, strokeColorObj.rgb.blue ); // stroke RGB blue
                var idRGBColor = sTID( "RGBColor" );
                desc258.putObject( idcolor, idRGBColor, desc259 );  // stroke RGBColorObj
            var idsolidColorLayer = sTID( "solidColorLayer" );
            desc257.putObject( idstrokeStyleContent, idsolidColorLayer, desc258 );
            var idstrokeStyleResolution = sTID( "strokeStyleResolution" );
            desc257.putDouble( idstrokeStyleResolution, obj.strokeResolution ); // stroke resolution (?)
        var idstrokeStyle = sTID( "strokeStyle" );
        desc253.putObject( idstrokeStyle, idstrokeStyle, desc257 );
        var idcontentLayer = sTID( "contentLayer" );
        desc252.putObject( idusing, idcontentLayer, desc253 );
        var idlayerID = sTID( "layerID" );
        desc252.putInteger( idlayerID, 5 ); // ArtLayer type?
        executeAction( idmake, desc252, DialogModes.NO );

        rectangle = app.activeDocument.activeLayer;
        rectangle.name = obj.name ? obj.name : "#";

        if(obj.opacity != undefined) rectangle.opacity = obj.opacity;
    }
    else if(Pslib.isIllustrator)
    {
		rectangle = doc.pathItems.rectangle( coords.x, -coords.y, coords.x+coords.width, coords.y+coords.height );

		if(!rectangle) return
		doc.selection = rectangle;
	
		var transp = new NoColor();
		rectangle.strokeColor = transp;
		var colorObj = transp;

		if(typeof obj.hex == "string")
		{
			if(obj.hex == "transparent")
			{
				rectangle.fillColor = transp;
			}
			else
			{
				colorObj = Pslib.hexToRGBobj(obj.hex);
			}
		}
		else if(typeof obj.hex == "object")
		{
			colorObj = obj.hex; // assume color object
		}

		rectangle.fillColor = colorObj;
    }
    return rectangle;
}

// add rectangles to all artboards
// hexStr = "transparent"
Pslib.addArtboardRectangles = function ( arr, hexStr, randomize, unique, grayscale )
{
	if(!app.documents.length) return;
	if(randomize == undefined) randomize = false; // no randomization
	// if(hexStr == undefined) hexStr = "ff00ff";
	if(unique == undefined) unique = true;
	if(grayscale == undefined) grayscale = false;

	var allSelected = false;

	// if the only argument provided is a string, assume its the hex value
	if((typeof arr == "string") && (hexStr == undefined))
	{
		hexStr = arr;
		hexStr = "transparent";
		arr = Pslib.getSpecsForAllArtboards();
		allSelected = true;
	}
	
	if(hexStr == undefined) hexStr = "transparent";
	if(!arr)
	{
		// arr = Pslib.getSpecsForAllArtboards(true);
		arr = Pslib.getSpecsForAllArtboards();
		allSelected = true;
	}

	var doc = app.activeDocument;
	var rectArr = [];
	var initialArtboard = arr;

	if(Pslib.isIllustrator)
	{
		// initialArtboard = Pslib.getArtboardIndex( Pslib.getActiveArtboard() );
		initialArtboard = doc.artboards.getActiveArtboardIndex();
		var initialSelection = doc.selection;

		for(var i = 0; i < arr.length; i++)
		{
			var artboardIndex = arr[i].id;
			if(artboardIndex == undefined) continue;

			var artboard = doc.artboards[artboardIndex];
			doc.artboards.setActiveArtboardIndex(artboardIndex);
			var rgbObj = Pslib.randomizeRGBColor(hexStr, randomize, false, grayscale);
			// var obj = { artboard: artboard, mustBeUnique: unique, hex: rgbObj.rgb.hexValue, sendToBack: true };
			var obj = { artboard: artboard, mustBeUnique: unique, hex: rgbObj, sendToBack: true };
			var rect = Pslib.addArtboardRectangle( obj );
			rectArr.push(rect);
		}
		// restore initial active artboard and selection
		doc.artboards.setActiveArtboardIndex(initialArtboard);
		if(initialSelection) doc.selection = initialSelection;
		// return true;
	}
	else if(Pslib.isPhotoshop)
	{
		initialArtboard = doc.activeLayer;

		for(var i = 0; i < arr.length; i++)
		{
			var artboard = arr[i].id;
			// var rgbObj = randomize ? Pslib.randomizeRGBColor(hexStr, randomize) : Pslib.hexToRGBobj(hexStr);
			var rgbObj = Pslib.randomizeRGBColor(hexStr, randomize, false, grayscale);
			var obj = { artboard: artboard, mustBeUnique: unique, hex: rgbObj, sendToBack: true };
			var rect = Pslib.addArtboardRectangle( obj );
			// if(unique)
			// {
			// 	// Pslib.updateArtboardBackgroundColor(hexStr, create) // for setting artboard background itself
			// 	Pslib.updateFillColor( rect, rgbObj ); // reference rectangle
			// }
			rectArr.push(rect);
		}

		// if all artboards were being modified, only make original layer active
		if(allSelected)
		{
			if(initialArtboard) doc.activeLayer = initialArtboard;
		}
		// if only a subset of artboards were modified, attempt to reselect collection
		else
		{
			Pslib.selectArtboardsCollection(arr);
		}
	}

    return rectArr;
}

// scan array of artboards and remove placeholder items
Pslib.removeArtboardRectangles = function ( arr, nameStr )
{
	if(!app.documents.length) return;
	var doc = activeDocument;

	if(!arr) arr = Pslib.getSpecsForAllArtboards( true );
	if(!nameStr) nameStr = "#";

	if(Pslib.isPhotoshop)
	{
		for(var i = 0; i < arr.length; i++)
		{
			Pslib.selectLayerByID(arr[i]);
			var rectangle = Pslib.getArtboardItem( doc.activeLayer, nameStr);
			if(rectangle)
			{
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
		return true;
	}
	else if(Pslib.isIllustrator)
	{
		// var items = Pslib.getArtboardItems( arr, nameStr );

		// JSUI.quickLog(items);
		for(var i = 0; i < arr.length; i++)
		{
			var rectangle = Pslib.getArtboardItem( doc.activeLayer, nameStr);
			if(rectangle)
			{
				rectangle.remove();
			}
			else
			{
				// JSUI.quickLog(arr[i]+" No rectangle found.");
			}
		}
		return true;
	}
}

// delete rectangles for selected artboards (uses geometry)
Pslib.deleteSelectedArtboardRectangles = function ( nameStr )
{
	if(!app.documents.length) return;
	if(!nameStr) nameStr = "#";
	var doc = app.activeDocument;
	var deleteCount = 0;

	if(Pslib.isPhotoshop)
	{

	}
	else if(Pslib.isIllustrator)
	{
		// var initialSelection = doc.selection;

		var artboards = Pslib.getArtboardsFromSelectedItems();
		for(var i = 0; i < artboards.length; i++)
		{
			var artboard = artboards[i];
			// var artboardIndex = Pslib.getArtboardIndex(artboard, true);
			// doc.artboards.setActiveArtboardIndex(artboardIndex-1);
			var rectangle; 
			rectangle = Pslib.getArtboardItem(artboard, nameStr);
			if(rectangle)
			{
				rectangle.remove();
				deleteCount++;
			}
		}
		// restoring selection in a context where we just deleted a bunch of stuff is just going to fail
		// if(initialSelection) doc.selection = initialSelection;
		return deleteCount;
	}
}

// add text item / rectangle background - target artboard or document geometry
// resulting photoshop text layer may auto-nest into nearest artboard, we don't really have a workaround.
//
// var textObj = { text: "DOCUMENT", hex: "000000", background: true, entireDocument: true, backgroundHex: "FF0000", backgroundOpacity: 66 };
// var textItem = Pslib.addTextItem( textObj );
Pslib.addTextItem = function( obj )
{
    if(!app.documents.length) return;

    if(!obj) obj = {};
    if(!obj.text) obj.text = "PLACEHOLDER";
    if(!obj.hex) obj.hex = "ffffff";
    if(!obj.width) obj.width = 350;
    if(!obj.height) obj.height = 42;
    if(obj.x == undefined) obj.x = 15;
    if(obj.y == undefined) obj.y = 15;

    var doc = app.activeDocument;

	var tlayer;
    var textItem;
    var rectangle;

    if(Pslib.isPhotoshop)
    {
        var container;
        if(obj.background)
        {
            // deal with label / background item
            if(obj.artboard)
            {
                container = obj.artboard;
                rectangle = Pslib.addArtboardRectangle( { artboard: container.id, hex: obj.backgroundHex });
            }
            else if(obj.entireDocument)
            {
                container = doc;
                rectangle = Pslib.addDocumentRectangle( { hex: obj.backgroundHex });
            }
            else
            {
                container = Pslib.getActiveArtboard();
            }
        }
        else
        {
            container = Pslib.getActiveArtboard();
        }

        if(!container) return;

        if(container)
        {
            if(!obj.entireDocument) doc.activeLayer = container;
            tlayer = container.artLayers.add();
        }
        else
        {
            tlayer = doc.artLayers.add();
        }

        doc.activeLayer = tlayer;
        // tlayer = container ? container.artLayers.add() : doc.artLayers.add(); // empty layer to work with
        tlayer.kind = LayerKind.TEXT;

        var textObj = tlayer.textItem;
        textObj.kind = TextType.PARAGRAPHTEXT;
        // textObj.kind = TextType.POINTTEXT;
        textObj.justification = Justification.CENTER;
        // textObj.size = obj.size;
        // textObj.position = [obj.x, obj.y];
        textObj.position = [ 0, 0 ];
        textObj.contents = obj.text;
        textObj.color = Pslib.hexToRGBobj(obj.hex);
        

        if(rectangle)
        {
            var rectCoords = Pslib.getLayerObjectCoordinates(rectangle);
            var textSize = obj.size ? obj.size : Math.min(rectCoords.width, rectCoords.height) / 4;
            // textItem.textRange.characterAttributes.size = textSize / 4;

            // textItem.left = rectangle.left + ((rectangle.width - textItem.width) /2);
            // textItem.top = rectangle.top - ((rectangle.height - textItem.height) /2);

    textObj.width = new UnitValue(rectCoords.width + " pixels");
    textObj.height = new UnitValue(rectCoords.height + " pixels");

            // move text layer
            // textObj.position = [0,20];
            textObj.size = textSize;

            // var tLayerCoords = Pslib.getLayerObjectCoordinates(tlayer);
            // var xt = rectCoords.x - tLayerCoords.x;
            // var yt = rectCoords.y - tLayerCoords.y;
            var xt = rectCoords.x;
            var yt = rectCoords.y;
            tlayer.translate(xt, yt); //  update with Pslib.layerTranslate()
            // center text vertically using baseline shift

            // var tOrigin = textObj.position; // this will fail in some cases
            // var tWidth = textObj.width.as('px');
            var tHeight = textObj.height.as('px');

            // textObj.baselineShift = -((tHeight / 2)-((obj.size/2) -(obj.size*0.15)));
            textObj.baselineShift = ((tHeight / 2)-((textObj.size/2) -(textObj.size*0.15)));
        }
        else
        {
            var tLayerCoords = Pslib.getLayerObjectCoordinates(tlayer);
            var artboardCoords = Pslib.getArtboardCoordinates(container.id);
            var xt = artboardCoords.x;
            var yt = artboardCoords.y;

            // if no rectangle created, assume target is artboard 
            textObj.width = new UnitValue(obj.width + " pixels");
            textObj.height = new UnitValue(obj.height + " pixels");

            tlayer.translate(xt, yt); // update with Pslib.layerTranslate()
        }

        textItem = tlayer;
    }
    else if(Pslib.isIllustrator)
    {
        if(!obj.artboard) obj.artboard = Pslib.getActiveArtboard();

        if(obj.background)
        {
            // deal with label / background item
            if(obj.artboard && !obj.entireDocument)
            {
                rectangle = Pslib.addArtboardRectangle( { hex: obj.backgroundHex, opacity: obj.backgroundOpacity });
            }
            else if(obj.entireDocument)
            {
                rectangle = Pslib.addDocumentRectangle( { hex: obj.backgroundHex, opacity: obj.backgroundOpacity });
            }

            // rectangle creation forces ZOrderMethod.SENDTOBACK, let's fix this here
            try
            {
                rectangle.zOrder(ZOrderMethod.BRINGTOFRONT);
            }
            catch(e)
            {
    
            }

        }

        textItem = doc.textFrames.add();
        textItem.contents = obj.text;
        textItem.opticalAlignment = true;

        // update text color
        if(textItem.textRange.length > 0)
        {
            var paragraphs = textItem.textRange.paragraphs;
            var col = Pslib.hexToRGBobj(obj.hex);
            for(var p = 0; p < paragraphs.length; p++)
            {
                var par = paragraphs[p];
                if(par.characters.length)
                {
                    if(par.fillColor instanceof RGBColor)
                    {
                        par.fillColor = col;
                    }
                }
            }
        }

        if(rectangle)
        {
            // attempt to determine text size based on target rectangle size
            var textSize = obj.size ? obj.size : Math.min(rectangle.width, rectangle.height);
            textItem.textRange.characterAttributes.size = textSize / 4;

            textItem.left = rectangle.left + ((rectangle.width - textItem.width) /2);
            textItem.top = rectangle.top - ((rectangle.height - textItem.height) /2);
            // textItem.top = rectangle.top - ((rectangle.height - textItem.height));

            // if layer / container provided
            // rectangle.move(layer, ElementPlacement.PLACEATBEGINNING);
            // doc.selection = textItem;
            // textItem.move(layer, ElementPlacement.PLACEATBEGINNING);
        }
    }

    return textItem;
}

// get basic metrics for target text item
Pslib.getTextItemInfo = function( item, advanced )
{
	if(!app.documents.length) return;

	var doc = app.activeDocument;
	var textItemInfo = {};

	if(Pslib.isPhotoshop)
	{
		var desc;
		if(!item)
		{
			var ref = new ActionReference();
			ref.putEnumerated( sTID( "layer" ), cTID( "Ordn" ), cTID( "Trgt" ));
			desc = executeActionGet( ref );
		}
		// intercept layer ID!
		else if( typeof item == "number")
		{
			desc = Pslib.getLayerReferenceByID( item );
		}
		else
		{
			desc = item;
		}

		if(!desc) return [];

		var list =  desc.getObjectValue(cTID("Txt "));
		var tsr =  list.getList(cTID("Txtt"));

		var textDesc = desc.getObjectValue(sTID('textKey'));
		var str = textDesc.getString(sTID('textKey'));

		textItemInfo.text = str;
		var ranges = [];

		for(var i = 0; i < tsr.count; i++)
		{
			var tsr0 =  tsr.getObjectValue(i);
			var from = tsr0.getInteger(cTID("From"));
			var to = tsr0.getInteger(cTID("T   "));
			var range = [from,to];
			
			var style = tsr0.getObjectValue(cTID("TxtS"));
			var font = style.getString(cTID("FntN" )); 
			var fontPostscriptName = style.getString(sTID('fontPostScriptName'))

			var size = style.getDouble(cTID("Sz  " ));
			var color = style.getObjectValue(cTID('Clr ')); 

			var textColor = new SolidColor;
				textColor.rgb.red = color.getDouble(cTID('Rd  '));
				textColor.rgb.green = color.getDouble(cTID('Grn '));
				textColor.rgb.blue = color.getDouble(cTID('Bl  '));

			var xScale = 1;
			var yScale = 1;

			// find out if text layer was scaled up or down, if it did adjust returned text size value
			if(textDesc.hasKey(sTID('transform')))
			{
				var tdesc = textDesc.getObjectValue(sTID('transform'));
				var xScale = tdesc.getDouble(sTID('xx'));
				var yScale = tdesc.getDouble(sTID('yy'));
			}

			// get fast overall info
			if(i == 0)
			{
				textItemInfo.font = font;
				textItemInfo.size = size * xScale;
				textItemInfo.color = "#"+textColor.rgb.hexValue;

				// break loop here if the rest is not needed
				if(!advanced) break;

				textItemInfo.fontPostscriptName = fontPostscriptName;
			}

			ranges.push({ range: range, font: font, fontPostscriptName: fontPostscriptName, size: size * xScale, color: "#"+textColor.rgb.hexValue });
		}
		textItemInfo.ranges = ranges;
	}
	else if(Pslib.isIllustrator)
	{
		// if(!doc.selection) return;
		if(!item) item = doc.selection[0];
		if(!item) return textItemInfo;

		if(item.typename == "TextFrame" || item.typename == "TextFrameItem" || item.typename == "LegacyTextItem" )
		{
			textItemInfo.x = item.left;
			textItemInfo.y = item.top;
			textItemInfo.width = item.width;
			textItemInfo.height = item.height;

			// if(item.name) textItemInfo.name = item.name;
			textItemInfo.type = item.typename;
			
			if(item.typename == "TextFrameItem")
			{
				textItemInfo.textType = item.textType.toString(); // TextType.AREATEXT, TextType.POINTTEXT, TextType.PATHTEXT
				textItemInfo.anchor = item.anchor;
				textItemInfo.lines = item.lines.length;
				// store .matrix ?
			}

			if(item.textRange.length > 0)
			{
				textItemInfo.text = item.contents;
				// textItemInfo.font = 
				if(item.textRange.paragraphs.length)
				{
					var par = item.textRange.paragraphs[0];
					if(par.characters.length)
					{
						textItemInfo.font = item.textRange.characterAttributes.textFont.name;
						textItemInfo.fontFamily = item.textRange.characterAttributes.textFont.family;
						textItemInfo.fontStyle = item.textRange.characterAttributes.textFont.style;
						textItemInfo.size = item.textRange.characterAttributes.size;

						var c = par.fillColor;
						if(c)
						{
							textItemInfo.color = "#"+Pslib.RGBtoHex(c.red, c.green, c.blue);
						}
					}
				}
			}
		}
	}
	return textItemInfo;
}

// get RGB value of active object as hex string
// overlaps with Pslib.getArtboardBackgroundColor() and Pslib.getShapeColor()
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
			if(layer.kind == LayerKind.SOLIDFILL)
			{
				var r = new ActionReference();
				r.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
				var d = executeActionGet(r);
		
				var l = d.getList(cTID('Adjs'));
				var cd = l.getObjectValue(0);
				var c = cd.getObjectValue(cTID('Clr '));
		
				var r = Math.round(c.getDouble(cTID('Rd  ')));
				var g = Math.round(c.getDouble(cTID('Grn ')));
				var b = Math.round(c.getDouble(cTID('Bl  ')));
		
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

		var c = item.fillColor;
		var r = c.red;
		var g = c.green;
		var b = c.blue;

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

		if(Pslib.isShape())
		{
			Pslib.setShapeColor(hexStr);

			// update layer's fill value
			if(hexStr == "transparent")
			{
				// it should be noted that fill opacity leaves other layer styles visible
				item.fillOpacity = 0; 
			}
			else 
			{
				// if fillOpacity zero, assume we want it opaque
				if(item.fillOpacity == 0)
				{
					item.fillOpacity = 100;
				}
			}
		}
		// if(layer.typename == "ArtLayer")
		// {
		// 	// if shape layer, proceed
		// 	if(layer.kind == LayerKind.SOLIDFILL)
		// 	{
		// 		// update layer's fill value
		// 		if(hexStr == "transparent")
		// 		{
		// 			// var currentColor = Pslib.getFillColor();
		// 			var currentColor = Pslib.getShapeColor( true );

		// 			item.fillOpacity = 0;
		// 			hexStr = currentColor;
		// 		}
		// 		else 
		// 		{
		// 			// if fully transparent, assume we want it opaque
		// 			if(item.fillOpacity == 0)
		// 			{
		// 				item.fillOpacity = 100;
		// 			}
		// 		}

		// 		// if hexStr is already SolidColor, get hex value 
		// 		if(typeof hexStr == "object")
		// 		{
		// 			hexStr = hexStr.rgb.hexValue;
		// 		}

		// 		var c =  new SolidColor;
		// 		c.rgb.hexValue = hexStr;

		// 		var d = new ActionDescriptor();
		// 		var r = new ActionReference();
		// 		r.putEnumerated( sTID('contentLayer'), cTID('Ordn'), cTID('Trgt') );
		// 		d.putReference( cTID('null'), r );
		// 		var fd = new ActionDescriptor();
		// 		var cd = new ActionDescriptor();
		// 		cd.putDouble( cTID('Rd  '), c.rgb.red );
		// 		cd.putDouble( cTID('Grn '), c.rgb.green );
		// 		cd.putDouble( cTID('Bl  '), c.rgb.blue );
		// 		fd.putObject( cTID('Clr '), cTID('RGBC'), cd );
		// 		d.putObject( cTID('T   '), sTID('solidColorLayer'), fd );
		// 		executeAction( cTID('setd'), d, DialogModes.NO );

		// 		// restore selection
		// 		if(initialSelection) 
		// 		{
		// 			doc.activeLayer = initialSelection;
		// 		}
		// 	}
		// }
		else if(Pslib.isArtboard(layer))
		{
			if(typeof hexStr == "object")
			{
				hexStr = hexStr.rgb.hexValue;
			}
			
			Pslib.updateArtboardBackgroundColor( hexStr );
		}

		// restore selection
		if(initialSelection) 
		{
			doc.activeLayer = initialSelection;
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
		return true;
	}
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

Pslib.colorAllArtboardBackgrounds = function( hexStr, randomize )
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

			if(randomize) 
			{
				// var randomHex = Pslib.randomizeRGBColor( hexStr, randomize);
				// Pslib.randomizeRGBColor = function( hexStr, rangeFloat )
				var randomColorObj = Pslib.randomizeRGBColor( hexStr, randomize);
				
				hexStr = Pslib.colorFillToHex(randomColorObj);
			}

			Pslib.updateFillColor(artboard, hexStr);
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

				Pslib.updateFillColor(placeholder, hexStr);
			}
		}
		if(selection) doc.selection = selection;
	}
	return;
}


// get items with specific name from provided artboards collection
Pslib.getArtboardItems = function( artboardsArr, nameStr, itemCollection )
{
	if(!app.documents.length) return;
	if(!nameStr) { nameStr = "#"; }
	var doc = app.activeDocument;

	var artboardItems = [];

	if(Pslib.isPhotoshop)
	{
		if(!artboardsArr) { artboardsArr = Pslib.getAllArtboards(); }

		for(var i = 0; i < artboardsArr.length; i++)
		{
			var targetItem = Pslib.getArtboardItem( artboardsArr[i], nameStr, itemCollection );
			if(targetItem) artboardItems.push(targetItem);
		}

	}
	else if(Pslib.isIllustrator)
	{
		if(!artboardsArr) { artboardsArr = doc.artboards; }

		for (var i = 0; i < artboardsArr.length; i++)
		{
			var targetItem = Pslib.getArtboardItem( artboardsArr[i], nameStr, itemCollection );
			if(targetItem) artboardItems.push(targetItem);
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

// get simple array with all artboard "IDs"
Pslib.getArtboardsIDs = function()
{
    if(!app.documents.length) return false;
    var doc = app.activeDocument;
	var IDs = [];

    if(Pslib.isPhotoshop)
	{
        IDs = Pslib.getSpecsForAllArtboards(true);
    }
    else if(Pslib.isIllustrator)
	{
		for (var i = 0; i < doc.artboards.length; i++)
		{
			IDs.push(i);
		}
	}
	return IDs; 
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

// if marquee selection active, add as vector mask
Pslib.addVectorMask = function( obj )
{
	if(!app.documents.length) return false;
    var doc = app.activeDocument;

    if(!obj) obj = {};

	if(Pslib.isPhotoshop)
	{
		// if document has active selection, assume we need it converted to 
        var hasSelection = Pslib.documentHasActiveSelection();
		var createdSelection = false;
		var createdMask = false;
		if(!hasSelection || obj.bounds)
		{
			if(hasSelection && obj.bounds)
			{
				doc.selection.deselect();
			}
			// use provided bounds to select
			
			// if no selection active and/or no bounds provided, default to bounds of current layer object
			// this should handle artboards automatically, 
			var c = Pslib.getLayerObjectCoordinates( doc.activeLayer.id );
			obj.bounds = [ [c.x, c.y], [c.x+c.width, c.y], [c.x+c.width, c.y+c.height], [c.x, c.y+c.height] ];
			
			var d = Pslib.getDocumentSpecs();

			// if content of target does not have defined bounds (solidfill without a mask)
			if(c.width == d.width && c.height == d.height)
			{
				// limit geometry to current document bounds
				obj.bounds = [ [0, 0], [d.width, 0], [d.width, d.height], [0, d.height] ];

				// if coordinates are not zero, increase canvas size to match projected selection before selection
				if(c.x || c.y)
				{
					// alert("coords out of canvas bounds!");
					// get delta 
					// var newCW = d.width;
					// var newCH = d.height;

					// resize
					// doc.resizeCanvas(newCW, newCH, AnchorPosition.TOPLEFT);
				}
			}
			
			// possibility of evaluating whether layer object is a group and not an artboard or an art layer


			// compare with document canvas, if bounds are outside of them, this won't work

			doc.selection.select( obj.bounds, SelectionType.REPLACE, 0, false);
			hasSelection = true;
			createdSelection = true;
		}

        if(hasSelection)
        {
            var tempPath = Pslib.createPathFromSelection();

            // target path
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putClass( cTID( "Path" ) );
            desc.putReference( cTID( "null" ), ref );

            var maskRef = new ActionReference();
            maskRef.putEnumerated( cTID( "Path" ), cTID( "Path" ), sTID( "vectorMask" ) );
            desc.putReference( cTID( "At  " ), maskRef );
            
            // add path as vector mask to target container
            var pathRef = new ActionReference();
            pathRef.putEnumerated( cTID( "Path" ), cTID( "Ordn" ), cTID( "Trgt" ) );
            desc.putReference( cTID( "Usng" ), pathRef );
			
			// this typically fails at this point if we don't have a Work Path active
			// or if content of target does not have defined bounds (solidfill without a mask)
			try
			{
				executeAction( cTID( "Mk  " ), desc, DialogModes.NO );
			}
            catch(e)
			{
				if(createdSelection) doc.selection.deselect();
				return;
			}

			createdMask = true;

			if(createdMask)
			{
				// delete temporary work path 
				tempPath.remove();
			}
			// if a selection was created from provided bounds, get rid of it
			if(createdSelection) doc.selection.deselect();

        }
        // decide if new mask is linked or not
    }
}

Pslib.createPathFromSelection = function( obj )
{
    if(!app.documents.length) return false;
    var doc = app.activeDocument;

    if(!obj) obj = {};
    if(obj.tolerance == undefined) obj.tolerance = 2.0;

    var pathItem;

    if(Pslib.isPhotoshop)
	{
        // check for selection
        var hasSelection = Pslib.documentHasActiveSelection();
        if(hasSelection)
        {
            // create path
            var desc = new ActionDescriptor();
            var r = new ActionReference();
            r.putClass( sTID('path') );
            desc.putReference( sTID('null'), r );

            var ref = new ActionReference();
            ref.putProperty( sTID('selectionClass'), sTID('selection') );
            desc.putReference( sTID('from'), ref );
            desc.putUnitDouble( sTID('tolerance'), sTID('pixelsUnit'), obj.tolerance );
        executeAction( sTID('make'), desc, DialogModes.NO );

            if(doc.pathItems.length) pathItem = doc.pathItems[doc.pathItems.length-1];
        }


    }
	return pathItem;
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
		if(hex instanceof Object) return hex;
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

// convert color object to usable hex string 
// compensates for Illustrator's lack of .hexValue property
Pslib.colorFillToHex = function(color)
{
	if(color == undefined) return "000000";
	if(!(color instanceof Object)) return "000000";

	if(Pslib.isIllustrator)
	{
		return Pslib.toHex(color.red) + Pslib.toHex(color.green) + Pslib.toHex(color.blue);
	}
	else if(Pslib.isPhotoshop)
	{
		return color.rgb.hexValue;
	}
}


// "controlled" randomization, float sticks around a specified threshold
Pslib.randomizeFloat = function( num, max, range )
{
	if(range == 0) return num; 
	if(range > 1) range = 1;
	var random = Math.random();
	var flux = range * ( num * random );

	flux = ( random < 0.5 ? (-flux) : flux);
	flux = parseInt( num + flux);
	flux = flux < 0 ? 0 : flux > max ? max : flux;
	// JSUI.quickLog(flux, "randomised: ");
	return flux;
}

//
// misguided attempt at randomizing r, g, b values of color object 
// while remaining within a specific hue range
// achieving this with HSL/HSB would be a lot easier
//
// - a rangeFloat set to true, or 1.0 means FULL randomization across a range of 0-255 for each r, g, b component (no harmony)
// - 0.04 yields difficult to see but actual variations in color
// - a value between 0.75 and 0.9999 should be clearly visible, while retaining harmony with specified value
// - values between 0.0 and 0.0038999 (or false) will not attempt to randomize unless specified (precise:true)
//
// NOTES
// - randomization of "000000" is a waste, so we cheese it by bumping the value to "101010" (unless precise: true)
// - r,g,b components with values neighboring 100% tend to not fluctuate as much as those within the medium range
//
Pslib.randomizeRGBColor = function( hexStr, rangeFloat, precise, grayscale )
{
	if(hexStr == "transparent") return hexStr;
	if(hexStr == undefined) hexStr = "101010";

	// if no randomization info provided, use full spectrum
	if(rangeFloat == undefined) rangeFloat = false;
	if(rangeFloat instanceof Boolean) rangeFloat = (rangeFloat ? 1.0 : 0.0);

	// 1/255 = 0.003921568627
	// anything below 0.004 is likely to be a waste of CPU, at least in depths of 8bits per channel
	// unless specifically asked for precision, return object without randomization
	if(rangeFloat < 0.0039 && !precise) return Pslib.hexToRGBobj(hexStr);

	if(rangeFloat > 1) rangeFloat = 1;

	// sanitization of string values
	if(hexStr == "000000")
	{
		if(!precise) hexStr = "101010";
	}

	// if object, assume existing RGB solid fill object
	if(typeof hexStr == "object")
	{
		var colObj = hexStr;
		if(JSUI.isPhotoshop)
		{	
			hexStr = hexStr.rgb.hexValue;
		}
		else if(JSUI.isIllustrator)
		{
			hexStr = Pslib.toHex(colObj.red)+Pslib.toHex(colObj.green)+Pslib.toHex(colObj.blue);			
		}
		// if pure black, just return as is, because randomization will fail
		if(hexStr == "000000" && !precise) return colObj;
	}

	// control randomization 
	var doRandomize = precise ? true : (rangeFloat > 0.0039 && rangeFloat < 1);

	var r,g,b = precise ? 0 : 16;

	if(Pslib.isPhotoshop)
	{		
		var c = new SolidColor();
		c.rgb.hexValue = hexStr;

		r = c.rgb.red;
		g = c.rgb.green;
		b = c.rgb.blue;
	}
	else if(Pslib.isIllustrator)
	{
		var c = Pslib.hexToRGBobj(hexStr);

		r = c.red;
		g = c.green;
		b = c.blue;
	}

	r = doRandomize ? Pslib.randomizeFloat(r, 255, rangeFloat) : Math.round(Math.random()*255);
	g = doRandomize ? Pslib.randomizeFloat(g, 255, rangeFloat) : Math.round(Math.random()*255);
	b = doRandomize ? Pslib.randomizeFloat(b, 255, rangeFloat) : Math.round(Math.random()*255);

	// optional: convert to grayscale
	if(grayscale)
	{
		// if(hexStr == "transparent") hsbArr = [1, 1, 1]
		var hsbArr = Pslib.RGBtoHSB( [ r, g, b ] );

		var hue = hsbArr[0];
		var sat = hsbArr[1];
		var bri = hsbArr[2];

		sat = 0;
		bri = doRandomize ? Pslib.randomizeFloat( bri, 100, rangeFloat ) : Math.round(Math.random()*100);

		var grayArr = Pslib.HSBtoRGB( [ hue, sat, bri ] );

		r = grayArr[0];
		g = grayArr[1];
		b = grayArr[2];
	}

	if(Pslib.isPhotoshop)
	{
		c.rgb.red = r;
		c.rgb.green = g;		
		c.rgb.blue = b;

		return c;
	}
	else if	(Pslib.isIllustrator)
	{
		c.red = r;
		c.green = g;
		c.blue = b;

		return c;
	}
	else
	{
		return;
	}
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

Pslib.HSBtoHSL = function( hsbArr )
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

// Get Solid Fill Color object 
Pslib.getShapeColor = function( asObj )
{
	if(!app.documents.length) return false;
    var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var layer = doc.activeLayer;
		var layerisFill = layer.typename == "ArtLayer" ? (layer.kind == LayerKind.SOLIDFILL ? true : false) : false;
		if(!layerisFill) return;

		var r = new ActionReference();
		r.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
		var d = executeActionGet(r);

		var l = d.getList(cTID('Adjs'));
		var cd = l.getObjectValue(0);
		var c = cd.getObjectValue(cTID('Clr '));

		var r = c.getDouble(cTID('Rd  '));
		var g = c.getDouble(cTID('Grn '));
		var b = c.getDouble(cTID('Bl  '));

		var hex = Pslib.toHex(r) + Pslib.toHex(g) + Pslib.toHex(b);

		if(asObj)
		{
			var sc = new SolidColor();
			sc.rgb.hexValue = hex;
		}

		// option to replace value with color overlay if present

		return asObj ? sc : hex;
	}
	else if(Pslib.isIllustrator)
	{
		var selection = doc.selection;
		if(selection)
		{
			var item = selection[0];

			var hex = "transparent";
			var transp = new NoColor();

			var fc = item.fillColor;
			if(!fc) return asObj ? transp : hex;

			if(fc == transp) return asObj ? transp : hex;
			
			var r = fc.red;
			var g = fc.green;
			var b = fc.blue;

			var hex = Pslib.toHex(r) + Pslib.toHex(g) + Pslib.toHex(b);
			return asObj ? fc : hex;
		}
	}	
}

// Get Solid Fill Color object 
Pslib.getArtboardBackgroundColor = function( asObj )
{
	if(!app.documents.length) return false;
    var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var layer = doc.activeLayer;
		if(!Pslib.isArtboard(layer))
		{
			if (!Pslib.selectParentArtboard()) return;
		}

		var artboard = doc.activeLayer;
		var id = artboard.id;
		var coords = Pslib.getArtboardCoordinates(id);
		var r = Pslib.getArtboardReferenceByID(id);

		var dt = r.getObjectValue(sTID("artboard"));
		coords.presetName = dt.getString(sTID('artboardPresetName'));
		coords.backgroundType = dt.getString(sTID('artboardBackgroundType'));

		var color = new SolidColor();

		// 3 == transparent, 4 == custom RGB
		if(coords.backgroundType == 1) 
		{
			color.rgb.hexValue = "FFFFFF";
		} 
		if(coords.backgroundType == 2) 
		{
			color.rgb.hexValue = "000000";
		} 
		else if(coords.backgroundType == 3) return "transparent";
		// if(coords.backgroundType != 3)
		else if(coords.backgroundType == 4) 
		{
			var abColor = dt.getObjectValue(sTID('color'));

			var r = abColor.getUnitDoubleValue(sTID("red"));
			var g = abColor.getUnitDoubleValue(sTID("grain"));
			var b = abColor.getUnitDoubleValue(sTID("blue"));

			color.rgb.red = r;
			color.rgb.green = g;
			color.rgb.blue = b;
		}
		return asObj ? color : color.rgb.hexValue;
	}
	else if(Pslib.isIllustrator)
	{
		//
		var item = Pslib.getArtboardItem();

		var hex = "transparent";
		var transp = new NoColor();

		var fc = item.fillColor;
		if(!fc) return asObj ? transp : hex;

		if(fc == transp) return asObj ? transp : hex;
		
		var r = fc.red;
		var g = fc.green;
		var b = fc.blue;

		var hex = Pslib.toHex(r) + Pslib.toHex(g) + Pslib.toHex(b);
		return asObj ? fc : hex;
	}	
}

// bool is shape / solid fill
Pslib.isShape = function( item )
{
	if(!app.documents.length) return false;
    var doc = app.activeDocument;

	if(Pslib.isPhotoshop)
	{
		var layer = item ? item : doc.activeLayer;
		if(!layer) return false;
		var layerIsShape = layer.typename == "ArtLayer" ? (layer.kind == LayerKind.SOLIDFILL ? true : false) : false;
		return layerIsShape;
	}
	else if(Pslib.isIllustrator)
	{
		var selection = item ? [item] : doc.selection;
		if(selection)
		{
			var item = selection[0];
			return (item.typename == "PathItem");
		}
		return false;
	}	
}

// Set Solid Fill Color object 
Pslib.setShapeColor = function( hex )
{
	if(!app.documents.length) return false;
    var doc = app.activeDocument;
	if(!hex) return false;

	if(Pslib.isPhotoshop)
	{
		var layer = doc.activeLayer;
		if(!Pslib.isShape()) return false;

		// assume color object
		if(hex instanceof Object)
		{
			c = hex;
		}
		else 
		{
			c = Pslib.hexToRGBobj(hex);
		}

		var d = new ActionDescriptor();
		var r = new ActionReference();
		r.putEnumerated( sTID('contentLayer'), cTID('Ordn'), cTID('Trgt') );
		d.putReference( cTID('null'), r );
		var fd = new ActionDescriptor();
		var cd = new ActionDescriptor();
		cd.putDouble( cTID('Rd  '), c.rgb.red );
		cd.putDouble( cTID('Grn '), c.rgb.green );
		cd.putDouble( cTID('Bl  '), c.rgb.blue );
		fd.putObject( cTID('Clr '), cTID('RGBC'), cd );
		d.putObject( cTID('T   '), sTID('solidColorLayer'), fd );
		executeAction( cTID('setd'), d, DialogModes.NO );

		return true;
	}
	else if(Pslib.isIllustrator)
	{
		var selection = doc.selection;
		if(selection)
		{
			var item = selection[0];

			if(!Pslib.isShape()) return false;

			var hex = "transparent";
			var transp = new NoColor();

			var fc = item.fillColor;
			if(!fc) return asObj ? transp : hex;

			if(fc == transp) return asObj ? transp : hex;
			
			var r = fc.red;
			var g = fc.green;
			var b = fc.blue;

			var hex = Pslib.toHex(r) + Pslib.toHex(g) + Pslib.toHex(b);
			return asObj ? fc : hex;
		}
	}	
}

// Photoshop: Pslib.setLayerColor(doc.activeLayer.id, "red")
// Illustrator: Pslib.setLayerColor(doc.activeLayer, "FF0000")
Pslib.setLayerColor = function(id, colorStr)
{
	if(Pslib.isPhotoshop)
	{
		if(id == undefined) id = app.activeDocument.activeLayer.id;
		if(!colorStr) colorStr = "None";

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

		var desc = Pslib.getLayerTargetByID(id);

		var a = new ActionDescriptor();
		a.putEnumerated( cTID('Clr '), cTID('Clr '), cTID(colorStr) );
		desc.putObject( cTID('T   '), cTID('Lyr '), a );
		executeAction( cTID('setd'), desc, DialogModes.NO );
	}
	else if(Pslib.isIllustrator)
	{
		if(!colorStr) return;
		var layer = id ? id : app.activeDocument.activeLayer;
		layer.color = Pslib.hexToRGBobj(colorStr);
	}
}
//
//
// a few workarounds to allow Array.sort() to sort objects 
// based on specific property values (must be numeric)
//
// weirdness: if object does not have property, it comes out first in sorted array...?
//
Pslib.compareArtboardID = function( a, b )
{
    if ( a.assetArtboardID < b.assetArtboardID ){ return -1; }
    if ( a.assetArtboardID > b.assetArtboardID ){ return 1; }
    return 0;
}

Pslib.compareAssetID = function( a, b )
{
    if ( a.assetID < b.assetID ){ return -1; }
    if ( a.assetID > b.assetID ){ return 1; }
    return 0;
}

Pslib.compareName = function( a, b )
{
    if ( a.name < b.name ){ return -1; }
    if ( a.name > b.name ){ return 1; }
    return 0;
}

Pslib.compareId = function( a, b )
{
    if ( a.id < b.id ){ return -1; }
    if ( a.id > b.id ){ return 1; }
    return 0;
}

Pslib.compareIndex = function( a, b )
{
    if ( a.index < b.index ){ return -1; }
    if ( a.index > b.index ){ return 1; }
    return 0;
}

Pslib.comparePage = function( a, b )
{
    if ( a.page < b.page ){ return -1; }
    if ( a.page > b.page ){ return 1; }
    return 0;
}
//
//
//


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

	// this does not like zeroes!
	String.prototype.padStart = function(num, pad)
    {
        if(!num) num = 6;
        if(!pad) pad = " ";
		if(pad == "0") return this.zeroPad(num);

        num = Math.min(num, this.length)
        var padStr = "";
        if(this.length < num)
        {
            for(var i = 0; i < num; i++)
            {
                padStr += pad;
            }
        }
        return padStr + this;
    }

	String.prototype.zeroPad = function(num)
    {
		if(!num) num = 3;
		var padStr = "";
		if(this.length < num) { padStr = new Array(num - this.length+1).join("0"); }
		return padStr + this;
    }

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

	Number.prototype.clamp = function(min, max)
	{
		var n = this.valueOf();
		if(min == undefined || max == undefined) return n;
		if(n < min) n = min;
		if(n > max) n = max;
		return n;
	};

	Number.prototype.adjustFloatPrecision = function(tolerance)
	{
		if(tolerance == undefined) tolerance = 0.0001;
		var n = this.valueOf();
		var round = Math.round(n);
		var delta = Math.abs(round-n);
		if(delta <= tolerance) n = round;
		return n;
	};

	Number.prototype.isMultOf = function(m)
	{
		if(m == undefined || isNaN(m))
		{
			return;
		}
		var n = this.valueOf();
		return (Math.ceil(n/m) * m == n);
	};

	Array.prototype.indexOf = function(element, start)
	{
		// for(var i = 0; i < this.length; i++) { if(this[i] === element) return i; }
		if(!this.length) return -1;
		var i = 0;
		var idxL = this.length-1;
		if(start == undefined) var start = i;
		start = start.clamp(-1, idxL);
		if(start == -1) { for(var i = idxL; i > -1; i--) { if(this[i] === element) return i; } }
		else { for(var i = start; i < this.length; i++) { if(this[i] === element) return i; } }
		return -1;
	};

	Array.prototype.lastIndexOf = function(element)
	{
		return this.indexOf(element, -1);
	};
		
	Array.prototype.map = function(callback) {
		var arr = [];
		for (var i = 0; i < this.length; i++)
			arr.push(callback(this[i], i, this));
		return arr;
	};

	Array.prototype.filter = function (fn)
	{
		var filtered = [];
		for (var i = 0; i < this.length; i++)
		{
			if(fn(this[i]))
			{
				filtered.push(this[i]);
			}
		}
		return filtered;
	};

	// removes duplicates in array
	Array.prototype.getUnique = function()
	{
		var unique = [];
		for(var i = 0; i < this.length; i++)
		{
			var current = this[i];
			if(unique.indexOf(current) == -1) unique.push(current)
		}
		return unique;
	};

	// from array of JSON objects, compile list of identical values and return a one of each
	Array.prototype.getUniqueValues = function( pname )
	{
		if(!this.length) return this;
		var value = this[0][pname];
		if(value == undefined) return this;

		var uniqueNames = [ value ];
		var currValue = value;

		for(var i = 0; i < this.length; i++)
		{
			currValue = this[i][pname];
			if(currValue != undefined)
			{
				if(currValue != value)
				{
					uniqueNames.push(currValue);
					value = currValue;
				}
			}
		}
		return uniqueNames;
	}

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

