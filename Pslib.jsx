/*
	Pslib.jsx
	Photoshop JSX Library of frequently-used functions
	Source: https://github.com/geeklystrips/pslib
	
	
	- Per-layer metadata management: access, create, remove... 
	
	TODO
	- working on an advanced version of the layer metadata editor, might end up with separate apps
	- will eventually need a way to copy/move chunks of xmp data from one layer to another layer, and from layer to containing document
	
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
*/

// these functions are often required when working with code obtained using the ScriptingListener plugin
cTID = function(s) {return app.charIDToTypeID(s);}
sTID = function(s) {return app.stringIDToTypeID(s);}

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

	// $.level == 0 if the script is run by Photoshop, == 1 if run by ExtendScript ToolKit
	// if ESTK, then write to console for easier debugging
	if($.level) $.writeln("Pslib object not found. Creating placeholder.");
	
	// errors are objects that can give you some information about what went wrong 
	//$.writeln("typeof e.message: " + typeof e.message + "\n\ne:\n" + e + "\n\ne.message:\n" + e.message);
	$.writeln(e);
	
	// create Pslib as a persistent object 
	// it will remain accessible across most scopes, which is useful when working with panels & actions
	// 
	Pslib = function(){};
}

// library version, used in tool window titles. Maybe.
Pslib.version = 0.44;
Pslib.isPs64bits = BridgeTalk.appVersion.match(/\d\d$/) == '64';

// metadata is only supported by Photoshop CS4+
Pslib.isPsCS4andAbove = parseInt(app.version.match(/^\d.\./)) >= 11;

// here's some more stuff that can be useful
Pslib.isPsCCandAbove = parseInt(app.version.match(/^\d.\./)) >= 14; 
Pslib.isPsCS6 = (app.version.match(/^13\./) != null);
Pslib.isPsCS5 = (app.version.match(/^12\./) != null);
Pslib.isPsCS4 = (app.version.match(/^11\./) != null);
Pslib.isPsCS3 = (app.version.match(/^10\./) != null);

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

// get layer's existing XMP if present
Pslib.getXmp = function (layer, createNew)
{
	var layer = (layer == undefined ? app.activeDocument.activeLayer : layer);
	var createNew = (createNew == undefined ? false : createNew);
	var xmp;
	
	// if library loads without problem, proceed to get the layer's xmpMetadata
	if(Pslib.loadXMPLibrary())
	{
		try
		{
			if($.level) $.writeln("Attempting to get metadata for layer \"" + layer.name + "\"");
			xmp = new XMPMeta( layer.xmpMetadata.rawData );
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata could not be found for layer \"" + layer.name + "\"" + (createNew ? "\nCreating new XMP object." : "") );
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
Pslib.getXmpProperty = function (layer, property)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var value;
		var xmp;
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("Metadata cannot exist on a background layer, so it cannot be accessed.");
			return null;
		}
		
		// access metadata
		try
		{
			xmp = new XMPMeta( layer.xmpMetadata.rawData );
			value = decodeURI(xmp.getProperty(Pslib.XMPNAMESPACE, property));
		
			// unload library
		//	Pslib.unloadXMPLibrary();
			return value;
		
		} catch( e ) {
			if($.level) $.writeln("XMP metadata could not be found for layer \"" + layer.name + "\"");
		//   xmp = new XMPMeta();
			return null
		}
	}
	else
	{
		return null;
	}
};

// delete specific property
Pslib.deleteXmpProperty = function (layer, property)
{
	// load library
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var xmp = Pslib.getXmp(layer);
		
		try
		{
			xmp.deleteProperty(Pslib.XMPNAMESPACE, property);
			layer.xmpMetadata.rawData = xmp.serialize();
			return true;
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata property could not be deleted from layer \"" + layer.name + "\"");
			//xmp = new XMPMeta();
			return false;
		}
	}
	else
	{
		return false;
	}
};

// delete array of properties
Pslib.deleteXmpProperties = function (layer, propertiesArray)
{	
	// load library
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var xmp = Pslib.getXmp(layer);
		
		try
		{
			for(var i = 0; i < propertiesArray.length; i++)
			{
				report += (+ "\t" + propertiesArray[i][1] + "\n");
				xmp.deleteProperty(Pslib.XMPNAMESPACE, propertiesArray[i][0]);
			}

			layer.xmpMetadata.rawData = xmp.serialize();
				
			return true;
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata properties could not be removed from layer \"" + layer.name + "\"");
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
Pslib.setXmpProperties = function (layer, propertiesArray)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var prop;
		var val;
		var xmp;
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("XMP Metadata cannot be placed on a background layer. Aborting.");
			return false;
		}
		
		// access metadata
		try
		{
		   xmp = new XMPMeta( layer.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from layer \"" + layer.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for layer \"" + layer.name + "\".\nCreating new XMP metadata container.");
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
				var propertyExists = xmp.doesPropertyExist(Pslib.XMPNAMESPACE, prop);
				
				
				// add new property if not found
				if(!propertyExists)
				{
					xmp.setProperty(Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tadding [" + prop + ": " + val +"]  " + typeof val);
				}
				// if property found and value different, update
				else if(propertyExists && decodeURI(xmp.getProperty(Pslib.XMPNAMESPACE, prop).toString()) != val.toString() )
				{
					xmp.setProperty(Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tupdating [" + prop + ": " + val +"]  " + typeof val);
				}
				else
				{
					if($.level) $.writeln("\tno change to existing property [" + prop + ": " + val +"]  " + typeof val);
				}
			} 
			catch( e )
			{
				var msg = "Could not place metadata property on provided layer.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			   else alert(msg);
			   return false;
			}
		}

		// applly and serialize
		layer.xmpMetadata.rawData = xmp.serialize();
		if($.level) $.writeln("Provided properties were successfully added to object \"" + layer.name + "\"");
		
		// unload library
	//	Pslib.unloadXMPLibrary();
		
		return true;
	}
	else
	{
		return false;
	}
};

// get multiple properties
// expects a two-dimensional array, returns an updated copy of that array
Pslib.getXmpProperties = function (layer, propertiesArray)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var prop;
		var val;
		var xmp;
		var updatedArray = [];
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("XMP Metadata cannot exist on a background layer. Aborting.");
			return null;
		}
		
		// access metadata
		try
		{
		   xmp = new XMPMeta( layer.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from object \"" + layer.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for object \"" + layer.name + "\".\nCreating new XMP metadata container.");
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
				var propertyExists = xmp.doesPropertyExist(Pslib.XMPNAMESPACE, prop);
				
				// add new property if not found
				if(propertyExists)
				{
					val = decodeURI(xmp.getProperty(Pslib.XMPNAMESPACE, prop));
//~ 					alert(i + " " + val);
					//xmp.setProperty(Pslib.XMPNAMESPACE, prop, val);
					if($.level) $.writeln("\tgetting property: value [" + prop + ": " + val +"]  " + typeof val);
					
					if($.level) $.writeln("\t" + propertiesArray[i][0]+ ": " + val + "\n");
					updatedArray.push([propertiesArray[i][0], val]);
				}
				// if property found and value different, update
//~ 				else if(propertyExists && xmp.getProperty(Pslib.XMPNAMESPACE, prop).toString() != val.toString() )
//~ 				{
//~ 					val = xmp.getProperty(Pslib.XMPNAMESPACE, prop)
//~ 					//xmp.setProperty(Pslib.XMPNAMESPACE, prop, val);
//~ 					if($.level) $.writeln("\tupdating [" + prop + ": " + val +"]  " + typeof val);
//~ 				}
				else
				{
					if($.level) $.writeln("\tProperty not found [" + prop + ": " + val +"]  " + typeof val);
					updatedArray.push([propertiesArray[i][0], null]);
				}
			} 
			catch( e )
			{
				var msg = "Could not fetch metadata property from provided object.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			   else alert(msg);
			   return null;
			}
		}

		// applly and serialize
//~ 		layer.xmpMetadata.rawData = xmp.serialize();
		if($.level) $.writeln("Provided properties were successfully fetched from object \"" + layer.name + "\"");
		
		// unload library
	//	Pslib.unloadXMPLibrary();
//~ 		alert(updatedArray);
		return updatedArray;
	}
	else
	{
		return null;
	}
};

// returns bidimensional array of properties/values present in provided namespace
// useful for debugging and building UI windows
Pslib.getPropertiesArray = function (layer)
{
	// make sure XMP lib stuff is available
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var xmp;
		var propsArray = [];
		var propsReport = "";
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("XMP Metadata cannot exist on a background layer. Aborting.");
			return null;
		}
		
		// access metadata
		try
		{
		   xmp = new XMPMeta( layer.xmpMetadata.rawData );
		   if($.level) $.writeln("XMP Metadata successfully fetched from object \"" + layer.name + "\"");
		} catch( e ) 
		{
			if($.level) $.writeln("XMP metadata could not be found for object \"" + layer.name + "\".\nCreating new XMP metadata container.");
			xmp = new XMPMeta(  );
		}
	
		// XMPConst.ITERATOR_JUST_CHILDREN	XMPConst.ITERATOR_JUST_LEAFNODES	XMPConst.ITERATOR_JUST_LEAFNAMES	XMPConst.ITERATOR_INCLUDE_ALIASES
		var xmpIter = xmp.iterator(XMPConst.ITERATOR_JUST_CHILDREN, Pslib.XMPNAMESPACE, "");
		var next = xmpIter.next();

		if($.level) $.writeln("\nGetting list of XMP properties for XMP namespace " + Pslib.XMPNAMESPACEPREFIX + "\n");
		while (next)
		{
			var propName = next.path.replace( Pslib.XMPNAMESPACEPREFIX, "" ); 
			var propValue = decodeURI(next);
			propsArray.push([propName, propValue]);
			propsReport += (propName + "\t" + propValue + "\n");
			next = xmpIter.next();
		}
	
		if($.level) $.writeln(propsReport);
		if($.level) $.writeln("Properties successfully fetched from object \"" + layer.name + "\"");
		
		return propsArray;
	}
	else
	{
		return null;
	}
};

// clear XMP : current workaround is to replace current data by empty data
// this is problematic if you actually want to strip the layer from its metadata object entirely
// Edit: turns out there is no structural difference between document XMP and layer XMP. 
// Adobe essentially extended the XMP functionality to layers. A document without an XMP container doesn't make sense, therefore...
Pslib.clearXmp = function (layer)
{
	if(Pslib.loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		
		// if metadata not found, return
		try
		{
			var xmp = new XMPMeta(layer.xmpMetadata.rawData);
		}
		catch(e)
		{
			//if($.level) $.writeln(msg + "\n" + e);
			return true;
		}
		
		// if metadata found, replace by empty version
		var emptyXmp = new XMPMeta();
		layer.xmpMetadata.rawData = emptyXmp.serialize();
		
		//	Pslib.unloadXMPLibrary();
			
		return true;
	}
	else
	{
		return false;
	}
};

// clear entire namespace
Pslib.clearNamespace = function (layer, namespace)
{
	var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
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
	var removePropArray = Pslib.getPropertiesArray(layer);
	Pslib.deleteXmpProperties(layer, removePropArray);
};

// save metadata to XML file
Pslib.exportLayerMetadata = function (layer, path, alertMsg)
{
	if(Pslib.loadXMPLibrary())
	{
		var xmp;
		
		// verify that xmp data is available
		   try
		   {
			  var xmp = layer.xmpMetadata.rawData.toString();

			// 
			if(alertMsg) alert(xmp);
			//
		   }
			catch(e)
			{
			   var msg = "";
			   if(e.message.match("missing") != null)
			   {	
				   msg += "There doesn't seem to be any metadata attached to layer \"" + layer.name + "\"";  
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
Pslib.propertiesToCSV = function(layer, namespace, uri)
{	
	var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
	var propertiesArray = Pslib.getPropertiesArray(layer)

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
Pslib.propertiesFromCSV = function(layer, namespace, uri)
{	
	var layer = layer == undefined ? app.activeDocument.activeLayer : layer;

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
		success = Pslib.setXmpProperties(layer, propertiesArray);
	}
	return success;
};

// this returns the full active document path without building a histogram in CS2 (also bypasses the 'document not saved' exception)
Pslib.getDocumentPath = function(doc)
{
	var doc = doc != undefined ? doc : app.activeDocument;
	if(app.activeDocument != doc) app.activeDocument = doc;

	var ref = new ActionReference();
    ref.putProperty(cTID('Prpr'), cTID('FilR'));
    ref.putEnumerated(cTID('Dcmn'), cTID('Ordn'), cTID('Trgt'));
    var desc = executeActionGet(ref);
    return desc.hasKey(cTID('FilR')) ? desc.getPath(cTID('FilR')) : undefined;
};

"\n";
