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


	// function getActiveLayerID()
	// {
	// 	var ref = new ActionReference();
	// 	ref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
	// 	var ldesc = executeActionGet(ref);
	// 	return ldesc.getInteger(cTID('LyrI'));
	// }

	function makeActiveByIndex( idx, visible )
	{   
	var desc = new ActionDescriptor();   
		var ref = new ActionReference();   
		ref.putIndex(cTID( "Lyr " ), idx)   
		desc.putReference( cTID( "null" ), ref );   
		desc.putBoolean( cTID( "MkVs" ), visible );   
	executeAction( cTID( "slct" ), desc, DialogModes.NO ); 
	return app.activeDocument.activeLayer;  
	}
		
	// return intersection between all artboards and selected artboards
	function getSelectedArtboards()
	{
		var indexArr = getSelectedLayersIdx();
		
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
				// if($.level)$.writeln(j + "  "+ i);
				if(i == indexArr[j])
				{
					selectedMatch = true;
					// if($.level)$.writeln("SELECTED ARTBOARD! " + i);
					break;
				}
			}
			if(!selectedMatch)
			{
				continue;
			}

			(r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboardEnabled'));
			r.putIndex(sTID("layer"), i);
			
			// workaround for documents without artboards defined
			try
			{
				var artboardEnabled = executeActionGet(r).getBoolean(p);
			}
			catch(e)
			{
				var artboardEnabled = false;
			}

			if (artboardEnabled) {
				(r = new ActionReference()).putProperty(sTID("property"), p = sTID('artboard'));
				r.putIndex(sTID("layer"), i);

				// get artboard name
				var ref = new ActionReference();
				ref.putIndex( cTID( "Lyr " ), i);
				var layerDesc = executeActionGet(ref);
				var artboardName = layerDesc.getString(sTID ("name"));

				var artboard = executeActionGet(r).getObjectValue(p),
					artboardRect = artboard.getObjectValue(sTID("artboardRect")),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom')),
		
					};
				
					artboards.push({ name: artboardName, index: i, x: bounds.top, y: bounds.left, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
				}
		}

		return artboards;
	}


	function getAllArtboards()
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
	
				var artboard = executeActionGet(r).getObjectValue(p),
					artboardRect = artboard.getObjectValue(sTID("artboardRect")),
					bounds = {
						top: artboardRect.getDouble(sTID('top')),
						left: artboardRect.getDouble(sTID('left')),
						right: artboardRect.getDouble(sTID('right')),
						bottom: artboardRect.getDouble(sTID('bottom')),
		
					};
				artboards.push({ name: artboardName, index: i, x: bounds.top, y: bounds.left, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
			 }
		}
	
		return artboards;
	}

	function getSelectedLayersIdx()
	{   
		var selectedLayers = new Array();
		var ref = new ActionReference();   
		ref.putEnumerated( cTID("Dcmn"), cTID("Ordn"), cTID("Trgt") );   
		var desc = executeActionGet(ref);   
		if( desc.hasKey( sTID( 'targetLayers' ) ) ){   
		   desc = desc.getList( sTID( 'targetLayers' ));   
			var c = desc.count; 
			var selectedLayers = new Array();   
			for(var i=0;i<c;i++){   
			  try{   
				 activeDocument.backgroundLayer;   
				 selectedLayers.push(  desc.getReference( i ).getIndex() );   
			  }catch(e){   
				 selectedLayers.push(  desc.getReference( i ).getIndex()+1 );   
			  }   
			}   
		 }else{   
		   var ref = new ActionReference();   
		   ref.putProperty( cTID("Prpr") , cTID( "ItmI" ));   
		   ref.putEnumerated( cTID("Lyr "), cTID("Ordn"), cTID("Trgt") );   
		   try{   
			  activeDocument.backgroundLayer;   
			  selectedLayers.push( executeActionGet(ref).getInteger(cTID( "ItmI" ))-1);   
		   }catch(e){   
			  selectedLayers.push( executeActionGet(ref).getInteger(cTID( "ItmI" )));   
		   }   
		}   
		return selectedLayers;   
	}

	function isArtboard()
	{
		var ref = new ActionReference();
		ref.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
		return executeActionGet(ref).getBoolean(sTID("artboardEnabled"));
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
Pslib.docKeyValuePairs = [ [ "source", null ], [ "range", null ], [ "destination", null ], [ "specs", null ],  [ "custom", null ]  ];
// Pslib.docKeyValuePairs = [ [ "source", "range", "destination", "specs", "custom" ] ];

// default key-value pairs for individual assets (either XMP or custom tags)
Pslib.assetKeyValuePairs = [ [ "assetID", null ], [ "index", null ]  ];

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
				// Workaround for cases where "000000" should remain as is
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
		var doc = doc != undefined ? doc : app.activeDocument;
		if(app.activeDocument != doc) app.activeDocument = doc;

		var docNameNoExt = doc.name.match(/([^\.]+)/)[1];
		var docFullPath = doc.fullName;
		var matchesSystem = docFullPath.toString().match( app.path) != null;
		var defaultExportDir = docNameNoExt.replace(/[\s:\/\\*\?\"\<\>\|]/g, "_") + "-assets";
		
		// .fullName pointing to app.path means document has not been saved to disk
		// if(matchesSystem)
		// {
		// 	// targetDirectory = new Folder ( defaultDocPath );
		// 	// "~/" + Folder.desktop.name + "/AiXMPData";
		// }
		// else
		// {
		// 	targetDirectory = new Folder (docFullPath.parent + "/" + defaultExportDir);
		// }
		// alert(docFullPath);
		return matchesSystem ? undefined : docFullPath;
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

// must serialize after operations
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

	// hack: get index from first nested item
	// var subIndex = arr[0][0][2];
	// alert(subIndex)

	for(var i = 0; i < arr.length; i++)
	{
		// var defaultValue = arr[i].length > 2 ? arr[i][2] : ""; // 
		
		xmp.appendArrayItem(namespace, propName, ""); // <rdf:value> -- opportunity to include extra info or fallback value here

		// xmp.appendArrayItem(namespace, propName, propName+(subIndex+1)); // <rdf:value> -- opportunity to include extra info or fallback value here
		if($.level) $.writeln( "\n\t<rdf:value/>" );

		for(var j = 0; j < arr[i].length; j++)
		{
			var subArr = arr[i][j];
			var qualifier = subArr[0];
			var value = subArr[1];
			// var index = subArr[2];

			xmp.setQualifier(namespace, propName+'['+(i+1)+']', XMPConst.NS_XMP, qualifier, value);
			// xmp.setQualifier(namespace, propName+'['+(index+1)+']', XMPConst.NS_XMP, qualifier, value);
			if($.level) $.writeln( "\t<xmp:"+qualifier+">"+value+"</xmp:"+qualifier+">" );
		}
	}
	if($.level) $.writeln( "</"+prefix+propName+">" ); 

	// if(Pslib.isPhotoshop) target.xmpMetadata.rawData = xmp.serialize();
	// else if(Pslib.isIllustrator) target.XMPString = xmp.serialize();
}


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
	
		if($.level) $.writeln( "\nGetting all tags on " +  pageItem.typename + " " + pageItem.name);

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

			if(value != undefined || value != null)
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

// artboard functions: moved from JSUI

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
}

// get extended artboard metrics and information
// 
Pslib.getArtboardSpecs = function( artboard )
{
	if(JSUI.isIllustrator)
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

Pslib.zoomOnArtboard = function(artboard, forceValue)
{   
	if(JSUI.isIllustrator)
	{
		var doc = app.activeDocument;

		if(typeof artboard == "number")
		{
			forceValue = artboard;
			artboard = Pslib.getActiveArtboard();
		}

		var artboard = artboard ? artboard : Pslib.getActiveArtboard();
	
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
		var coords = Pslib.getArtboardCoordinates(artboard);
		var viewCoords = Pslib.getViewCoordinates();
	
		var padding = 0.1; // 10% of visible view area
	
		var newBoundary = {};
		var newZoomLvl = 4.0;
	
		newBoundary.width = coords.width + (coords.width * padding);
		newBoundary.height = coords.height + (coords.height * padding);
	
		if ( coords.isPortrait && (coords.isSquare && viewCoords.isPortrait) )
		{
			newZoomLvl = viewCoords.width100 / newBoundary.width;
		} 
		else if (coords.isLandscape)
		{
			newZoomLvl = viewCoords.width100 / newBoundary.width;
		}
		else 
		{
			newZoomLvl = viewCoords.height100 / newBoundary.height;
		}
	
		doc.views[0].zoom = forceValue ? forceValue : newZoomLvl;
		doc.views[0].centerPoint = [coords.centerX, coords.centerY]; 
	}
}

// fix for float coordinates
Pslib.validateArtboardRects = function( artboards, offsetPageItems )
{
	if(JSUI.isIllustrator)
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

		if(!artboards)
		{
			artboards = app.activeDocument.artboards;
		}

		for(var i = 0; i < artboards.length; i++)
		{
			var artboard = artboards[i];

			if(obj.find)
			{
				artboard.name = artboard.name.replace(obj.find, obj.replace);
			}

			if(obj.prefix)
			{
				artboard.name  = obj.prefix + artboard.name;
			}

			if(obj.suffix)
			{
				artboard.name  = artboard.name + obj.suffix;
			}
		}
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

		// zoom on artboard area
		// app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
		// var destCoords =  Pslib.getArtboardCoordinates(destArtboard);
		// newDoc.views[0].zoom = 4.0;
		// newDoc.views[0].centerPoint = [destCoords.centerX, destCoords.centerY]; 
		Pslib.zoomOnArtboard(destArtboard);

		return newDoc;
	}
}

// create new document from current artboard, preserve metrics


// // to be deprecated by Pslib.artboardsToFiles()
// Pslib.artboardToFile = function( obj )
// {
// 	if(Pslib.isIllustrator)
// 	{
// 		if(!obj) { var obj = {}; }
// 		if(!obj.artboard) { obj.artboard = Pslib.getActiveArtboard(); }


// 		// let's consider getting an Folder object instead of a File
// 		if(!obj.saveUri)
// 		{
// 			// get document assets path
// 			// use same pattern as ExportForScreens
// 		}

// 		// prepare object to return forencic data along with
// 		var resultObj = {};
// 		var newDoc;

// 		var sourceDoc = app.activeDocument;
// 		// var originalSelection = sourceDoc.selection;

// 		var sourceDocName = sourceDoc.name.toFileSystemSafeName();
// 		// var sourceExt = sourceDocName.getFileExtension(); // may be useful with custom SVG stuff

// 		var originalArtboard = Pslib.getActiveArtboard();

// 		var artboardName = obj.artboard.name;
// 		// var artboardNameFs = artboardName.toFileSystemSafeName();

// 		var artboardIndex = sourceDoc.artboards.getActiveArtboardIndex();

// 		// save/store JSON data ?
// 		if(obj.jsonData)
// 		{
// 			var artboardJsonData = obj.jsonData;
// 		}
// 		else
// 		{
// 			var artboardJsonData = Pslib.getArtboardCoordinates(originalArtboard);
// 			var docKeyValuePairs = Pslib.getXmpDictionary( sourceDoc, Pslib.docKeyValuePairs ); // get "source" tag from document if present

// 			var tagsObj = Pslib.arrayToObj( Pslib.getAllTags( Pslib.getArtboardItem(originalArtboard, "#") ), {} );
// 			artboardJsonData.tags = tagsObj;
// 			artboardJsonData.index = artboardIndex;

// 			// remove extra info
// 			artboardJsonData.rect = undefined;
// 			artboardJsonData.isSquare = undefined;
// 			artboardJsonData.isPortrait = undefined;
// 			artboardJsonData.isLandscape = undefined;
// 			artboardJsonData.hasIntegerCoords = undefined;

// 			artboardJsonData.parent = sourceDoc.name;
// 			var documentLocalPath = Pslib.getDocumentPath(sourceDoc);
// 			// artboardJsonData.parentFullName = documentLocalPath ? documentLocalPath.fsName : undefined; // absolute path
// 			artboardJsonData.parentFullName = documentLocalPath ? documentLocalPath.toString() : undefined; // relative ~/

// 			// get xmp tags if present (could be made dynamic)
// 			if(docKeyValuePairs.source) artboardJsonData.source = docKeyValuePairs.source;
// 			if(docKeyValuePairs.range) artboardJsonData.range = docKeyValuePairs.range;
// 			if(docKeyValuePairs.destination) artboardJsonData.destination = docKeyValuePairs.destination; // custom export location
// 			if(docKeyValuePairs.specs) artboardJsonData.specs = docKeyValuePairs.specs;
// 			if(docKeyValuePairs.custom) artboardJsonData.custom = docKeyValuePairs.custom;
// 		}

// 		newDoc = Pslib.documentFromArtboard( obj.templateUri );

// 		if(obj.saveUri)
// 		{
// 			// cast as file 
// 			var outputFile = (obj.saveUri instanceof File) ? obj.saveUri : new File(obj.saveUri);

// 			// get extension from uri : 
// 			var extension = outputFile.toString().getFileExtension(); // ".ai" / ".psd"

// 			// save to file system safe etc
// 			// artboardNameFs

// 			if(outputFile.exists)
// 			{
// 				if(obj.confirmReplace) 
// 				{
// 					var confirmMsg = "Replace existing file?\n\n" + outputFile.fsName;
// 					var confirmBool = confirm(confirmMsg);
					
// 					if(confirmBool)
// 					{
// 						outputFile.remove();
// 					}					
// 				}
// 				else
// 				{
// 					outputFile.remove();
// 				}
// 			}

// 			// if ".ai", use saveAs() method
// 			if(extension == ".ai")
// 			{
// 				if(obj.exportOptions)
// 				{
// 					var aiOpts = obj.exportOptions;
// 				}
// 				else
// 				{
// 					var aiOpts = new IllustratorSaveOptions();
// 					aiOpts.pdfCompatible = true;
// 					aiOpts.compressed = true;
// 					aiOpts.embedICCProfile = true;
// 					aiOpts.embedLinkedFiles = true;
// 					aiOpts.saveMultipleArtboards = false;
// 				}

// 				// if(outputFile.exists)
// 				// {
// 				// 	var confirmMsg = "Replace existing file?\n\n" + outputFile.fsName;
// 				// 	if(obj.confirmReplace) 
// 				// 	{
// 				// 		outputFile.remove();
// 				// 		// outputFile = outputFile.saveDlg("Save artboard as Adobe Illustrator file", ("*.ai"));
// 				// 	}
// 				// }


// 				newDoc.saveAs( outputFile, aiOpts);
// 			}
// 			// if ".psd", use exportFile() method
// 			else if(extension == ".psd")
// 			{
// 				if(obj.exportOptions)
// 				{
// 					var psdOpts = obj.exportOptions;
// 				}
// 				else
// 				{
// 					var psdOpts = new ExportOptionsPhotoshop();

// 					// (editable layers)
// 					// var psdOpts = new ExportOptionsPhotoshop();
// 					// psdOpts.antiAliasing = true;
// 					// psdOpts.editableText = true;
// 					// psdOpts.embedICCProfile = true;
// 					// psdOpts.imageColorSpace = ImageColorSpace.RGB;
// 					// psdOpts.maximumEditability = true;
// 					// psdOpts.writeLayers = true;
// 					// psdOpts.resolution = 72;
					
// 					// (merged layers)
// 					psdOpts.antiAliasing = true;
// 					psdOpts.editableText = false;
// 					psdOpts.embedICCProfile = true;
// 					psdOpts.imageColorSpace = ImageColorSpace.RGB;
// 					psdOpts.maximumEditability = false;
// 					psdOpts.writeLayers = false;
// 					psdOpts.resolution = 72;
// 				}
// 				// if(outputFile.exists) outputFile.remove();
// 				newDoc.exportFile( outputFile, ExportType.PHOTOSHOP, psdOpts);
// 			}
// 		}
// 		// // if png, svg or pdf, use ExportForScreens
// 		// else if(extension == ".png")
// 		// {
// 		// 	// obj.exportOptions
// 		// }
// 		// else if(extension == ".svg")
// 		// {
			
// 		// }
// 		// else if(extension == ".pdf")
// 		// {
			
// 		// }

// 		// output json data
// 		if(obj.saveJson)
// 		{
// 			var jsonFile = outputFile.toString().swapFileObjectFileExtension(".json");
// 			if(jsonFile.exists) jsonFile.remove();

// 			var jsonFileCreated = JSUI.writeToFile(jsonFile, JSON.stringify(artboardJsonData, null, "\t"), "utf8");
// 			resultObj.artboardJsonData = artboardJsonData;
// 			if(jsonFileCreated) resultObj.jsonFile = jsonFile;
// 		}

// 		// close new document if saved
// 		if(obj.close && obj.saveUri && extension != ".ai")
// 		{
// 			resultObj.outputFile = outputFile;
// 			newDoc.close(SaveOptions.DONOTSAVECHANGES);
// 		}

// 		return resultObj;
// 	}
// }


// assumes JSUI
/*
var obj = { 
	saveUri: "path/to/file.psd", // save to psd/ai if destination path is provided
	exportOptions: {}, // custom export options if needed
	templateUri: "path/to/template.ait", //
	saveJson: false,
	jsonData: {}, // 
	confirmReplace: false,
	prefix: "",
	suffix: "", 
	close: false
};
 */


// export process based on array of artboard indexes
// you may think of this as a slower version of the Export For Screens command
// with support for .ai + .psd output
// (still uses Document.exportForScreens() method for PNG, SVG, PDF)
// returns array of results objects

// var obj = {
//	pagesArr: [ 1, 2, 3, 4, 5 ] // 1-based (the artboard number on the Artboards palette)
//
//	}
Pslib.artboardsToFiles = function( obj )
{
	if(Pslib.isIllustrator)
	{ 
		if(!obj) { var obj = {}; }

		if(!app.documents.length) return;
		var sourceDoc = app.activeDocument;

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
		
		// show this only after getting range from XMP
		// if( highestNum > sourceDoc.artboards.length )
		// {
		// 	alert("Error! Artboard range outside of document's rage (#" + highestNum + ")");
		// 	return;
		// }

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

		var destinationFolder;

		var docNameNoExt = sourceDoc.name.getFileNameWithoutExtension();
		// var sourceDocName = sourceDoc.name.toFileSystemSafeName();
		

		// var originalSelection = sourceDoc.selection;

		// if no destination folder specified, use Photoshop Generator pattern
		if(!obj.saveUri)
		{
			var sourceDocPath = sourceDoc.path;
			// var sourceDocFullName = sourceDoc.fullName;

			// if Document.fullName is undefined, default export location is going to point to a system directory where we have no business saving files to.
			// Windows shows the folder where the host application lives
			// on macOS getting fullName for "Untitled-1" Illustrator document that has not yet been saved to disk returns "/Untitled-1" 
			var matchesSystem = JSUI.isWindows ? (sourceDoc.fullName.match( app.path) != null) : (sourceDoc.fullName.toString() == ("/" + app.activeDocument.name));

			if(matchesSystem) 
			{
				alert("Error: Document should be saved to disk at least once before exporting assets. Please try again.");
				return;
			}
			destinationFolder = new Folder(sourceDocPath + "/"+ docNameNoExt.toFileSystemSafeName() + "-assets");			
		}
		else
		{
			destinationFolder = new Folder(obj.saveUri);
		}

		// get these before looping
		var docKeyValuePairs = Pslib.getXmpDictionary( sourceDoc, Pslib.docKeyValuePairs ); // get "source" tag from document if present

		// if .range property found in custom XMP namespace, use as is
		if(docKeyValuePairs.range)
		{
			if(typeof docKeyValuePairs.range == "string")
			{
				if(!isNaN(parseInt(docKeyValuePairs.range)))
				{
					obj.pagesArr = docKeyValuePairs.range.toRangesArr();
				}
			}

			highestNum = obj.pagesArr[obj.pagesArr.length-1];
		}

		if( highestNum > sourceDoc.artboards.length )
		{
			var rangeErrorMsg = "Range Error\nParameters are outside of the document's artboard collection (" + sourceDoc.artboards.length + ")\n\nClamp the values?\n\n" + obj.pagesArr.toString();

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

		var destDirCheck = new Folder(destinationFolder);
		var dirParent = destDirCheck.parent;

		// if destination tag found, process info
		// (should be easy to bypass)
		if(docKeyValuePairs.destination)
		{
			// check if destination is relative or absolute
			var relativeDir = JSUI.getRelativeFolderPath( docKeyValuePairs.destination, destinationFolder );
			destinationFolder = relativeDir;

			// alert("destDirCheck: " + destDirCheck + "\nParent exists: " + dirParent +  "\nparent exists: " + dirParent.exists + "\n\n" + relativeDir + "\ndestination exists: " + relativeDir.exists);
		}

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

            var exportOptions = new ExportForScreensItemToExport();
			exportOptions.artboards = obj.pagesArr.toSimplifiedString(); // [1, 2, 3, 4, 5] becomes "1-5"
            exportOptions.document = false; // exports docname.png/.svg

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

		if((extension == ".psd" || extension == ".ai" || extension == ".json") )
		{
			for(var i = 0; i < obj.pagesArr.length; i++)
			{
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
					if(docKeyValuePairs.source) artboardJsonData.source = docKeyValuePairs.source;

					// // default key-value pairs for document (usually XMP)
					// // Pslib.docKeyValuePairs = [ [ "source", null ], [ "range", null ], [ "destination", null ], [ "specs", null ],  [ "custom", null ]  ];
					// // // Pslib.docKeyValuePairs = [ [ "source", "range", "destination", "specs", "custom" ] ];

					// // are there relevant at the child level?
					// if(docKeyValuePairs.range) artboardJsonData.range = docKeyValuePairs.range;
					// if(docKeyValuePairs.destination) artboardJsonData.destination = docKeyValuePairs.destination; // custom export location
					// if(docKeyValuePairs.specs) artboardJsonData.specs = docKeyValuePairs.specs;
					// if(docKeyValuePairs.custom) artboardJsonData.custom = docKeyValuePairs.custom;
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
				if(obj.close && obj.saveUri && (extension == ".ai" || extension == ".psd"))
				{
					newDoc.close(SaveOptions.DONOTSAVECHANGES);
					app.activeDocument = sourceDoc;
				}
				else if ( obj.saveUri && (extension == ".ai" || extension == ".psd") ) 
				{
					// zoom on content
					Pslib.zoomOnArtboard(destArtboard);
					// app.activeDocument.views[0].zoom = 1.0;
				}

				resultObjArr.push(resultObj);
			}
		}

		if((extension == ".png" || extension == ".svg" || extension == ".pdf"))
		{
			resultObj.outputFile = outputFile;

			// restore "Create Sub-folders" setting if needed
			if(smartExportUICreateFoldersPreference_UserValue)
			{
				app.preferences.setIntegerPreference ('plugin/SmartExportUI/CreateFoldersPreference', 1);
			}
		}

		// if global JSON file needed, build here from resulting array


		return resultObjArr;
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
			var dp = DocumentPreset;
			dp.colorMode = DocumentColorSpace.RGB;
			dp.width = 128;
			dp.height = 128;
			dp.previewMode = DocumentPreviewMode.PixelPreview;
			dp.rasterResolution = DocumentRasterResolution.ScreenResolution;
			dp.units = RulerUnits.Pixels;
			dp.transparencyGrid = DocumentTransparencyGrid.TransparencyGridMedium;

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
		// if(JSUI.isIllustrator) obj.artboards = app.activeDocument.artboards;

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


// var rectObj = { artboard: artboard, name: "#", tags: [ ["name", "value"], ["name", "value"] ], sendToBack: true  };
Pslib.addArtboardRectangle = function ( obj )
{
	if(JSUI.isIllustrator)
	{
		if(!obj.artboard) return;

		// switch to artboard coordiates *before* getting metrics
		app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
	
		var doc = app.activeDocument;
		var coords = Pslib.getArtboardCoordinates(obj.artboard);
	
		var rect = doc.pathItems.rectangle( coords.x, -coords.y, coords.x+coords.width, coords.y+coords.height );
		doc.selection = rect;
	
		var transp = new NoColor();
		rect.strokeColor = transp;
		rect.fillColor = new NoColor(); //obj.hex != undefined ? JSUI.hexToRGBobj(obj.hex) : transp;
	 
		rect.name = obj.name ? obj.name : "#";
	
		if(obj.tags)
		{
			Pslib.setTags( rect, obj.tags );
		}
	
		if(obj.sendToBack)
		{
			rect.zOrder(ZOrderMethod.SENDTOBACK);
		}
	
		return rect;
	}
}


// // beware: duplicate math functions from JSUI
// // these are only created if JSUI object does not exist
// if (typeof JSUI !== "object")
// {
// 	Number.prototype.isPowerOf2 = function()
// 	{
// 		var n = this.valueOf();
// 		var abs = Math.abs(n);
	
// 		if(Math.floor(n) !== n) return false;
// 		if(abs !== n) n = abs;
// 		return n && (n & (n - 1)) === 0;
// 	};
	
// 	Number.prototype.getNextPow2 = function()
// 	{
// 		var p = 2;
// 		var n = Math.floor(this.valueOf());
// 		if(n.isPowerOf2()) n++;
	
// 		while(n > p)
// 		{
// 			p = p * 2;
// 		}
// 		return p;
// 	};
	
// 	Number.prototype.getPreviousPow2 = function()
// 	{
// 		var p = 2;
// 		var n = this.valueOf();
// 		if(n.isPowerOf2()) n--;
// 		n = Math.floor(n);
	
// 		while(n >= p)
// 		{
// 			p = p * 2;
// 		}
// 		return p / 2;
// 	};
	
// 	Number.prototype.isMultOf = function(m)
// 	{
// 		if(m == undefined || isNaN(m))
// 		{
// 			return;
// 		}
// 		var n = this.valueOf();
// 		return (Math.ceil(n/m) * m == n);
// 	};
	
// 	Number.prototype.getNextMultOf = function(m)
// 	{
// 		var n = this.valueOf();
// 		if(n.isMultOf(m)) n++;
// 		return (n % m == 0) ? n : ( n + (m - (n % m)) );
// 	};
	
// 	Number.prototype.getPreviousMultOf = function(m)
// 	{
// 		var n = this.valueOf();
// 		if(n.isMultOf(m)) n--;
// 		// return (n % m == 0) ? n : ( n + (m - (n % m)) );
	
// 		if(n % m == 0) return n;
// 		// else if(n < m) return n.getNextMultOf(m);
// 		else if(n < m) return m;
// 		else return n - (n % m);
// 	};
	
// 	Number.prototype.isMult4 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.isMultOf(4);
// 	};
	
// 	Number.prototype.getPreviousMult4 = function()
// 	{
// 		var n = this.valueOf();
// 		n = n.getPreviousMultOf(4)
// 		return n;
// 	};
	
// 	Number.prototype.getNextMult4 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.getNextMultOf(4);
// 	};
	
// 	Number.prototype.isMult8 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.isMultOf(8);
// 	};
	
// 	Number.prototype.getPreviousMult8 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.getPreviousMultOf(8);
// 	};
	
// 	Number.prototype.getNextMult8 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.getNextMultOf(8);
// 	};
	
// 	// multiples of 16
	
// 	Number.prototype.isMult16 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.isMultOf(16);
// 	};
	
// 	Number.prototype.getPreviousMult16 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.getPreviousMultOf(16);
// 	};
	
// 	Number.prototype.getNextMult16 = function()
// 	{
// 		var n = this.valueOf();
// 		return n.getNextMultOf(16);
// 	};	

// 	if($.level)
// 	{
// 		$.writeln("\nJSUI not found: Math function duplicates created.");
// 	}
// }
// else
// {
// 	if($.level)
// 	{
// 		$.writeln("\nJSUI found: Native math functions will be used.");
// 	}

// }

// DEBUG AREA

if($.level)
{
	// let's confirm that the file was properly included
	$.writeln("\nPslib.jsx v" + Pslib.version + " successfully loaded by " + app.name + " " + app.version);
}

"\n";
//EOF

